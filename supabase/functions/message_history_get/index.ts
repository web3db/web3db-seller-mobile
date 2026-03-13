import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParam, getPageParams, enforceMethod, pseudonymize } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'GET');
  if (methodErr) return methodErr;

  try {
    const user = await verifyAuth(req);

    const url = new URL(req.url);
    const messageEventId = Number(getPathParam(url));
    if (!messageEventId || isNaN(messageEventId)) {
      return errorResponse('INVALID_PARAM', 'messageEventId is required in path');
    }

    const { page, page_size, offset } = getPageParams(url);
    const statusFilter = url.searchParams.get('status');

    const sb = createServiceClient();

    // Get event details
    const { data: event, error: eventErr } = await sb
      .from('TRN_SurveyMessageEvent')
      .select('*, TRN_Survey(Title)')
      .eq('SurveyMessageEventId', messageEventId)
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
      .eq('SurveyMessageEventId', messageEventId)
      .order('CreatedOn', { ascending: false })
      .range(offset, offset + page_size - 1);

    if (statusFilter) {
      recipQuery = recipQuery.eq('OutcomeStatus', statusFilter.toUpperCase());
    }

    const { data: recipients, count, error: recipErr } = await recipQuery;
    if (recipErr) {
      console.error('message_history_get recipients query failed:', recipErr);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve message recipients', 500);
    }

    // HMAC-pseudonymized participant IDs
    const recipientItems = await Promise.all((recipients ?? []).map(async (r: any) => ({
      survey_message_recipient_id: r.SurveyMessageRecipientId,
      participant_id: await pseudonymize(r.UserId),
      outcome_status: r.OutcomeStatus,
      skip_reason: r.SkipReason,
      failure_code: r.FailureCode,
      attempted_on: r.AttemptedOn,
      completed_on: r.CompletedOn,
    })));

    const eventData = {
      survey_message_event_id: event.SurveyMessageEventId,
      posting_id: event.PostingId,
      survey_id: event.SurveyId,
      event_source: event.EventSource,
      dispatch_mode: event.DispatchMode,
      include_link: event.IncludeLink,
      include_message: event.IncludeMessage,
      dry_run: event.DryRun,
      initiated_by: event.InitiatedBy,
      pairs_sent: event.PairsSent,
      pairs_failed: event.PairsFailed,
      pairs_skipped: event.PairsSkipped,
      created_on: event.CreatedOn,
      survey_title: event.TRN_Survey?.Title ?? null,
    };

    return jsonResponse({
      ok: true,
      event: eventData,
      message_text: event.IncludeMessage ? event.MessageText : undefined,
      recipients: {
        page,
        page_size,
        total: count ?? 0,
        items: recipientItems,
      },
    });
  } catch (err: any) {
    if (err.message?.includes('authorization') || err.message?.includes('token') || err.message?.includes('Auth not configured')) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('message_history_get error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
