// Survey API service — mirrors the pattern in app/services/postings/api.ts
// Updated from reverted code: provider-agnostic naming + new endpoints

import { FUNCTIONS_BASE } from '../postings/api';
import { getClerkToken } from '@/app/services/auth/tokenManager';
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
  EmailPreviewRequest,
  EmailPreviewResponse,
  SurveyInboxResponse,
  MessageEventListResponse,
  MessageHistoryDetail,
} from './types';

declare const __DEV__: boolean;

// Lazy-load to handle cases where env vars aren't available at module init
function getSupabaseAnonKey(): string {
  try {
    // @ts-ignore – process.env may not exist in all runtimes
    return process?.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validates that an ID is a safe numeric string before URL interpolation */
function validateId(id: number | string): string {
  const s = String(id);
  if (!/^\d+$/.test(s)) throw new Error('Invalid ID format');
  return s;
}

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

/** Wait for the Clerk token to become available (handles race on page load) */
async function waitForClerkToken(maxMs = 3000): Promise<string | null> {
  const immediate = getClerkToken();
  if (immediate) return immediate;

  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 100));
    const t = getClerkToken();
    if (t) return t;
  }
  return null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const anonKey = getSupabaseAnonKey();
  if (anonKey) {
    headers['apikey'] = anonKey;
  }
  const token = await waitForClerkToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (__DEV__) {
    console.warn('[surveys/api] No auth token available — requests will be unauthenticated');
  }
  return headers;
}

async function fetchWithAuth(url: string, init: Omit<RequestInit, 'headers' | 'mode'>): Promise<Response> {
  if (__DEV__ && !getSupabaseAnonKey()) {
    console.warn('[surveys/api] SUPABASE_ANON_KEY is empty — restart the dev server after adding EXPO_PUBLIC_SUPABASE_ANON_KEY to .env');
  }
  try {
    return await fetch(url, { ...init, headers: await authHeaders(), mode: 'cors' });
  } catch (err: any) {
    const msg = err?.message ?? 'Network error';
    throw new Error(
      `${msg} — URL: ${url}${!getSupabaseAnonKey() ? ' — anon key missing (restart dev server)' : ''}`
    );
  }
}

// Normalizes a survey row from PascalCase DB columns to snake_case app types.
// Supports both old Google-specific names and new provider-agnostic names.
function normalizeSurvey(s: any) {
  const normalized = {
    survey_id: s.survey_id ?? s.SurveyId,
    posting_id: s.posting_id ?? s.PostingId,
    created_by: s.created_by ?? s.CreatedBy,
    title: s.title ?? s.Title,
    form_responder_url:
      s.form_responder_url ?? s.FormResponderUrl ??
      s.google_form_responder_url ?? s.GoogleFormResponderUrl,
    participant_param_key:
      s.participant_param_key ?? s.ParticipantParamKey ??
      s.prefill_entry_key ?? s.PrefillEntryKey,
    is_active: s.is_active ?? s.IsActive,
    created_on: s.created_on ?? s.CreatedOn,
    modified_on: s.modified_on ?? s.ModifiedOn,
    ...(s.stats != null ? { stats: s.stats } : {}),
  };
  if (typeof normalized.survey_id !== 'number' || isNaN(normalized.survey_id)) {
    if (__DEV__) console.warn('[normalizeSurvey] Invalid survey data:', s);
  }
  return normalized;
}

// Normalizes a MessageEvent from either old or new field names to spec-compliant types.
function normalizeMessageEvent(e: any): import('./types').MessageEvent {
  return {
    message_event_id: e.message_event_id ?? e.survey_message_event_id,
    posting_id: e.posting_id,
    survey_id: e.survey_id,
    event_source: e.event_source,
    dispatch_mode: e.dispatch_mode,
    include_survey_link: e.include_survey_link ?? e.include_link ?? false,
    include_message: e.include_message ?? false,
    is_dry_run: e.is_dry_run ?? e.dry_run ?? false,
    created_by: e.created_by ?? e.initiated_by,
    total_sent: e.total_sent ?? e.pairs_sent ?? 0,
    total_failed: e.total_failed ?? e.pairs_failed ?? 0,
    total_skipped: e.total_skipped ?? e.pairs_skipped ?? 0,
    total_recipients: e.total_recipients,
    targeting_summary: e.targeting_summary,
    channel: e.channel,
    created_on: e.created_on,
    survey_title: e.survey_title,
  };
}

// Normalizes a MessageRecipientItem from either old or new field names.
function normalizeMessageRecipient(r: any): import('./types').MessageRecipientItem {
  return {
    message_recipient_id: r.message_recipient_id ?? r.survey_message_recipient_id,
    participant_id: r.participant_id,
    outcome_status: r.outcome_status,
    skip_reason: r.skip_reason,
    failure_code: r.failure_code,
    posting_id: r.posting_id,
    channel: r.channel,
    attempted_on: r.attempted_on,
    completed_on: r.completed_on,
  };
}

// Normalizes a SurveySendResponse from either old or new field names.
function normalizeSurveySendResponse(data: any): import('./types').SurveySendResponse {
  return {
    ok: data.ok ?? true,
    survey_id: data.survey_id,
    message_event_id: data.message_event_id ?? null,
    total_sent: data.total_sent ?? data.pairs_sent ?? 0,
    total_failed: data.total_failed ?? data.pairs_failed ?? 0,
    total_skipped: data.total_skipped ?? data.pairs_skipped ?? 0,
    errors: data.errors ?? [],
  };
}

async function handleResponse<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__) console.warn(`[${label}] Error ${res.status}:`, txt);

    // Try to extract a user-friendly message
    let serverMessage: string | undefined;
    let errJson: any;
    try { errJson = JSON.parse(txt); } catch { errJson = null; }
    if (errJson) {
      serverMessage = errJson.message;
      if (errJson.code === 'UNAUTHORIZED') {
        throw new Error(errJson.message || 'Please sign in to continue');
      }
      if (errJson.code === 'FORBIDDEN') {
        throw new Error('You do not have permission for this action');
      }
      if (errJson.code === 'VALIDATION_ERROR' && errJson.message) {
        throw new Error(errJson.message); // Validation errors are safe to show
      }
    }

    // Generic fallback — don't leak internal details
    if (res.status >= 500) {
      throw new Error('Something went wrong. Please try again later.');
    }
    // For 4xx errors, include the server message if available
    if (serverMessage) {
      throw new Error(serverMessage);
    }
    throw new Error(`Request failed (${res.status}). Please try again.`);
  }
  const json = await res.json().catch(() => null);
  if (!json) throw new Error(`${label} returned no data`);
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
  const u = buildUrl(`survey_list_by_posting/${validateId(postingId)}`, params as Record<string, unknown>);
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
    include_form_url?: boolean;
  }
): Promise<SurveyGetResponse> {
  const u = buildUrl(`survey_get/${validateId(surveyId)}`, params as Record<string, unknown>);
  if (__DEV__) console.log('[surveyGet] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  const data = await handleResponse<any>(res, 'surveyGet');
  return { ok: data.ok ?? true, survey: normalizeSurvey(data.survey ?? data) };
}

// ---------------------------------------------------------------------------
// API: survey_send/{surveyId} (POST) — send to all enrolled participants
// ---------------------------------------------------------------------------

export async function surveySend(
  surveyId: number | string,
  body: SurveySendBody
): Promise<SurveySendResponse> {
  const u = buildUrl(`survey_send/${validateId(surveyId)}`);
  if (__DEV__) console.log('[surveySend] POST', u, body);
  const res = await fetchWithAuth(u, { method: 'POST', body: JSON.stringify(body) });
  const data = await handleResponse<any>(res, 'surveySend');
  return normalizeSurveySendResponse(data);
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
  const u = buildUrl(`survey_recipients_list/${validateId(surveyId)}`, params as Record<string, unknown>);
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
  const u = buildUrl(`survey_dispatch_view/${validateId(postingId)}`, params as Record<string, unknown>);
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

export async function surveyDispatch(body: DispatchBody): Promise<DispatchResponse> {
  const u = buildUrl('survey_dispatch');
  if (__DEV__) console.log('[surveyDispatch] POST', u, {
    posting_id: body.posting_id,
    survey_ids_count: body.survey_ids.length,
    user_ids_count: body.user_ids.length,
    mode: body.mode,
    is_dry_run: body.is_dry_run,
  });
  const res = await fetchWithAuth(u, { method: 'POST', body: JSON.stringify(body) });
  const data = await handleResponse<any>(res, 'surveyDispatch');
  return {
    ...data,
    is_dry_run: data.is_dry_run ?? data.dry_run ?? false,
  } as DispatchResponse;
}

// ---------------------------------------------------------------------------
// API: survey_email_preview (POST)
// ---------------------------------------------------------------------------

export async function surveyEmailPreview(
  body: EmailPreviewRequest
): Promise<EmailPreviewResponse> {
  const u = buildUrl('survey_email_preview');
  if (__DEV__) console.log('[surveyEmailPreview] POST', u);
  const res = await fetchWithAuth(u, { method: 'POST', body: JSON.stringify(body) });
  const data = await handleResponse<any>(res, 'surveyEmailPreview');
  return {
    ok: data.ok ?? true,
    subject: data.subject ?? data.rendered_subject ?? '',
    body_html: data.body_html ?? data.rendered_body ?? '',
    placeholders_used: data.placeholders_used ?? (data.placeholders ? Object.keys(data.placeholders) : []),
  } as EmailPreviewResponse;
}

// ---------------------------------------------------------------------------
// API: survey_inbox?user_id=N
// ---------------------------------------------------------------------------

export async function surveyInbox(
  params: { user_id: number; page?: number; page_size?: number }
): Promise<SurveyInboxResponse> {
  const u = buildUrl('survey_inbox', params as Record<string, unknown>);
  if (__DEV__) console.log('[surveyInbox] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  return handleResponse<SurveyInboxResponse>(res, 'surveyInbox');
}

// ---------------------------------------------------------------------------
// API: message_history_by_posting/{postingId}
// ---------------------------------------------------------------------------

export async function messageHistoryByPosting(
  postingId: number | string,
  params?: {
    survey_id?: number;
    event_source?: string;
    page?: number;
    page_size?: number;
  }
): Promise<MessageEventListResponse> {
  const u = buildUrl(`message_history_by_posting/${validateId(postingId)}`, params as Record<string, unknown>);
  if (__DEV__) console.log('[messageHistoryByPosting] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  const data = await handleResponse<any>(res, 'messageHistoryByPosting');
  return {
    ...data,
    events: (data.events ?? []).map(normalizeMessageEvent),
  } as MessageEventListResponse;
}

// ---------------------------------------------------------------------------
// API: message_history_get/{messageEventId}
// ---------------------------------------------------------------------------

export async function messageHistoryGet(
  messageEventId: number | string,
  params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }
): Promise<MessageHistoryDetail> {
  const u = buildUrl(`message_history_get/${validateId(messageEventId)}`, params as Record<string, unknown>);
  if (__DEV__) console.log('[messageHistoryGet] GET', u);
  const res = await fetchWithAuth(u, { method: 'GET' });
  const data = await handleResponse<any>(res, 'messageHistoryGet');
  return {
    ...data,
    event: normalizeMessageEvent(data.event),
    recipients: {
      ...data.recipients,
      items: (data.recipients?.items ?? []).map(normalizeMessageRecipient),
    },
  } as MessageHistoryDetail;
}
