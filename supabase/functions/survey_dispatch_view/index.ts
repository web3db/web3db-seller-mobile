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
    const postingId = getPathParamAsInt(url);

    const { page, page_size, offset } = getPageParams(url);

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

    // Load enrolled participants with hard cap to prevent memory exhaustion
    const MAX_PARTICIPANTS = 10000;
    const { data: allSessions, error: sessErr } = await sb
      .from('TRN_ShareSession')
      .select('UserId')
      .eq('PostingId', postingId)
      .eq('IsActive', true)
      .order('UserId', { ascending: true })
      .limit(MAX_PARTICIPANTS);

    if (sessErr) {
      console.error('survey_dispatch_view sessions query failed:', sessErr);
      return errorResponse('QUERY_FAILED', 'Failed to retrieve participants', 500);
    }

    // Deduplicate by UserId BEFORE paging to ensure consistent page sizes
    const seenUserIds = new Set<number>();
    const allUnique = (allSessions ?? []).filter((s: any) => {
      if (seenUserIds.has(s.UserId)) return false;
      seenUserIds.add(s.UserId);
      return true;
    });
    const totalUnique = allUnique.length;
    const uniqueSessions = allUnique.slice(offset, offset + page_size);

    // Build pseudonym cache for this page of participants (avoids redundant HMAC calls)
    const pseudonymCache = new Map<number, string>();
    await Promise.all(
      uniqueSessions.map(async (s: any) => {
        pseudonymCache.set(s.UserId, await pseudonymize(postingId, s.UserId));
      })
    );

    // Build participant items with pseudonymized IDs
    // Note: user_id is included because this is an ownership-verified admin endpoint
    // and the dispatch API requires raw user_ids for targeting
    const participants = uniqueSessions.map((s: any) => ({
      participant_id: pseudonymCache.get(s.UserId)!,
      user_id: s.UserId,
    }));

    // Load recipient statuses for all surveys x visible participants
    const surveyIds = (surveys ?? []).map((s: any) => s.SurveyId);
    const userIds = uniqueSessions.map((s: any) => s.UserId);

    let recipientStatusMap = new Map<string, any>();
    if (surveyIds.length > 0 && userIds.length > 0) {
      const { data: recipients } = await sb
        .from('TRN_SurveyRecipient')
        .select('SurveyId, UserId, SentOn, OpenedOn, OpenCount, LastOpenedOn')
        .in('SurveyId', surveyIds)
        .in('UserId', userIds);

      for (const r of recipients ?? []) {
        recipientStatusMap.set(`${r.SurveyId}:${r.UserId}`, r);
      }
    }

    // Full grid expansion: every (survey, participant) pair — uses cached pseudonyms
    const recipientStatus = [];
    for (const survey of surveys ?? []) {
      for (const s of uniqueSessions) {
        const r = recipientStatusMap.get(`${survey.SurveyId}:${s.UserId}`);
        const pid = pseudonymCache.get(s.UserId)!;
        if (r) {
          recipientStatus.push({
            survey_id: r.SurveyId,
            participant_id: pid,
            sent_on: r.SentOn,
            opened_on: r.OpenedOn,
            open_count: r.OpenCount ?? 0,
            last_opened_on: r.LastOpenedOn,
            status: r.OpenedOn ? 'OPENED' : r.SentOn ? 'SENT' : 'NOT_SENT',
          });
        } else {
          recipientStatus.push({
            survey_id: survey.SurveyId,
            participant_id: pid,
            sent_on: null,
            opened_on: null,
            open_count: 0,
            last_opened_on: null,
            status: 'NOT_SENT',
          });
        }
      }
    }

    return jsonResponse({
      ok: true,
      posting: { posting_id: postingId },
      surveys: (surveys ?? []).map((s: any) => ({
        survey_id: s.SurveyId,
        posting_id: s.PostingId,
        title: s.Title,
        is_active: s.IsActive,
        created_on: s.CreatedOn,
      })),
      participants: {
        page,
        page_size,
        total: totalUnique,
        items: participants,
      },
      recipient_status: recipientStatus,
    });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return errorResponse('INVALID_PARAM', err.message, 400);
    }
    if (err instanceof AuthError) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    console.error('survey_dispatch_view error:', err);
    return errorResponse('INTERNAL', 'Internal server error', 500);
  }
});
