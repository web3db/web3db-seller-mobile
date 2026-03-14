import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, enforceMethod, getFunctionsBaseUrl } from '../_shared/supabase.ts';
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

    const body = await req.json();
    const {
      posting_id,
      survey_ids,
      user_ids,
      mode = 'SEND_MISSING',
      include_survey_link = true,
      include_message = false,
      message_text = null,
      is_dry_run = false,
    } = body;

    // Support old field names for backward compat
    const includeSurveyLink = include_survey_link ?? body.include_link ?? true;
    const isDryRun = is_dry_run || body.dry_run || false;

    if (!posting_id) return errorResponse('MISSING_FIELD', 'posting_id is required');
    if (typeof posting_id !== 'number' || isNaN(posting_id)) {
      return errorResponse('VALIDATION_ERROR', 'posting_id must be a number', 400);
    }
    if (!Array.isArray(survey_ids) || survey_ids.length === 0) {
      return errorResponse('MISSING_FIELD', 'survey_ids must be a non-empty array');
    }
    if (!survey_ids.every((id: any) => typeof id === 'number' && !isNaN(id))) {
      return errorResponse('VALIDATION_ERROR', 'survey_ids must contain only numbers', 400);
    }
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return errorResponse('MISSING_FIELD', 'user_ids must be a non-empty array');
    }
    if (!user_ids.every((id: any) => typeof id === 'number' && !isNaN(id))) {
      return errorResponse('VALIDATION_ERROR', 'user_ids must contain only numbers', 400);
    }

    // Deduplicate inputs
    const uniqueUserIds = [...new Set(user_ids as number[])];
    const uniqueSurveyIds = [...new Set(survey_ids as number[])];

    // Rate limit: cap batch sizes
    const MAX_BATCH_SIZE = 10000;
    const MAX_SURVEY_IDS = 100;
    if (uniqueUserIds.length > MAX_BATCH_SIZE) {
      return errorResponse('VALIDATION_ERROR', `user_ids exceeds maximum of ${MAX_BATCH_SIZE}`, 400);
    }
    if (uniqueSurveyIds.length > MAX_SURVEY_IDS) {
      return errorResponse('VALIDATION_ERROR', `survey_ids exceeds maximum of ${MAX_SURVEY_IDS}`, 400);
    }

    // Validate message_text length
    if (message_text && typeof message_text === 'string' && message_text.length > 10000) {
      return errorResponse('VALIDATION_ERROR', 'message_text must be 10000 characters or fewer', 400);
    }

    const validModes = ['SEND_MISSING', 'RESEND_EXISTING', 'SEND_AND_RESEND'];
    if (!validModes.includes(mode)) {
      return errorResponse('INVALID_MODE', `mode must be one of: ${validModes.join(', ')}`);
    }

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', posting_id).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to dispatch surveys for this posting', 403);
    }

    // Validate survey_ids belong to the posting and are active
    const { data: validSurveys } = await sb
      .from('TRN_Survey')
      .select('SurveyId, Title, IsActive')
      .eq('PostingId', posting_id)
      .in('SurveyId', uniqueSurveyIds);
    const validIds = new Set((validSurveys ?? []).map((s: any) => s.SurveyId));
    const invalidIds = uniqueSurveyIds.filter((id: number) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return errorResponse('VALIDATION_ERROR', 'Some survey_ids do not belong to this posting', 400);
    }
    const inactiveIds = (validSurveys ?? []).filter((s: any) => !s.IsActive).map((s: any) => s.SurveyId);
    if (inactiveIds.length > 0) {
      return errorResponse('SURVEY_INACTIVE', `Survey IDs [${inactiveIds.join(', ')}] are inactive`, 400);
    }

    // Verify enrolled users
    const { data: sessions } = await sb
      .from('TRN_ShareSession')
      .select('UserId')
      .eq('PostingId', posting_id)
      .eq('IsActive', true)
      .in('UserId', uniqueUserIds);

    const enrolledUserIds = new Set((sessions ?? []).map((s: any) => s.UserId));

    const results = {
      surveys_requested: uniqueSurveyIds.length,
      users_requested: uniqueUserIds.length,
      pairs_requested: uniqueSurveyIds.length * uniqueUserIds.length,
      users_enrolled: enrolledUserIds.size,
      pairs_enrolled: 0,
      pairs_skipped_not_enrolled: 0,
      recipients_created: 0,
      recipients_existing: 0,
      emails_attempted: 0,
      emails_succeeded: 0,
      emails_failed: 0,
      message_event_id: null as number | null,
      message_recipients_created: 0,
    };

    const errors: { code: string; message: string; details: any }[] = [];

    // Count skipped (not enrolled) pairs upfront
    const notEnrolledCount = uniqueUserIds.filter((uid: number) => !enrolledUserIds.has(uid)).length;
    results.pairs_skipped_not_enrolled = notEnrolledCount * uniqueSurveyIds.length;

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
        console.error('survey_dispatch encryption failed:', encErr);
        return errorResponse('ENCRYPTION_FAILED', 'Message encryption failed. Ensure MESSAGE_ENCRYPTION_KEY is configured.', 500);
      }
    }

    // Create message event
    if (!isDryRun) {
      const { data: evt } = await sb
        .from('TRN_SurveyMessageEvent')
        .insert({
          PostingId: posting_id,
          SurveyId: uniqueSurveyIds.length === 1 ? uniqueSurveyIds[0] : null,
          EventSource: 'DISPATCH_CENTER',
          DispatchMode: mode,
          IncludeSurveyLink: includeSurveyLink,
          IncludeMessage: include_message,
          MessageCiphertext: messageCiphertext,
          MessageNonce: messageNonce,
          MessageKeyVersion: messageKeyVersion,
          IsDryRun: isDryRun,
          CreatedBy: user.internalUserId,
          TotalRecipients: uniqueUserIds.length,
          Channel: 'EMAIL',
        })
        .select('MessageEventId')
        .single();

      if (evt) results.message_event_id = evt.MessageEventId;
    }

    // Build enrolled user x survey pairs
    const enrolledUsers = uniqueUserIds.filter((uid: number) => enrolledUserIds.has(uid));

    // Early return if no users are enrolled — still record skip audit rows
    if (enrolledUsers.length === 0) {
      if (results.message_event_id && notEnrolledCount > 0) {
        const skipRows: any[] = [];
        for (const userId of uniqueUserIds) {
          for (const surveyId of uniqueSurveyIds) {
            skipRows.push({
              MessageEventId: results.message_event_id,
              UserId: userId,
              SurveyId: surveyId,
              PostingId: posting_id,
              OutcomeStatus: 'SKIPPED_NOT_ENROLLED',
              SkipReason: 'NOT_ENROLLED',
              Channel: 'EMAIL',
              AttemptedOn: new Date().toISOString(),
            });
          }
        }
        if (skipRows.length > 0) {
          await sb.from('TRN_SurveyMessageRecipient').insert(skipRows);
        }
        await sb.from('TRN_SurveyMessageEvent').update({
          TotalSent: 0,
          TotalFailed: 0,
          TotalSkipped: results.pairs_skipped_not_enrolled,
        }).eq('MessageEventId', results.message_event_id);
      }
      return jsonResponse({ ok: true, posting_id, mode, is_dry_run: isDryRun, results, errors });
    }

    // Create SKIPPED_NOT_ENROLLED audit rows for non-enrolled users
    if (results.message_event_id && notEnrolledCount > 0) {
      const notEnrolledUsers = uniqueUserIds.filter((uid: number) => !enrolledUserIds.has(uid));
      const skipRows: any[] = [];
      for (const userId of notEnrolledUsers) {
        for (const surveyId of uniqueSurveyIds) {
          skipRows.push({
            MessageEventId: results.message_event_id,
            UserId: userId,
            SurveyId: surveyId,
            PostingId: posting_id,
            OutcomeStatus: 'SKIPPED_NOT_ENROLLED',
            SkipReason: 'NOT_ENROLLED',
            Channel: 'EMAIL',
            AttemptedOn: new Date().toISOString(),
          });
        }
      }
      if (skipRows.length > 0) {
        const { error: skipErr } = await sb.from('TRN_SurveyMessageRecipient').insert(skipRows);
        if (skipErr) {
          console.error('survey_dispatch skipped_not_enrolled insert failed:', skipErr);
          errors.push({ code: 'SKIP_ROWS_FAILED', message: 'Failed to create skipped audit rows', details: null });
        }
      }
    }

    let modeSkipRows: any[] = [];

    if (isDryRun) {
      // Dry run: count all enrolled pairs as succeeded
      results.pairs_enrolled = enrolledUsers.length * uniqueSurveyIds.length;
      results.emails_attempted = results.pairs_enrolled;
      results.emails_succeeded = results.pairs_enrolled;
    } else {
      // Batch: fetch all existing recipients for these surveys + enrolled users
      const { data: existingRecipients } = await sb
        .from('TRN_SurveyRecipient')
        .select('SurveyRecipientId, SurveyId, UserId, SentOn')
        .in('SurveyId', uniqueSurveyIds)
        .in('UserId', enrolledUsers);

      const existingMap = new Map<string, any>();
      for (const r of existingRecipients ?? []) {
        existingMap.set(`${r.SurveyId}:${r.UserId}`, r);
      }

      // Fetch user emails
      const { data: userRows } = await sb
        .from('MST_User')
        .select('UserId, Email')
        .in('UserId', enrolledUsers);
      const userEmailMap = new Map<number, string>();
      for (const u of userRows ?? []) {
        if (u.Email) userEmailMap.set(u.UserId, u.Email);
      }

      // Load email template (throws on DB error to prevent silent skip)
      const template = await loadTemplateOrThrow(sb, 'SURVEY_INVITE');

      // Collect batched operations
      const newRecipients: any[] = [];
      const resendRecipientIds: number[] = [];
      const processedPairs: { surveyId: number; userId: number }[] = [];

      for (const userId of enrolledUsers) {
        for (const surveyId of uniqueSurveyIds) {
          results.pairs_enrolled++;
          const key = `${surveyId}:${userId}`;
          const existing = existingMap.get(key);

          if (existing) {
            results.recipients_existing++;
            if (mode === 'SEND_MISSING') {
              // SKIPPED_DUE_TO_MODE: already exists, mode is send missing
              modeSkipRows.push({
                MessageEventId: results.message_event_id,
                UserId: userId,
                SurveyId: surveyId,
                SurveyRecipientId: existing.SurveyRecipientId,
                PostingId: posting_id,
                OutcomeStatus: 'SKIPPED_DUE_TO_MODE',
                SkipReason: 'MODE_SEND_MISSING_ALREADY_EXISTS',
                Channel: 'EMAIL',
                AttemptedOn: new Date().toISOString(),
              });
              continue;
            }
            // Mark for resend
            resendRecipientIds.push(existing.SurveyRecipientId);
          } else {
            if (mode === 'RESEND_EXISTING') {
              // SKIPPED_DUE_TO_MODE: doesn't exist, mode is resend existing
              modeSkipRows.push({
                MessageEventId: results.message_event_id,
                UserId: userId,
                SurveyId: surveyId,
                PostingId: posting_id,
                OutcomeStatus: 'SKIPPED_DUE_TO_MODE',
                SkipReason: 'MODE_RESEND_EXISTING_MISSING',
                Channel: 'EMAIL',
                AttemptedOn: new Date().toISOString(),
              });
              continue;
            }
            // Collect for batch upsert
            const token = crypto.randomUUID();
            newRecipients.push({
              SurveyId: surveyId,
              UserId: userId,
              RecipientToken: token,
              SentOn: new Date().toISOString(),
            });
          }

          results.emails_attempted++;
          results.emails_succeeded++;

          processedPairs.push({ surveyId, userId });
        }
      }

      // Batch upsert new recipients
      if (newRecipients.length > 0) {
        const { error: upsertErr } = await sb
          .from('TRN_SurveyRecipient')
          .upsert(newRecipients, { onConflict: 'SurveyId,UserId', ignoreDuplicates: true });

        if (upsertErr) {
          console.error('survey_dispatch batch upsert failed:', upsertErr);
          results.emails_failed += newRecipients.length;
          results.emails_succeeded = Math.max(0, results.emails_succeeded - newRecipients.length);
          errors.push({ code: 'BATCH_INSERT_FAILED', message: 'Failed to create recipients', details: null });
        } else {
          results.recipients_created = newRecipients.length;
        }
      }

      // Batch update resend timestamps
      if (resendRecipientIds.length > 0) {
        const { error: updateErr } = await sb
          .from('TRN_SurveyRecipient')
          .update({ SentOn: new Date().toISOString() })
          .in('SurveyRecipientId', resendRecipientIds);

        if (updateErr) {
          console.error('survey_dispatch batch resend update failed:', updateErr);
          results.emails_failed += resendRecipientIds.length;
          results.emails_succeeded = Math.max(0, results.emails_succeeded - resendRecipientIds.length);
          errors.push({ code: 'BATCH_RESEND_FAILED', message: 'Failed to update resend timestamps', details: null });
        }
      }

      // Insert SENT message recipient rows
      if (results.message_event_id && processedPairs.length > 0) {
        const processedUserIds = [...new Set(processedPairs.map(p => p.userId))];
        const { data: recipientRows } = await sb
          .from('TRN_SurveyRecipient')
          .select('SurveyRecipientId, SurveyId, UserId')
          .in('SurveyId', uniqueSurveyIds)
          .in('UserId', processedUserIds);

        const recipientIdMap = new Map((recipientRows ?? []).map((r: any) => [`${r.SurveyId}:${r.UserId}`, r.SurveyRecipientId]));

        const messageRecipientRows = processedPairs
          .filter(({ surveyId, userId }) => recipientIdMap.has(`${surveyId}:${userId}`))
          .map(({ surveyId, userId }) => ({
            MessageEventId: results.message_event_id,
            UserId: userId,
            SurveyId: surveyId,
            SurveyRecipientId: recipientIdMap.get(`${surveyId}:${userId}`)!,
            PostingId: posting_id,
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
            console.error('survey_dispatch message recipients insert failed:', msgErr);
            errors.push({ code: 'MSG_RECIPIENTS_FAILED', message: 'Failed to create message recipients', details: null });
          } else {
            results.message_recipients_created = messageRecipientRows.length;

            // Derive base URL for survey redirect links (includes /functions/v1 prefix)
            const reqUrl = new URL(req.url);
            const baseRedirectUrl = `${getFunctionsBaseUrl(reqUrl)}/survey_redirect`;

            // Fetch recipient tokens for real redirect URLs
            const allProcessedUserIds = [...new Set(messageRecipientRows.map((r: any) => r.UserId))];
            const { data: recipientTokenRows } = await sb
              .from('TRN_SurveyRecipient')
              .select('SurveyId, UserId, RecipientToken')
              .in('SurveyId', uniqueSurveyIds)
              .in('UserId', allProcessedUserIds);
            const tokenMap = new Map<string, string>();
            for (const t of recipientTokenRows ?? []) {
              if (t.RecipientToken) tokenMap.set(`${t.SurveyId}:${t.UserId}`, t.RecipientToken);
            }

            // Send emails via stub pipeline
            if (template) {
              for (const row of messageRecipientRows) {
                const email = userEmailMap.get(row.UserId);
                if (!email) continue;
                const surveyTitle = (validSurveys ?? []).find((s: any) => s.SurveyId === row.SurveyId)?.Title ?? '';
                const token = tokenMap.get(`${row.SurveyId}:${row.UserId}`);
                const surveyLink = token ? `${baseRedirectUrl}/${token}` : '';
                const rendered = renderTemplate(template, {
                  survey_title: surveyTitle,
                  study_title: '',
                  survey_link: surveyLink,
                  include_link: String(includeSurveyLink),
                  include_message: String(include_message),
                  message_text: message_text || '',
                });
                const result = await sendEmail(sb, {
                  messageEventId: results.message_event_id!,
                  messageRecipientId: row.SurveyRecipientId,
                  recipientEmail: email,
                  templateKey: 'SURVEY_INVITE',
                  subject: rendered.subject,
                  bodyHtml: rendered.body_html,
                });
                if (result.emailDeliveryLogId) {
                  await sb.from('TRN_SurveyMessageRecipient')
                    .update({ EmailDeliveryLogId: result.emailDeliveryLogId })
                    .eq('MessageEventId', results.message_event_id)
                    .eq('UserId', row.UserId)
                    .eq('SurveyId', row.SurveyId);
                }
              }
            }
          }
        }
      }

      // Insert SKIPPED_DUE_TO_MODE audit rows
      if (results.message_event_id && modeSkipRows.length > 0) {
        const { error: skipErr } = await sb.from('TRN_SurveyMessageRecipient').insert(modeSkipRows);
        if (skipErr) {
          console.error('survey_dispatch mode skip rows insert failed:', skipErr);
          errors.push({ code: 'MODE_SKIP_ROWS_FAILED', message: 'Failed to create mode skip audit rows', details: null });
        }
      }
    }

    // Update event counts
    if (results.message_event_id) {
      await sb.from('TRN_SurveyMessageEvent').update({
        TotalSent: results.emails_succeeded,
        TotalFailed: results.emails_failed,
        TotalSkipped: results.pairs_skipped_not_enrolled + (modeSkipRows?.length ?? 0),
      }).eq('MessageEventId', results.message_event_id);
    }

    return jsonResponse({
      ok: true,
      posting_id,
      mode,
      is_dry_run: isDryRun,
      results,
      errors,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_dispatch error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
