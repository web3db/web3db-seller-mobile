import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, enforceMethod } from '../_shared/supabase.ts';
import { verifyAuth, AuthError } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'POST');
  if (methodErr) return methodErr;

  try {
    const sb = createServiceClient();
    const user = await verifyAuth(req, sb);
    if (!user.internalUserId) {
      return errorResponse('FORBIDDEN', 'Internal user ID is required for mutations', 403);
    }

    const body = await req.json();
    const { posting_id, title, parameterized_form_url } = body;

    if (!posting_id) return errorResponse('MISSING_FIELD', 'posting_id is required');
    if (typeof posting_id !== 'number' || isNaN(posting_id)) {
      return errorResponse('VALIDATION_ERROR', 'posting_id must be a number', 400);
    }
    if (!title?.trim()) return errorResponse('MISSING_FIELD', 'title is required');
    if (title.trim().length > 500) return errorResponse('VALIDATION_ERROR', 'title must be 500 characters or fewer', 400);
    if (!parameterized_form_url?.trim()) return errorResponse('MISSING_FIELD', 'parameterized_form_url is required');
    if (parameterized_form_url.trim().length > 2048) return errorResponse('VALIDATION_ERROR', 'URL must be 2048 characters or fewer', 400);

    // Parse URL to extract form_responder_url and participant_param_key
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(parameterized_form_url.trim());
    } catch {
      return errorResponse('INVALID_URL', 'parameterized_form_url is not a valid URL');
    }

    if (parsedUrl.protocol !== 'https:') {
      return errorResponse('VALIDATION_ERROR', 'URL must use HTTPS');
    }

    const params = Array.from(parsedUrl.searchParams.entries());
    if (params.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'URL must contain at least one query parameter for participant identification');
    }

    // Use the last query parameter as the participant param key
    const lastParam = params[params.length - 1];
    const participantParamKey = lastParam[0];

    // Build the base form URL without the participant param
    parsedUrl.searchParams.delete(participantParamKey);
    const formResponderUrl = parsedUrl.toString();

    // Look up the posting to get BuyerUserId as CreatedBy
    const { data: posting, error: postingErr } = await sb
      .from('TRN_Posting')
      .select('BuyerUserId')
      .eq('PostingId', posting_id)
      .single();

    if (postingErr || !posting) {
      return errorResponse('POSTING_NOT_FOUND', `Posting ${posting_id} not found`, 404);
    }

    if (posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to create surveys for this posting', 403);
    }

    const { data: survey, error: insertErr } = await sb
      .from('TRN_Survey')
      .insert({
        PostingId: posting_id,
        Title: title.trim(),
        FormResponderUrl: formResponderUrl,
        ParticipantParamKey: participantParamKey,
        CreatedBy: posting.BuyerUserId,
        IsActive: true,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('survey_create insert failed:', insertErr);
      return errorResponse('INSERT_FAILED', 'Failed to create survey', 500);
    }

    const normalized = {
      survey_id: survey.SurveyId,
      posting_id: survey.PostingId,
      created_by: survey.CreatedBy,
      title: survey.Title,
      form_responder_url: survey.FormResponderUrl,
      participant_param_key: survey.ParticipantParamKey,
      is_active: survey.IsActive,
      created_on: survey.CreatedOn,
      modified_on: survey.ModifiedOn,
    };
    return jsonResponse({ ok: true, survey: normalized }, 201);
  } catch (err: any) {
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_create error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
