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
    const includeStats = url.searchParams.get('include_stats') === 'true';
    const isActiveParam = url.searchParams.get('is_active');

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

    const MAX_STATS_SURVEYS = 50;
    if (includeStats && enriched.length > 0) {
      const surveyIds = enriched.slice(0, MAX_STATS_SURVEYS).map((s: any) => s.SurveyId);

      // Use COUNT queries instead of fetching all rows
      const statsMap: Record<number, { recipients_total: number; opened_total: number }> = {};
      await Promise.all(surveyIds.map(async (sid: number) => {
        const [totalRes, openedRes] = await Promise.all([
          sb.from('TRN_SurveyRecipient').select('*', { count: 'exact', head: true }).eq('SurveyId', sid),
          sb.from('TRN_SurveyRecipient').select('*', { count: 'exact', head: true }).eq('SurveyId', sid).not('OpenedOn', 'is', null),
        ]);
        statsMap[sid] = {
          recipients_total: totalRes.count ?? 0,
          opened_total: openedRes.count ?? 0,
        };
      }));

      enriched = enriched.map((s: any) => ({
        ...s,
        stats: statsMap[s.SurveyId] ?? { recipients_total: 0, opened_total: 0 },
      }));
    }

    // Normalize PascalCase DB rows to snake_case
    const normalized = enriched.map((s: any) => ({
      survey_id: s.SurveyId,
      posting_id: s.PostingId,
      created_by: s.CreatedBy,
      title: s.Title,
      form_responder_url: s.FormResponderUrl,
      participant_param_key: s.ParticipantParamKey,
      is_active: s.IsActive,
      created_on: s.CreatedOn,
      modified_on: s.ModifiedOn,
      ...(s.stats != null ? { stats: s.stats } : {}),
    }));

    return jsonResponse({
      ok: true,
      posting_id: postingId,
      page,
      page_size,
      total: count ?? 0,
      surveys: normalized,
    });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return errorResponse('INVALID_PARAM', err.message, 400);
    }
    if (err instanceof AuthError) {
      console.error('survey_list_by_posting auth error:', err.message);
      return errorResponse('UNAUTHORIZED', err.message, 401);
    }
    console.error('survey_list_by_posting error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
