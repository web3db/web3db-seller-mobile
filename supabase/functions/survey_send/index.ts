import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParam, enforceMethod } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'POST');
  if (methodErr) return methodErr;

  try {
    const user = await verifyAuth(req);
    if (!user.internalUserId) {
      return errorResponse('FORBIDDEN', 'Internal user ID is required for mutations', 403);
    }

    const url = new URL(req.url);
    const surveyId = Number(getPathParam(url));
    if (!surveyId || isNaN(surveyId)) {
      return errorResponse('INVALID_PARAM', 'surveyId is required in path');
    }

    const body = await req.json().catch(() => ({}));
    const {
      include_message = false,
      message_text = null,
      force_resend = false,
      dry_run = false,
      limit,
    } = body;

    const sb = createServiceClient();

    // Get survey details
    const { data: survey, error: surveyErr } = await sb
      .from('TRN_Survey')
      .select('*')
      .eq('SurveyId', surveyId)
      .single();

    if (surveyErr || !survey) {
      return errorResponse('NOT_FOUND', `Survey ${surveyId} not found`, 404);
    }

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', survey.PostingId).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to send surveys for this posting', 403);
    }

    // Get enrolled participants from TRN_ShareSession
    let participantQuery = sb
      .from('TRN_ShareSession')
      .select('UserId')
      .eq('PostingId', survey.PostingId)
      .eq('IsActive', true);

    if (limit) participantQuery = participantQuery.limit(limit);

    const { data: sessions, error: sessErr } = await participantQuery;
    if (sessErr) {
      console.error('survey_send sessions query failed:', sessErr);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve participants', 500);
    }

    const userIds = (sessions ?? []).map((s: any) => s.UserId);

    // Guard against empty participants list
    if (userIds.length === 0) {
      return jsonResponse({
        ok: true,
        message: 'No enrolled participants found',
        pairs_sent: 0,
        pairs_failed: 0,
        pairs_skipped: 0,
        errors: [],
      });
    }

    // Rate limit: cap batch size
    const MAX_BATCH_SIZE = 10000;
    if (userIds.length > MAX_BATCH_SIZE) {
      return errorResponse('VALIDATION_ERROR', `Batch size exceeds maximum of ${MAX_BATCH_SIZE}`, 400);
    }

    let pairsSent = 0;
    let pairsFailed = 0;
    let pairsSkipped = 0;
    let messageEventId: number | null = null;
    let messageRecipientsCreated = 0;
    const errors: { code: string; message: string; details: any }[] = [];

    // Create message event if include_message
    if (include_message && !dry_run) {
      const { data: evt, error: evtErr } = await sb
        .from('TRN_SurveyMessageEvent')
        .insert({
          PostingId: survey.PostingId,
          SurveyId: surveyId,
          EventSource: 'SEND_TO_ALL',
          IncludeLink: true,
          IncludeMessage: include_message,
          MessageText: message_text,
          DryRun: false,
          InitiatedBy: user.internalUserId,
        })
        .select('SurveyMessageEventId')
        .single();

      if (!evtErr && evt) messageEventId = evt.SurveyMessageEventId;
    }

    if (!dry_run) {
      // Batch: fetch all existing recipients for this survey + these users in one query
      const { data: existingRecipients } = await sb
        .from('TRN_SurveyRecipient')
        .select('SurveyRecipientId, SurveyId, UserId, SentOn')
        .eq('SurveyId', surveyId)
        .in('UserId', userIds);

      const existingMap = new Map<number, any>();
      for (const r of existingRecipients ?? []) {
        existingMap.set(r.UserId, r);
      }

      // Collect batch inserts
      const newRecipients: any[] = [];
      const resendRecipientIds: number[] = [];
      const processedUserIds: number[] = [];

      for (const userId of userIds) {
        const existing = existingMap.get(userId);

        if (existing) {
          if (!force_resend) {
            pairsSkipped++;
            continue;
          }
          // Mark for resend update
          resendRecipientIds.push(existing.SurveyRecipientId);
          pairsSent++;
        } else {
          // Collect for batch insert using upsert to avoid TOCTOU race
          const token = crypto.randomUUID();
          newRecipients.push({
            SurveyId: surveyId,
            UserId: userId,
            RecipientToken: token,
            SentOn: new Date().toISOString(),
          });
          pairsSent++;
        }

        processedUserIds.push(userId);
      }

      // Batch upsert new recipients (onConflict eliminates TOCTOU race)
      if (newRecipients.length > 0) {
        const { error: upsertErr } = await sb
          .from('TRN_SurveyRecipient')
          .upsert(newRecipients, { onConflict: 'SurveyId,UserId', ignoreDuplicates: true });

        if (upsertErr) {
          console.error('survey_send batch upsert failed:', upsertErr);
          pairsFailed += newRecipients.length;
          pairsSent -= newRecipients.length;
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
          pairsFailed += resendRecipientIds.length;
          pairsSent -= resendRecipientIds.length;
          errors.push({ code: 'BATCH_RESEND_FAILED', message: 'Failed to update resend timestamps', details: null });
        }
      }

      // Query back recipient IDs for message recipient rows (Fix 3: SurveyRecipientId required)
      if (messageEventId && processedUserIds.length > 0) {
        const { data: recipientRows } = await sb
          .from('TRN_SurveyRecipient')
          .select('SurveyRecipientId, UserId')
          .eq('SurveyId', surveyId)
          .in('UserId', processedUserIds);

        const recipientIdMap = new Map((recipientRows ?? []).map((r: any) => [r.UserId, r.SurveyRecipientId]));

        const messageRecipientRows = processedUserIds
          .filter((uid: number) => recipientIdMap.has(uid))
          .map((uid: number) => ({
            SurveyMessageEventId: messageEventId,
            UserId: uid,
            SurveyId: surveyId,
            SurveyRecipientId: recipientIdMap.get(uid)!,
            OutcomeStatus: 'SENT',
            AttemptedOn: new Date().toISOString(),
            CompletedOn: new Date().toISOString(),
          }));

        // Batch insert message recipients
        if (messageRecipientRows.length > 0) {
          const { error: msgErr } = await sb
            .from('TRN_SurveyMessageRecipient')
            .insert(messageRecipientRows);

          if (msgErr) {
            console.error('survey_send message recipients insert failed:', msgErr);
            errors.push({ code: 'MSG_RECIPIENTS_FAILED', message: 'Failed to create message recipients', details: null });
          } else {
            messageRecipientsCreated = messageRecipientRows.length;
          }
        }
      }
    } else {
      // Dry run: all pairs count as sent
      pairsSent = userIds.length;
    }

    // Update message event counts
    if (messageEventId && !dry_run) {
      await sb.from('TRN_SurveyMessageEvent').update({
        PairsSent: pairsSent,
        PairsFailed: pairsFailed,
        PairsSkipped: pairsSkipped,
      }).eq('SurveyMessageEventId', messageEventId);
    }

    return jsonResponse({
      ok: true,
      survey_id: surveyId,
      message_event_id: messageEventId,
      pairs_sent: pairsSent,
      pairs_failed: pairsFailed,
      pairs_skipped: pairsSkipped,
      message_recipients_created: messageRecipientsCreated,
      errors,
    });
  } catch (err: any) {
    if (err.message?.includes('authorization') || err.message?.includes('token') || err.message?.includes('Auth not configured')) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_send error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
