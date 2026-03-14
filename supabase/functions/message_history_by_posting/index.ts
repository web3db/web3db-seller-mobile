import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParamAsInt, getPageParams, enforceMethod, ValidationError } from '../_shared/supabase.ts';
import { verifyAuth, AuthError } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'GET');
  if (methodErr) return methodErr;

  try {
    const sb = createServiceClient();
    const user = await verifyAuth(req, sb);

    const url = new URL(req.url);
    const postingId = getPathParamAsInt(url);

    const { page, page_size, offset } = getPageParams(url);
    const surveyIdFilter = url.searchParams.get('survey_id');
    const eventSourceFilter = url.searchParams.get('event_source');

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

    if (surveyIdFilter) {
      const surveyIdNum = Number(surveyIdFilter);
      if (!Number.isInteger(surveyIdNum) || surveyIdNum <= 0) {
        return errorResponse('VALIDATION_ERROR', 'survey_id must be a positive integer', 400);
      }
      query = query.eq('SurveyId', surveyIdNum);
    }
    if (eventSourceFilter) {
      const validSources = ['SURVEY_SEND', 'DISPATCH_CENTER', 'CUSTOM_MESSAGE'];
      if (!validSources.includes(eventSourceFilter)) {
        return errorResponse('VALIDATION_ERROR', `event_source must be one of: ${validSources.join(', ')}`, 400);
      }
      query = query.eq('EventSource', eventSourceFilter);
    }

    const { data: events, count, error } = await query;
    if (error) {
      console.error('message_history_by_posting query failed:', error);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve message history', 500);
    }

    const items = (events ?? []).map((e: any) => ({
      message_event_id: e.MessageEventId,
      posting_id: e.PostingId,
      survey_id: e.SurveyId,
      event_source: e.EventSource,
      dispatch_mode: e.DispatchMode,
      include_survey_link: e.IncludeSurveyLink,
      include_message: e.IncludeMessage,
      is_dry_run: e.IsDryRun,
      created_by: e.CreatedBy,
      total_sent: e.TotalSent,
      total_failed: e.TotalFailed,
      total_skipped: e.TotalSkipped,
      total_recipients: e.TotalRecipients,
      channel: e.Channel,
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
    if (err instanceof ValidationError) {
      return errorResponse('INVALID_PARAM', err.message, 400);
    }
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('message_history_by_posting error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
