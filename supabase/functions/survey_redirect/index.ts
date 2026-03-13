import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParam, enforceMethod, pseudonymize } from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'GET');
  if (methodErr) return methodErr;

  try {
    // No auth required - security is via the random UUID token in the URL
    const url = new URL(req.url);
    const recipientToken = getPathParam(url);
    if (!recipientToken) {
      return errorResponse('MISSING_PARAM', 'recipientToken is required in path');
    }

    const sb = createServiceClient();

    // Look up recipient by token
    const { data: recipient, error } = await sb
      .from('TRN_SurveyRecipient')
      .select('*, TRN_Survey(*)')
      .eq('RecipientToken', recipientToken)
      .single();

    if (error || !recipient) {
      return errorResponse('NOT_FOUND', 'Invalid or expired survey link', 404);
    }

    // Update tracking
    const now = new Date().toISOString();
    await sb
      .from('TRN_SurveyRecipient')
      .update({
        OpenedOn: recipient.OpenedOn ?? now,
        OpenCount: (recipient.OpenCount ?? 0) + 1,
        LastOpenedOn: now,
      })
      .eq('SurveyRecipientId', recipient.SurveyRecipientId);

    // Build redirect URL with participant param
    const survey = recipient.TRN_Survey;
    const formUrl = survey?.FormResponderUrl ?? survey?.GoogleFormResponderUrl;
    const paramKey = survey?.ParticipantParamKey ?? survey?.PrefillEntryKey;

    if (!formUrl || !paramKey) {
      console.error('survey_redirect config error: missing FormResponderUrl or ParticipantParamKey for survey', survey?.SurveyId);
      return errorResponse('CONFIG_ERROR', 'Survey URL configuration is incomplete', 500);
    }

    // HMAC-pseudonymized participant ID
    const participantId = await pseudonymize(recipient.UserId);

    // Proper URL construction handles existing query parameters
    const redirectUrl = new URL(formUrl);
    redirectUrl.searchParams.set(paramKey, participantId);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl.toString(),
      },
    });
  } catch (err: any) {
    console.error('survey_redirect error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
