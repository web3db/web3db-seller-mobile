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
    const includeStats = url.searchParams.get('include_stats') === 'true';
    const isActiveParam = url.searchParams.get('is_active');

    const sb = createServiceClient();

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', postingId).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to view this posting', 403);
    }

    let query = sb
      .from('TRN_Survey')
      .select('*', { count: 'exact' })
      .eq('PostingId', postingId)
      .order('CreatedOn', { ascending: false })
      .range(offset, offset + page_size - 1);

    if (isActiveParam === 'true') query = query.eq('IsActive', true);
    else if (isActiveParam === 'false') query = query.eq('IsActive', false);

    const { data: surveys, count, error } = await query;
    if (error) {
      console.error('survey_list_by_posting query failed:', error);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve surveys', 500);
    }

    let enriched = surveys ?? [];

    if (includeStats && enriched.length > 0) {
      const surveyIds = enriched.map((s: any) => s.SurveyId);
      const { data: recipients } = await sb
        .from('TRN_SurveyRecipient')
        .select('SurveyId, OpenedOn')
        .in('SurveyId', surveyIds);

      const statsMap: Record<number, { recipients_total: number; opened_total: number }> = {};
      for (const r of recipients ?? []) {
        if (!statsMap[r.SurveyId]) statsMap[r.SurveyId] = { recipients_total: 0, opened_total: 0 };
        statsMap[r.SurveyId].recipients_total++;
        if (r.OpenedOn) statsMap[r.SurveyId].opened_total++;
      }

      enriched = enriched.map((s: any) => ({
        ...s,
        stats: statsMap[s.SurveyId] ?? { recipients_total: 0, opened_total: 0 },
      }));
    }

    return jsonResponse({
      ok: true,
      posting_id: postingId,
      page,
      page_size,
      total: count ?? 0,
      surveys: enriched,
    });
  } catch (err: any) {
    if (err.message?.includes('authorization') || err.message?.includes('token') || err.message?.includes('Auth not configured')) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_list_by_posting error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
