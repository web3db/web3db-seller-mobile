import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, getPathParam, getPageParams, enforceMethod, pseudonymize } from '../_shared/supabase.ts';
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
    const sb = createServiceClient();

    // Verify posting ownership
    const { data: posting } = await sb.from('TRN_Posting').select('BuyerUserId').eq('PostingId', postingId).single();
    if (!posting || posting.BuyerUserId !== user.internalUserId) {
      return errorResponse('FORBIDDEN', 'You do not have permission to view this posting', 403);
    }

    // Load surveys for this posting
    const { data: surveys, error: surveyErr } = await sb
      .from('TRN_Survey')
      .select('*')
      .eq('PostingId', postingId)
      .order('CreatedOn', { ascending: false });

    if (surveyErr) {
      console.error('survey_dispatch_view surveys query failed:', surveyErr);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve surveys', 500);
    }

    // Load enrolled participants (paged)
    const { data: sessions, count: sessCount, error: sessErr } = await sb
      .from('TRN_ShareSession')
      .select('UserId', { count: 'exact' })
      .eq('PostingId', postingId)
      .eq('IsActive', true)
      .range(offset, offset + page_size - 1);

    if (sessErr) {
      console.error('survey_dispatch_view sessions query failed:', sessErr);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve participants', 500);
    }

    // Build participant items with user_id (secured by ownership check above)
    const participants = await Promise.all(
      (sessions ?? []).map(async (s: any) => ({
        participant_id: await pseudonymize(s.UserId),
        user_id: s.UserId,
      }))
    );

    // Load recipient statuses for all surveys x visible participants
    const surveyIds = (surveys ?? []).map((s: any) => s.SurveyId);
    const userIds = (sessions ?? []).map((s: any) => s.UserId);

    let recipientStatus: any[] = [];
    if (surveyIds.length > 0 && userIds.length > 0) {
      const { data: recipients } = await sb
        .from('TRN_SurveyRecipient')
        .select('SurveyId, UserId, SentOn, OpenedOn, OpenCount, LastOpenedOn')
        .in('SurveyId', surveyIds)
        .in('UserId', userIds);

      recipientStatus = await Promise.all((recipients ?? []).map(async (r: any) => ({
        survey_id: r.SurveyId,
        participant_id: await pseudonymize(r.UserId),
        sent_on: r.SentOn,
        opened_on: r.OpenedOn,
        open_count: r.OpenCount ?? 0,
        last_opened_on: r.LastOpenedOn,
        status: r.OpenedOn ? 'OPENED' : r.SentOn ? 'SENT' : 'NOT_SENT',
      })));
    }

    return jsonResponse({
      ok: true,
      posting: { posting_id: postingId },
      surveys: surveys ?? [],
      participants: {
        page,
        page_size,
        total: sessCount ?? 0,
        items: participants,
      },
      recipient_status: recipientStatus,
    });
  } catch (err: any) {
    if (err.message?.includes('authorization') || err.message?.includes('token') || err.message?.includes('Auth not configured')) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_dispatch_view error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
