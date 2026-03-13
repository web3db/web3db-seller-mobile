import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParam, getPageParams, enforceMethod } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'GET');
  if (methodErr) return methodErr;

  try {
    const user = await verifyAuth(req);

    const url = new URL(req.url);
    const postingId = Number(getPathParam(url));
    if (!postingId || isNaN(postingId)) {
      return errorResponse('INVALID_PARAM', 'postingId is required in path');
    }

    const { page, page_size, offset } = getPageParams(url);
    const surveyIdFilter = url.searchParams.get('survey_id');
    const eventSourceFilter = url.searchParams.get('event_source');

    const sb = createServiceClient();

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', postingId).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to view this posting', 403);
    }

    let query = sb
      .from('TRN_SurveyMessageEvent')
      .select('*, TRN_Survey(Title)', { count: 'exact' })
      .eq('PostingId', postingId)
      .order('CreatedOn', { ascending: false })
      .range(offset, offset + page_size - 1);

    if (surveyIdFilter) query = query.eq('SurveyId', Number(surveyIdFilter));
    if (eventSourceFilter) query = query.eq('EventSource', eventSourceFilter);

    const { data: events, count, error } = await query;
    if (error) {
      console.error('message_history_by_posting query failed:', error);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve message history', 500);
    }

    const items = (events ?? []).map((e: any) => ({
      survey_message_event_id: e.SurveyMessageEventId,
      posting_id: e.PostingId,
      survey_id: e.SurveyId,
      event_source: e.EventSource,
      dispatch_mode: e.DispatchMode,
      include_link: e.IncludeLink,
      include_message: e.IncludeMessage,
      dry_run: e.DryRun,
      initiated_by: e.InitiatedBy,
      pairs_sent: e.PairsSent,
      pairs_failed: e.PairsFailed,
      pairs_skipped: e.PairsSkipped,
      created_on: e.CreatedOn,
      survey_title: e.TRN_Survey?.Title ?? null,
    }));

    return jsonResponse({
      ok: true,
      posting_id: postingId,
      page,
      page_size,
      total: count ?? 0,
      events: items,
    });
  } catch (err: any) {
    if (err.message?.includes('authorization') || err.message?.includes('token') || err.message?.includes('Auth not configured')) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('message_history_by_posting error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
