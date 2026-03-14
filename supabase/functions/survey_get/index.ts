import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParamAsInt, enforceMethod, ValidationError } from '../_shared/supabase.ts';
import { verifyAuth, AuthError } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'GET');
  if (methodErr) return methodErr;

  try {
    const sb = createServiceClient();
    const user = await verifyAuth(req, sb);

    const url = new URL(req.url);
    const surveyId = getPathParamAsInt(url);

    const includeStats = url.searchParams.get('include_stats') === 'true';
    const includeFormUrl = url.searchParams.get('include_form_url') === 'true';

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

    // Normalize to snake_case
    const normalized: any = {
      survey_id: survey.SurveyId,
      posting_id: survey.PostingId,
      created_by: survey.CreatedBy,
      title: survey.Title,
      participant_param_key: survey.ParticipantParamKey,
      is_active: survey.IsActive,
      created_on: survey.CreatedOn,
      modified_on: survey.ModifiedOn,
    };

    if (includeFormUrl) {
      normalized.form_responder_url = survey.FormResponderUrl;
    }

    if (includeStats) {
      const [totalRes, openedRes] = await Promise.all([
        sb.from('TRN_SurveyRecipient').select('*', { count: 'exact', head: true }).eq('SurveyId', surveyId),
        sb.from('TRN_SurveyRecipient').select('*', { count: 'exact', head: true }).eq('SurveyId', surveyId).not('OpenedOn', 'is', null),
      ]);
      normalized.stats = { recipients_total: totalRes.count ?? 0, opened_total: openedRes.count ?? 0 };
    }

    return jsonResponse({ ok: true, survey: normalized });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return errorResponse('INVALID_PARAM', err.message, 400);
    }
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_get error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
