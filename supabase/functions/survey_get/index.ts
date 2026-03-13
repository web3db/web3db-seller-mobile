import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParam, enforceMethod } from '../_shared/supabase.ts';
import { verifyAuth } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'GET');
  if (methodErr) return methodErr;

  try {
    const user = await verifyAuth(req);

    const url = new URL(req.url);
    const surveyId = Number(getPathParam(url));
    if (!surveyId || isNaN(surveyId)) {
      return errorResponse('INVALID_PARAM', 'surveyId is required in path');
    }

    const includeStats = url.searchParams.get('include_stats') === 'true';
    const sb = createServiceClient();

    const { data: survey, error } = await sb
      .from('TRN_Survey')
      .select('*')
      .eq('SurveyId', surveyId)
      .single();

    if (error || !survey) {
      return errorResponse('NOT_FOUND', `Survey ${surveyId} not found`, 404);
    }

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', survey.PostingId).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to view this survey', 403);
    }

    let result: any = survey;

    if (includeStats) {
      const { data: recipients } = await sb
        .from('TRN_SurveyRecipient')
        .select('OpenedOn')
        .eq('SurveyId', surveyId);

      const total = recipients?.length ?? 0;
      const opened = recipients?.filter((r: any) => r.OpenedOn).length ?? 0;
      result = { ...survey, stats: { recipients_total: total, opened_total: opened } };
    }

    return jsonResponse({ ok: true, survey: result });
  } catch (err: any) {
    if (err.message?.includes('authorization') || err.message?.includes('token') || err.message?.includes('Auth not configured')) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_get error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
