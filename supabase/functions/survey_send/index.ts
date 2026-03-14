import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParamAsInt, enforceMethod, getFunctionsBaseUrl, ValidationError } from '../_shared/supabase.ts';
import { verifyAuth, AuthError } from '../_shared/auth.ts';
import { encryptMessage } from '../_shared/encryption.ts';
import { sendEmail, loadTemplateOrThrow, renderTemplate } from '../_shared/email.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'POST');
  if (methodErr) return methodErr;

  try {
    const sb = createServiceClient();
    const user = await verifyAuth(req, sb);
    if (!user.internalUserId) {
      return errorResponse('FORBIDDEN', 'Internal user ID is required for mutations', 403);
    }

    const url = new URL(req.url);
    const surveyId = getPathParamAsInt(url);

    const body = await req.json().catch(() => ({}));
    const {
      include_message = false,
      message_text = null,
      force_resend = false,
      is_dry_run = false,
      limit,
    } = body;

    // Support old field name for backward compat
    const isDryRun = is_dry_run || body.dry_run || false;

    // Validate message_text length
    if (message_text && typeof message_text === 'string' && message_text.length > 10000) {
      return errorResponse('VALIDATION_ERROR', 'message_text must be 10000 characters or fewer', 400);
    }

    // Validate limit parameter
    if (limit !== undefined) {
      if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
        return errorResponse('VALIDATION_ERROR', 'limit must be a positive integer', 400);
      }
    }

    // Get survey details
    const { data: survey, error: surveyErr } = await sb
      .from('TRN_Survey')
      .select('*')
      .eq('SurveyId', surveyId)
      .single();

    if (surveyErr || !survey) {
      return errorResponse('NOT_FOUND', `Survey ${surveyId} not found`, 404);
    }

    if (!survey.IsActive) {
      return errorResponse('SURVEY_INACTIVE', 'Cannot send for an inactive survey', 400);
    }

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', survey.PostingId).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to send surveys for this posting', 403);
    }

    // Get enrolled participants from TRN_ShareSession
    const { data: sessions, error: sessErr } = await sb
      .from('TRN_ShareSession')
      .select('UserId')
      .eq('PostingId', survey.PostingId)
      .eq('IsActive', true);

    if (sessErr) {
      console.error('survey_send sessions query failed:', sessErr);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve participants', 500);
    }

    // Deduplicate first, THEN apply limit so limit reflects unique user count
    let uniqueUserIds = [...new Set((sessions ?? []).map((s: any) => s.UserId as number))];
    if (limit && limit < uniqueUserIds.length) {
      uniqueUserIds = uniqueUserIds.slice(0, limit);
    }
    const enrolledUserIds = new Set(uniqueUserIds);

    // Guard against empty participants list
    if (enrolledUserIds.size === 0) {
      return jsonResponse({
        ok: true,
        survey_id: surveyId,
        message: 'No enrolled participants found',
        total_sent: 0,
        total_failed: 0,
        total_skipped: 0,
        message_event_id: null,
        errors: [],
      });
    }

    // Rate limit: cap batch size
    const MAX_BATCH_SIZE = 10000;
    if (enrolledUserIds.size > MAX_BATCH_SIZE) {
      return errorResponse('VALIDATION_ERROR', `Batch size exceeds maximum of ${MAX_BATCH_SIZE}`, 400);
    }

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let messageEventId: number | null = null;
    const errors: { code: string; message: string; details: any }[] = [];

    // Encrypt message if present — encryption failure is a hard error to prevent plaintext storage
    let messageCiphertext: string | null = null;
    let messageNonce: string | null = null;
    let messageKeyVersion: number = 1;
    if (include_message && message_text) {
      try {
        const encrypted = await encryptMessage(message_text);
        messageCiphertext = encrypted.ciphertext;
        messageNonce = encrypted.nonce;
        messageKeyVersion = encrypted.keyVersion;
      } catch (encErr: any) {
        console.error('survey_send encryption failed:', encErr);
        return errorResponse('ENCRYPTION_FAILED', 'Message encryption failed. Ensure MESSAGE_ENCRYPTION_KEY is configured.', 500);
      }
    }

    // Create message event
    if (!isDryRun) {
      const { data: evt, error: evtErr } = await sb
        .from('TRN_SurveyMessageEvent')
        .insert({
          PostingId: survey.PostingId,
          SurveyId: surveyId,
          EventSource: 'SURVEY_SEND',
          IncludeSurveyLink: true,
          IncludeMessage: include_message,
          MessageCiphertext: messageCiphertext,
          MessageNonce: messageNonce,
          MessageKeyVersion: messageKeyVersion,
          IsDryRun: false,
          CreatedBy: user.internalUserId,
          TotalRecipients: enrolledUserIds.size,
          Channel: 'EMAIL',
        })
        .select('MessageEventId')
        .single();

      if (!evtErr && evt) messageEventId = evt.MessageEventId;
    }

    if (!isDryRun) {
      // Batch: fetch all existing recipients for this survey + these users
      const userIdArray = [...enrolledUserIds];
      const { data: existingRecipients } = await sb
        .from('TRN_SurveyRecipient')
        .select('SurveyRecipientId, SurveyId, UserId, SentOn')
        .eq('SurveyId', surveyId)
        .in('UserId', userIdArray);

      const existingMap = new Map<number, any>();
      for (const r of existingRecipients ?? []) {
        existingMap.set(r.UserId, r);
      }

      // Fetch user emails for email pipeline
      const { data: userRows } = await sb
        .from('MST_User')
        .select('UserId, Email')
        .in('UserId', userIdArray);
      const userEmailMap = new Map<number, string>();
      for (const u of userRows ?? []) {
        if (u.Email) userEmailMap.set(u.UserId, u.Email);
      }

      // Load email template (throws on DB error to prevent silent skip)
      const template = await loadTemplateOrThrow(sb, 'SURVEY_INVITE');

      // Collect batch inserts
      const newRecipients: any[] = [];
      const resendRecipientIds: number[] = [];
      const sentUserIds: number[] = [];
      const skippedRows: any[] = [];

      for (const userId of userIdArray) {
        const existing = existingMap.get(userId);

        if (existing) {
          if (!force_resend) {
            // SKIPPED_ALREADY_SENT audit row
            totalSkipped++;
            skippedRows.push({
              MessageEventId: messageEventId,
              UserId: userId,
              SurveyId: surveyId,
              SurveyRecipientId: existing.SurveyRecipientId,
              PostingId: survey.PostingId,
              OutcomeStatus: 'SKIPPED_ALREADY_SENT',
              SkipReason: 'ALREADY_SENT',
              Channel: 'EMAIL',
              AttemptedOn: new Date().toISOString(),
            });
            continue;
          }
          // Mark for resend update
          resendRecipientIds.push(existing.SurveyRecipientId);
          totalSent++;
          sentUserIds.push(userId);
        } else {
          // Collect for batch insert
          const token = crypto.randomUUID();
          newRecipients.push({
            SurveyId: surveyId,
            UserId: userId,
            RecipientToken: token,
            SentOn: new Date().toISOString(),
          });
          totalSent++;
          sentUserIds.push(userId);
        }
      }

      // Derive base URL for survey redirect links (includes /functions/v1 prefix)
      const reqUrl = new URL(req.url);
      const baseRedirectUrl = `${getFunctionsBaseUrl(reqUrl)}/survey_redirect`;

      // Batch upsert new recipients
      if (newRecipients.length > 0) {
        const { error: upsertErr } = await sb
          .from('TRN_SurveyRecipient')
          .upsert(newRecipients, { onConflict: 'SurveyId,UserId', ignoreDuplicates: true });

        if (upsertErr) {
          console.error('survey_send batch upsert failed:', upsertErr);
          totalFailed += newRecipients.length;
          totalSent = Math.max(0, totalSent - newRecipients.length);
          errors.push({ code: 'BATCH_INSERT_FAILED', message: 'Failed to create recipients', details: null });
        }
      }

      // Batch update resend timestamps
      if (resendRecipientIds.length > 0) {
        const { error: updateErr } = await sb
          .from('TRN_SurveyRecipient')
          .update({ SentOn: new Date().toISOString() })
          .in('SurveyRecipientId', resendRecipientIds);

        if (updateErr) {
          console.error('survey_send batch resend update failed:', updateErr);
          totalFailed += resendRecipientIds.length;
          totalSent = Math.max(0, totalSent - resendRecipientIds.length);
          errors.push({ code: 'BATCH_RESEND_FAILED', message: 'Failed to update resend timestamps', details: null });
        }
      }

      // Create message recipient rows for SENT users
      if (messageEventId && sentUserIds.length > 0) {
        const { data: recipientRows } = await sb
          .from('TRN_SurveyRecipient')
          .select('SurveyRecipientId, UserId')
          .eq('SurveyId', surveyId)
          .in('UserId', sentUserIds);

        const recipientIdMap = new Map((recipientRows ?? []).map((r: any) => [r.UserId, r.SurveyRecipientId]));

        const messageRecipientRows = sentUserIds
          .filter((uid: number) => recipientIdMap.has(uid))
          .map((uid: number) => ({
            MessageEventId: messageEventId,
            UserId: uid,
            SurveyId: surveyId,
            SurveyRecipientId: recipientIdMap.get(uid)!,
            PostingId: survey.PostingId,
            OutcomeStatus: 'SENT',
            Channel: 'EMAIL',
            AttemptedOn: new Date().toISOString(),
            CompletedOn: new Date().toISOString(),
          }));

        if (messageRecipientRows.length > 0) {
          const { error: msgErr } = await sb
            .from('TRN_SurveyMessageRecipient')
            .insert(messageRecipientRows);

          if (msgErr) {
            console.error('survey_send message recipients insert failed:', msgErr);
            errors.push({ code: 'MSG_RECIPIENTS_FAILED', message: 'Failed to create message recipients', details: null });
          } else {
            // Send emails via stub pipeline — fetch recipient tokens for real redirect URLs
            if (template) {
              const { data: recipientTokenRows } = await sb
                .from('TRN_SurveyRecipient')
                .select('UserId, RecipientToken')
                .eq('SurveyId', surveyId)
                .in('UserId', sentUserIds);
              const tokenMap = new Map<number, string>();
              for (const t of recipientTokenRows ?? []) {
                if (t.RecipientToken) tokenMap.set(t.UserId, t.RecipientToken);
              }

              for (const row of messageRecipientRows) {
                const email = userEmailMap.get(row.UserId);
                if (!email) continue;
                const token = tokenMap.get(row.UserId);
                const surveyLink = token ? `${baseRedirectUrl}/${token}` : '';
                const rendered = renderTemplate(template, {
                  survey_title: survey.Title,
                  study_title: '',
                  survey_link: surveyLink,
                  include_link: 'true',
                  include_message: String(include_message),
                  message_text: message_text || '',
                });
                const result = await sendEmail(sb, {
                  messageEventId: messageEventId!,
                  messageRecipientId: row.SurveyRecipientId,
                  recipientEmail: email,
                  templateKey: 'SURVEY_INVITE',
                  subject: rendered.subject,
                  bodyHtml: rendered.body_html,
                });
                if (result.emailDeliveryLogId) {
                  await sb.from('TRN_SurveyMessageRecipient')
                    .update({ EmailDeliveryLogId: result.emailDeliveryLogId })
                    .eq('MessageEventId', messageEventId)
                    .eq('UserId', row.UserId)
                    .eq('SurveyId', surveyId);
                }
              }
            }
          }
        }
      }

      // Insert SKIPPED audit rows
      if (messageEventId && skippedRows.length > 0) {
        const { error: skipErr } = await sb
          .from('TRN_SurveyMessageRecipient')
          .insert(skippedRows);

        if (skipErr) {
          console.error('survey_send skipped rows insert failed:', skipErr);
          errors.push({ code: 'SKIPPED_ROWS_FAILED', message: 'Failed to create skipped audit rows', details: null });
        }
      }
    } else {
      // Dry run: all pairs count as sent
      totalSent = enrolledUserIds.size;
    }

    // Update message event counts
    if (messageEventId && !isDryRun) {
      await sb.from('TRN_SurveyMessageEvent').update({
        TotalSent: totalSent,
        TotalFailed: totalFailed,
        TotalSkipped: totalSkipped,
      }).eq('MessageEventId', messageEventId);
    }

    return jsonResponse({
      ok: true,
      survey_id: surveyId,
      message_event_id: messageEventId,
      total_sent: totalSent,
      total_failed: totalFailed,
      total_skipped: totalSkipped,
      errors,
    });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return errorResponse('INVALID_PARAM', err.message, 400);
    }
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_send error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
