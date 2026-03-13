import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, enforceMethod } from '../_shared/supabase.ts';
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

    const body = await req.json();
    const {
      posting_id,
      survey_ids,
      user_ids,
      mode = 'SEND_MISSING',
      include_link = true,
      include_message = false,
      message_text = null,
      dry_run = false,
    } = body;

    if (!posting_id) return errorResponse('MISSING_FIELD', 'posting_id is required');
    if (!Array.isArray(survey_ids) || survey_ids.length === 0) {
      return errorResponse('MISSING_FIELD', 'survey_ids must be a non-empty array');
    }
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return errorResponse('MISSING_FIELD', 'user_ids must be a non-empty array');
    }
    if (!user_ids.every((id: any) => typeof id === 'number' && !isNaN(id))) {
      return errorResponse('VALIDATION_ERROR', 'user_ids must contain only numbers', 400);
    }

    // Rate limit: cap batch size
    const MAX_BATCH_SIZE = 10000;
    if (user_ids.length > MAX_BATCH_SIZE) {
      return errorResponse('VALIDATION_ERROR', `Batch size exceeds maximum of ${MAX_BATCH_SIZE}`, 400);
    }

    const validModes = ['SEND_MISSING', 'RESEND_EXISTING', 'SEND_AND_RESEND'];
    if (!validModes.includes(mode)) {
      return errorResponse('INVALID_MODE', `mode must be one of: ${validModes.join(', ')}`);
    }

    const sb = createServiceClient();

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', posting_id).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to dispatch surveys for this posting', 403);
    }

    // Validate survey_ids belong to the posting
    const { data: validSurveys } = await sb
      .from('TRN_Survey')
      .select('SurveyId')
      .eq('PostingId', posting_id)
      .in('SurveyId', survey_ids);
    const validIds = new Set((validSurveys ?? []).map((s: any) => s.SurveyId));
    const invalidIds = survey_ids.filter((id: number) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return errorResponse('VALIDATION_ERROR', 'Some survey_ids do not belong to this posting', 400);
    }

    // Verify enrolled users
    const { data: sessions } = await sb
      .from('TRN_ShareSession')
      .select('UserId')
      .eq('PostingId', posting_id)
      .eq('IsActive', true)
      .in('UserId', user_ids);

    const enrolledUserIds = new Set((sessions ?? []).map((s: any) => s.UserId));

    const results = {
      surveys_requested: survey_ids.length,
      users_requested: user_ids.length,
      pairs_requested: survey_ids.length * user_ids.length,
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
    const notEnrolledCount = user_ids.filter((uid: number) => !enrolledUserIds.has(uid)).length;
    results.pairs_skipped_not_enrolled = notEnrolledCount * survey_ids.length;

    // Create message event if include_message
    if (include_message && !dry_run) {
      const { data: evt } = await sb
        .from('TRN_SurveyMessageEvent')
        .insert({
          PostingId: posting_id,
          SurveyId: survey_ids.length === 1 ? survey_ids[0] : null,
          EventSource: 'DISPATCH',
          DispatchMode: mode,
          IncludeLink: include_link,
          IncludeMessage: include_message,
          MessageText: message_text,
          DryRun: dry_run,
          InitiatedBy: user.internalUserId,
        })
        .select('SurveyMessageEventId')
        .single();

      if (evt) results.message_event_id = evt.SurveyMessageEventId;
    }

    // Build enrolled user x survey pairs
    const enrolledUsers = user_ids.filter((uid: number) => enrolledUserIds.has(uid));

    if (dry_run) {
      // Dry run: count all enrolled pairs as succeeded
      results.pairs_enrolled = enrolledUsers.length * survey_ids.length;
      results.emails_attempted = results.pairs_enrolled;
      results.emails_succeeded = results.pairs_enrolled;
    } else {
      // Batch: fetch all existing recipients for these surveys + enrolled users
      const { data: existingRecipients } = await sb
        .from('TRN_SurveyRecipient')
        .select('SurveyRecipientId, SurveyId, UserId, SentOn')
        .in('SurveyId', survey_ids)
        .in('UserId', enrolledUsers);

      const existingMap = new Map<string, any>();
      for (const r of existingRecipients ?? []) {
        existingMap.set(`${r.SurveyId}:${r.UserId}`, r);
      }

      // Collect batched operations
      const newRecipients: any[] = [];
      const resendRecipientIds: number[] = [];
      const processedPairs: { surveyId: number; userId: number }[] = [];

      for (const userId of enrolledUsers) {
        for (const surveyId of survey_ids) {
          results.pairs_enrolled++;
          const key = `${surveyId}:${userId}`;
          const existing = existingMap.get(key);

          if (existing) {
            results.recipients_existing++;
            if (mode === 'SEND_MISSING') continue;
            // Mark for resend
            resendRecipientIds.push(existing.SurveyRecipientId);
          } else {
            if (mode === 'RESEND_EXISTING') continue;
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

      // Batch upsert new recipients (onConflict eliminates TOCTOU race)
      if (newRecipients.length > 0) {
        const { error: upsertErr } = await sb
          .from('TRN_SurveyRecipient')
          .upsert(newRecipients, { onConflict: 'SurveyId,UserId', ignoreDuplicates: true });

        if (upsertErr) {
          console.error('survey_dispatch batch upsert failed:', upsertErr);
          results.emails_failed += newRecipients.length;
          results.emails_succeeded -= newRecipients.length;
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
          results.emails_succeeded -= resendRecipientIds.length;
          errors.push({ code: 'BATCH_RESEND_FAILED', message: 'Failed to update resend timestamps', details: null });
        }
      }

      // Query back recipient IDs and batch insert message recipients (Fix 4: SurveyRecipientId required)
      if (results.message_event_id && processedPairs.length > 0) {
        const processedUserIds = [...new Set(processedPairs.map(p => p.userId))];
        const { data: recipientRows } = await sb
          .from('TRN_SurveyRecipient')
          .select('SurveyRecipientId, SurveyId, UserId')
          .in('SurveyId', survey_ids)
          .in('UserId', processedUserIds);

        const recipientIdMap = new Map((recipientRows ?? []).map((r: any) => [`${r.SurveyId}:${r.UserId}`, r.SurveyRecipientId]));

        const messageRecipientRows = processedPairs
          .filter(({ surveyId, userId }) => recipientIdMap.has(`${surveyId}:${userId}`))
          .map(({ surveyId, userId }) => ({
            SurveyMessageEventId: results.message_event_id,
            UserId: userId,
            SurveyId: surveyId,
            SurveyRecipientId: recipientIdMap.get(`${surveyId}:${userId}`)!,
            OutcomeStatus: 'SENT',
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
          }
        }
      }
    }

    // Update event counts
    if (results.message_event_id) {
      await sb.from('TRN_SurveyMessageEvent').update({
        PairsSent: results.emails_succeeded,
        PairsFailed: results.emails_failed,
        PairsSkipped: results.pairs_skipped_not_enrolled,
      }).eq('SurveyMessageEventId', results.message_event_id);
    }

    return jsonResponse({
      ok: true,
      posting_id,
      mode,
      dry_run,
      results,
      errors,
    });
  } catch (err: any) {
    if (err.message?.includes('authorization') || err.message?.includes('token') || err.message?.includes('Auth not configured')) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_dispatch error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
