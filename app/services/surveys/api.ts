// Survey API service — mirrors the pattern in app/services/postings/api.ts
// All calls go to the same Supabase Edge Functions base URL.

import { FUNCTIONS_BASE } from '../postings/api';
import type {
  SurveyListResponse,
  SurveyCreateBody,
  SurveyCreateResponse,
  SurveyGetResponse,
  RecipientsListResponse,
  DispatchViewResponse,
  DispatchBody,
  DispatchResponse,
  SurveySendBody,
  SurveySendResponse,
  MessageHistoryResponse,
  MessageEventDetailResponse,
  SurveyEmailPreviewBody,
  SurveyEmailPreviewResponse,
} from './types';

declare const __DEV__: boolean;

// Supabase anon key — required by Edge Functions with verify_jwt = true.
// Add EXPO_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key> to your .env file.
const SUPABASE_ANON_KEY: string =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) || '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQuery(qs?: Record<string, unknown>): string {
  if (!qs) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function buildUrl(name: string, qs?: Record<string, unknown>): string {
  const clean = name.replace(/^\/+/, '');
  return `${FUNCTIONS_BASE}/${clean}${buildQuery(qs)}`;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

// Wraps fetch() so network-level errors (CORS, DNS, no connection) show
// the URL and whether the anon key was loaded, making diagnosis easier.
async function fetchWithAuth(url: string, init: Omit<RequestInit, 'headers' | 'mode'>): Promise<Response> {
  if (__DEV__ && !SUPABASE_ANON_KEY) {
    console.warn('[surveys/api] SUPABASE_ANON_KEY is empty — restart the dev server after adding EXPO_PUBLIC_SUPABASE_ANON_KEY to .env');
  }
  try {
    return await fetch(url, { ...init, headers: authHeaders(), mode: 'cors' });
  } catch (err: any) {
    const msg = err?.message ?? 'Network error';
    throw new Error(
      `${msg} — URL: ${url}${!SUPABASE_ANON_KEY ? ' — anon key missing (restart dev server)' : ''}`
    );
  }
}

// Normalizes a survey object that may have PascalCase or snake_case fields.
function normalizeSurvey(s: any) {
  return {
    survey_id: s.survey_id ?? s.SurveyId,
    posting_id: s.posting_id ?? s.PostingId,
    created_by: s.created_by ?? s.CreatedBy,
    title: s.title ?? s.Title,
    google_form_responder_url: s.google_form_responder_url ?? s.FormResponderUrl ?? s.GoogleFormResponderUrl,
    prefill_entry_key: s.prefill_entry_key ?? s.PrefillEntryKey,
    is_active: s.is_active ?? s.IsActive,
    created_on: s.created_on ?? s.CreatedOn,
    modified_on: s.modified_on ?? s.ModifiedOn,
    ...(s.stats != null ? { stats: s.stats } : {}),
  };
}

async function handleResponse<T>(res: Response, fnName: string): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__) console.warn(`[${fnName}] ✗`, res.status, res.statusText, txt);
    let message = `${fnName} failed: ${res.status} ${res.statusText}`;
    try {
      const errJson = JSON.parse(txt);
      if (errJson?.message) message = errJson.message;
    } catch {}
    throw new Error(message);
  }
  const json = await res.json().catch(() => null);
  if (!json) throw new Error(`${fnName} returned no data`);
  return json as T;
}

// ---------------------------------------------------------------------------
// API: survey_list_by_posting/{postingId}
// ---------------------------------------------------------------------------

export async function surveyListByPosting(
  postingId: number | string,
  params?: {
    include_stats?: boolean;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }
): Promise<SurveyListResponse> {
  const u = buildUrl(`survey_list_by_posting/${postingId}`, params as Record<string, unknown>);
  if (__DEV__) console.log('[surveyListByPosting] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  const data = await handleResponse<any>(res, 'surveyListByPosting');
  return {
    ...data,
    surveys: (data.surveys ?? []).map(normalizeSurvey),
  };
}

// ---------------------------------------------------------------------------
// API: survey_create (POST)
// ---------------------------------------------------------------------------

export async function surveyCreate(body: SurveyCreateBody): Promise<SurveyCreateResponse> {
  const u = buildUrl('survey_create');
  if (__DEV__) console.log('[surveyCreate] POST', u, body);
  const res = await fetchWithAuth(u, { method: 'POST', body: JSON.stringify(body) });
  const data = await handleResponse<any>(res, 'surveyCreate');
  return { ok: data.ok ?? true, survey: normalizeSurvey(data.survey ?? data) };
}

// ---------------------------------------------------------------------------
// API: survey_get/{surveyId}
// ---------------------------------------------------------------------------

export async function surveyGet(
  surveyId: number | string,
  params?: {
    include_stats?: boolean;
    include_google_url?: boolean;
  }
): Promise<SurveyGetResponse> {
  const u = buildUrl(`survey_get/${surveyId}`, params as Record<string, unknown>);
  if (__DEV__) console.log('[surveyGet] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  return handleResponse<SurveyGetResponse>(res, 'surveyGet');
}

// ---------------------------------------------------------------------------
// API: survey_recipients_list/{surveyId}
// ---------------------------------------------------------------------------

export async function surveyRecipientsList(
  surveyId: number | string,
  params?: {
    status?: 'sent' | 'opened';
    page?: number;
    page_size?: number;
  }
): Promise<RecipientsListResponse> {
  const u = buildUrl(`survey_recipients_list/${surveyId}`, params as Record<string, unknown>);
  if (__DEV__) console.log('[surveyRecipientsList] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  return handleResponse<RecipientsListResponse>(res, 'surveyRecipientsList');
}

// ---------------------------------------------------------------------------
// API: survey_dispatch_view/{postingId}
// ---------------------------------------------------------------------------

export async function surveyDispatchView(
  postingId: number | string,
  params?: {
    page?: number;
    page_size?: number;
  }
): Promise<DispatchViewResponse> {
  const u = buildUrl(`survey_dispatch_view/${postingId}`, params as Record<string, unknown>);
  if (__DEV__) console.log('[surveyDispatchView] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  const data = await handleResponse<any>(res, 'surveyDispatchView');
  return {
    ...data,
    surveys: (data.surveys ?? []).map(normalizeSurvey),
  };
}

// ---------------------------------------------------------------------------
// API: survey_dispatch (POST)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// API: message_history_by_posting/{postingId}
// ---------------------------------------------------------------------------

export async function messageHistoryGet(
  messageEventId: number | string
): Promise<MessageEventDetailResponse> {
  const u = buildUrl(`message_history_get/${messageEventId}`);
  if (__DEV__) console.log('[messageHistoryGet] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  return handleResponse<MessageEventDetailResponse>(res, 'messageHistoryGet');
}

export async function messageHistoryByPosting(
  postingId: number | string,
  params?: {
    survey_id?: number | string;
    event_source?: string;
    page?: number;
    page_size?: number;
  }
): Promise<MessageHistoryResponse> {
  const u = buildUrl(`message_history_by_posting/${postingId}`, params as Record<string, unknown>);
  if (__DEV__) console.log('[messageHistoryByPosting] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  return handleResponse<MessageHistoryResponse>(res, 'messageHistoryByPosting');
}

// ---------------------------------------------------------------------------
// API: survey_send/{surveyId} (POST) — bulk send to all enrolled
// ---------------------------------------------------------------------------

export async function surveySend(
  surveyId: number | string,
  body: SurveySendBody
): Promise<SurveySendResponse> {
  const u = buildUrl(`survey_send/${surveyId}`);
  if (__DEV__) console.log('[surveySend] POST', u, body);
  const res = await fetchWithAuth(u, { method: 'POST', body: JSON.stringify(body) });
  return handleResponse<SurveySendResponse>(res, 'surveySend');
}

// ---------------------------------------------------------------------------
// API: survey_dispatch (POST)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// API: survey_email_preview (POST) — read-only preview, no emails sent
// ---------------------------------------------------------------------------

export async function surveyEmailPreview(body: SurveyEmailPreviewBody): Promise<SurveyEmailPreviewResponse> {
  const u = buildUrl('survey_email_preview');
  if (__DEV__) console.log('[surveyEmailPreview] POST', u, { template_key: body.template_key });
  const res = await fetchWithAuth(u, { method: 'POST', body: JSON.stringify(body) });
  return handleResponse<SurveyEmailPreviewResponse>(res, 'surveyEmailPreview');
}

export async function surveyDispatch(body: DispatchBody): Promise<DispatchResponse> {
  const u = buildUrl('survey_dispatch');
  if (__DEV__) console.log('[surveyDispatch] POST', u, {
    posting_id: body.posting_id,
    survey_ids_count: body.survey_ids.length,
    user_ids_count: body.user_ids.length,
    mode: body.mode,
    dry_run: body.dry_run,
  });
  const res = await fetchWithAuth(u, { method: 'POST', body: JSON.stringify(body) });
  return handleResponse<DispatchResponse>(res, 'surveyDispatch');
}
