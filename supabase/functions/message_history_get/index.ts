import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParamAsInt, getPageParams, enforceMethod, pseudonymize, ValidationError } from '../_shared/supabase.ts';
import { verifyAuth, AuthError } from '../_shared/auth.ts';
import { decryptMessage } from '../_shared/encryption.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'GET');
  if (methodErr) return methodErr;

  try {
    const sb = createServiceClient();
    const user = await verifyAuth(req, sb);

    const url = new URL(req.url);
    const messageEventId = getPathParamAsInt(url);

    const { page, page_size, offset } = getPageParams(url);
    const statusFilter = url.searchParams.get('status');

    // Get event details
    const { data: event, error: eventErr } = await sb
      .from('TRN_SurveyMessageEvent')
      .select('*, TRN_Survey(Title)')
      .eq('MessageEventId', messageEventId)
      .single();

    if (eventErr || !event) {
      return errorResponse('NOT_FOUND', `Message event ${messageEventId} not found`, 404);
    }

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', event.PostingId).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to view this message event', 403);
    }

    // Get recipients (paged)
    let recipQuery = sb
      .from('TRN_SurveyMessageRecipient')
      .select('*', { count: 'exact' })
      .eq('MessageEventId', messageEventId)
      .order('CreatedOn', { ascending: false })
      .range(offset, offset + page_size - 1);

    if (statusFilter) {
      const validStatuses = ['SENT', 'FAILED', 'SKIPPED_NOT_ENROLLED', 'SKIPPED_ALREADY_SENT', 'SKIPPED_DUE_TO_MODE'];
      const normalized = statusFilter.toUpperCase();
      if (!validStatuses.includes(normalized)) {
        return errorResponse('VALIDATION_ERROR', `status must be one of: ${validStatuses.join(', ')}`, 400);
      }
      recipQuery = recipQuery.eq('OutcomeStatus', normalized);
    }

    const { data: recipients, count, error: recipErr } = await recipQuery;
    if (recipErr) {
      console.error('message_history_get recipients query failed:', recipErr);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve message recipients', 500);
    }

    // Pseudonymized participant IDs using postingId
    const recipientItems = await Promise.all((recipients ?? []).map(async (r: any) => ({
      message_recipient_id: r.MessageRecipientId,
      participant_id: await pseudonymize(event.PostingId, r.UserId),
      outcome_status: r.OutcomeStatus,
      skip_reason: r.SkipReason,
      failure_code: r.FailureCode,
      posting_id: r.PostingId,
      channel: r.Channel,
      attempted_on: r.AttemptedOn,
      completed_on: r.CompletedOn,
    })));

    // Decrypt message if present
    let messageText: string | undefined;
    if (event.IncludeMessage && event.MessageCiphertext && event.MessageNonce) {
      try {
        messageText = await decryptMessage(event.MessageCiphertext, event.MessageNonce, event.MessageKeyVersion ?? 1);
      } catch (decErr: any) {
        console.error('message_history_get decryption failed:', decErr);
        messageText = '[Unable to decrypt message]';
      }
    }

    const eventData = {
      message_event_id: event.MessageEventId,
      posting_id: event.PostingId,
      survey_id: event.SurveyId,
      event_source: event.EventSource,
      dispatch_mode: event.DispatchMode,
      include_survey_link: event.IncludeSurveyLink,
      include_message: event.IncludeMessage,
      is_dry_run: event.IsDryRun,
      created_by: event.CreatedBy,
      total_sent: event.TotalSent,
      total_failed: event.TotalFailed,
      total_skipped: event.TotalSkipped,
      total_recipients: event.TotalRecipients,
      channel: event.Channel,
      created_on: event.CreatedOn,
      survey_title: event.TRN_Survey?.Title ?? null,
    };

    return jsonResponse({
      ok: true,
      event: eventData,
      message_text: messageText,
      recipients: {
        page,
        page_size,
        total: count ?? 0,
        items: recipientItems,
      },
    });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return errorResponse('INVALID_PARAM', err.message, 400);
    }
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('message_history_get error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
