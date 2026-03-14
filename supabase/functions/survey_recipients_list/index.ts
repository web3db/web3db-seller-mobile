import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParamAsInt, getPageParams, enforceMethod, pseudonymize, ValidationError } from '../_shared/supabase.ts';
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

    const { page, page_size, offset } = getPageParams(url);
    const statusFilter = url.searchParams.get('status');

    // Get survey and verify posting ownership
    const { data: survey } = await sb
      .from('TRN_Survey')
      .select('PostingId')
      .eq('SurveyId', surveyId)
      .single();

    if (!survey) {
      return errorResponse('NOT_FOUND', `Survey ${surveyId} not found`, 404);
    }

    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', survey.PostingId).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to view this survey', 403);
    }

    let query = sb
      .from('TRN_SurveyRecipient')
      .select('*', { count: 'exact' })
      .eq('SurveyId', surveyId)
      .order('CreatedOn', { ascending: false })
      .range(offset, offset + page_size - 1);

    // Status filter via column conditions
    if (statusFilter === 'opened') {
      query = query.not('OpenedOn', 'is', null);
    } else if (statusFilter === 'sent') {
      query = query.not('SentOn', 'is', null).is('OpenedOn', null);
    }

    const { data: recipients, count, error } = await query;
    if (error) {
      console.error('survey_recipients_list query failed:', error);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve recipients', 500);
    }

    // Compute HMAC-pseudonymized participant_ids
    const items = await Promise.all((recipients ?? []).map(async (r: any) => {
      const status = r.OpenedOn ? 'OPENED' : r.SentOn ? 'SENT' : 'NOT_SENT';
      const participantId = await pseudonymize(survey.PostingId, r.UserId);
      return {
        survey_recipient_id: r.SurveyRecipientId,
        participant_id: participantId,
        sent_on: r.SentOn,
        opened_on: r.OpenedOn,
        open_count: r.OpenCount ?? 0,
        last_opened_on: r.LastOpenedOn,
        status,
      };
    }));

    return jsonResponse({
      ok: true,
      survey_id: surveyId,
      posting_id: survey?.PostingId ?? null,
      page,
      page_size,
      total: count ?? 0,
      recipients: items,
    });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return errorResponse('INVALID_PARAM', err.message, 400);
    }
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_recipients_list error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
