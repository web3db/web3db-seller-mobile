import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPageParams, enforceMethod, getFunctionsBaseUrl } from '../_shared/supabase.ts';
import { verifyAuth, AuthError } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const methodErr = enforceMethod(req, 'GET');
  if (methodErr) return methodErr;

  try {
    const sb = createServiceClient();
    const user = await verifyAuth(req, sb);

    const url = new URL(req.url);
    const userId = Number(url.searchParams.get('user_id'));
    if (!userId || isNaN(userId)) {
      return errorResponse('MISSING_PARAM', 'user_id query parameter is required');
    }

    if (user.internalUserId !== userId) {
      return errorResponse('FORBIDDEN', 'You can only view your own inbox', 403);
    }

    const { page, page_size, offset } = getPageParams(url);

    // Derive base URL for survey links (includes /functions/v1 prefix)
    const baseUrl = getFunctionsBaseUrl(url);

    const { data: recipients, count, error } = await sb
      .from('TRN_SurveyRecipient')
      .select('*, TRN_Survey(Title)', { count: 'exact' })
      .eq('UserId', userId)
      .order('CreatedOn', { ascending: false })
      .range(offset, offset + page_size - 1);

    if (error) {
      console.error('survey_inbox query failed:', error);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve inbox', 500);
    }

    const items = (recipients ?? []).map((r: any) => ({
      survey_recipient_id: r.SurveyRecipientId,
      survey_id: r.SurveyId,
      survey_title: r.TRN_Survey?.Title ?? '',
      survey_url: `${baseUrl}/survey_redirect/${r.RecipientToken}`,
      sent_on: r.SentOn,
      opened_on: r.OpenedOn,
      status: r.OpenedOn ? 'OPENED' : r.SentOn ? 'SENT' : 'NOT_SENT',
    }));

    return jsonResponse({
      ok: true,
      user_id: userId,
      page,
      page_size,
      total: count ?? 0,
      items,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_inbox error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
