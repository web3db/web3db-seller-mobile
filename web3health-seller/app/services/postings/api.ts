/**
 * GET DETAIL - Fetches a single posting's details via the Edge Function
 * /buyers_postings_detail/{buyerId}/{postingId}
 */
import type {
  Study,
  PostingsResponseDTO,
  PostingDTO,
  Metric,
  PostingStatus,
  RewardType,
  HealthCondition
} from "./types";

export async function getTrnPostingDetail(buyerId: number | string, postingId: number | string) {
  const u = buildUrl(`buyers_postings_detail/3/${postingId}`);
  if (__DEV__) console.log('[getTrnPostingDetail] GET', u);

  const res = await fetch(u, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__) console.warn('[getTrnPostingDetail] ✗', res.status, res.statusText, txt);
    throw new Error(`buyers_postings_detail API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  const detail: any = Array.isArray(json) ? json[0] : json;

  // Fetch all reference data needed for normalization
  // (listMetrics and listHealthConditions are defined later in this same file)
  const [allMetrics, allHealthConditions] = await Promise.all([
    listMetrics(),
    listHealthConditions(),
  ]);

  // Normalize metrics:
  // The backend might return `metricId` as a flat array of IDs, or `metrics` as an array of objects.
  // We need `metrics` to be an array of `{ metricId: number, metricDisplayName: string }` for `index.tsx`.
  if (detail) {
    let rawMetricIds: number[] = [];
    if (Array.isArray(detail.metricId)) {
      rawMetricIds = detail.metricId.map(Number);
    } else if (Array.isArray(detail.metrics)) {
      // If `metrics` is already an array of objects, extract their IDs
      rawMetricIds = detail.metrics.map((m: any) => Number(m.metricId));
    }

    detail.metrics = rawMetricIds
      .map((id: number) => {
        const metric = allMetrics.find(m => m.metricId === id);
        // Ensure metricDisplayName is present for index.tsx
        return metric ? { metricId: id, metricDisplayName: metric.displayName } : null;
      })
      .filter(Boolean); // Remove any nulls if a metric ID wasn't found
  }

  // Normalize health conditions:
  // The `index.tsx` component's `StudyDetail` type expects `healthConditions: { id: number; displayName: string }[]`.
  // The raw API response might have `healthConditionId` and `displayName`.
  if (detail && Array.isArray(detail.healthConditions)) {
    detail.healthConditions = detail.healthConditions.map((hc: any) => {
      const id = hc.id ?? hc.healthConditionId; // Prefer 'id' if present, otherwise use 'healthConditionId'
      const displayName = hc.displayName;
      return { id: Number(id), displayName: String(displayName) };
    });
  }

  return detail as Study; // Cast to Study or a more specific StudyDetail type if defined globally
}

// --- Configuration & Utilities (Copied from original example) ---

export type ListParams = {
  page?: number;
  pageSize?: number;
  // future: tag?: string; sort?: string;
};

// ** REPLACE with your actual Supabase Function base URL **
export const FUNCTIONS_BASE = (() => {
  // Use a runtime override for development (e.g., http://localhost:8787)
  try {
    // window is available in web; process.env in build time
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).__DEV_PROXY__) return (window as any).__DEV_PROXY__
  } catch {}
  // fallback to process env (used by bundlers)
  if (typeof process !== 'undefined' && process.env && process.env.DEV_PROXY) return process.env.DEV_PROXY

  return "https://jkyctppxygjhsqwmbyvb.supabase.co/functions/v1"
})()

// Global flag assumed to be set in your build system
declare const __DEV__: boolean; 

function buildQuery(qs?: Record<string, unknown>) {
  if (!qs) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function buildUrl(name: string, qs?: Record<string, unknown>) {
  const clean = name.replace(/^\/+/, "");
  return `${FUNCTIONS_BASE}/${clean}${buildQuery(qs)}`;
}

/**
 * Maps the raw Supabase PostgREST/Edge Function data to the application's internal 'Study' type.
 * In a real app, this would be in a separate mapper.ts file.
 */
function mapRawToStudy(raw: PostingDTO): Study {
  // support both snake/PascalCase coming from different backends and camelCase
  const anyRaw: any = raw as any;
  const id = anyRaw.postingId ?? anyRaw.PostingId ?? anyRaw.PostingID ?? anyRaw.id
  const title = anyRaw.title ?? anyRaw.Title ?? ''
  const summary = anyRaw.summary ?? anyRaw.Summary ?? ''
  const description = anyRaw.description ?? anyRaw.Description ?? ''
  const statusId = anyRaw.postingStatusId ?? anyRaw.PostingStatusId ?? anyRaw.PostingStatusID ?? 0

  return {
    id,
    title,
    summary,
    description,
    statusId,
    // Mocking display fields as they are not available from the raw PostgREST data here
    organizer: anyRaw.buyerDisplayName ?? "Web3Health",
    // 'spots' doesn't exist on the API response; keep a reasonable default so UI math works
    spots: typeof anyRaw.spots === 'number' ? anyRaw.spots : 0,
  };
}


// --- API Functions ---

/** LIST (array response) - Fetches a list of TRN_Postings via an Edge Function */
export async function listTrnPostings(
  params: ListParams = {} // Using params if the Edge Function expects them
): Promise<Study[]> {
  
  // NOTE: Assuming you have deployed a Supabase Edge Function named 'list_postings'
  // that queries the TRN_Posting table and returns the results.
  const u = buildUrl("buyers_postings_list/3", params as Record<string, unknown>);
  if (__DEV__) console.log("[listTrnPostings] GET", u);

  const res = await fetch(u, {
    method: "GET",
    headers: { 
        "Content-Type": "application/json", 
        // You would typically include Authorization headers here if required
    },
    // browsers will set Origin automatically on cross-origin requests; include this option for clarity
    mode: 'cors',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[listTrnPostings] ✗", res.status, res.statusText, txt);
    // Throwing an error for the component to catch
    throw new Error(`list_postings API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  // The API may return either an array or a paged response { items: [], page, pageSize }
  const json = await res.json().catch(() => null)
  let rawPostings: any[] = []
  if (!json) rawPostings = []
  else if (Array.isArray(json)) rawPostings = json
  else if (json.items && Array.isArray(json.items)) rawPostings = json.items
  else rawPostings = []

  const items: Study[] = rawPostings.map((p: PostingDTO) => mapRawToStudy(p))

  if (__DEV__) {
    console.log(`[listTrnPostings] ✓ items=${items.length}`);
  }

  return items; // Returns the mapped array of Study objects
}

/** UPDATE - sends an update payload for a posting to the Edge Function 'buyers_postings_update' */
export async function updateTrnPosting(postingId: number | string, payload: Record<string, any>) {
  const u = buildUrl(`buyers_postings_update/3/${postingId}`);
  if (__DEV__) console.log('[updateTrnPosting] PATCH', u, postingId, payload);

  const res = await fetch(u, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // **FIX**: Send the payload directly without adding postingId to it.
    body: JSON.stringify(payload),
    mode: 'cors',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__) console.warn('[updateTrnPosting] ✗', res.status, res.statusText, txt);
    throw new Error(`buyers_postings_update API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  return json;
}

export async function createTrnPosting(
  params: ListParams = {} // Using params if the Edge Function expects them
): Promise<Study> {
  const u = buildUrl("buyers_postings_create/3");
  if (__DEV__) console.log("[createTrnPosting] POST", u);

  const res = await fetch(u, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // You would typically include Authorization headers here if required
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[createTrnPosting] ✗", res.status, res.statusText, txt);
    // Throwing an error for the component to catch
    throw new Error(`create_posting API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) throw new Error("create_posting API returned no data");

  const item = mapRawToStudy(json);
  if (__DEV__) {
    console.log(`[createTrnPosting] ✓ item=${item.id}`);
  }

  return item; // Returns the mapped Study object
}

// add to app/services/postings/api.ts

/**
 * Fetch metrics from the Edge Function: GET /functions/v1/metrics
 */
export async function listMetrics(): Promise<Metric[]> {
  const u = buildUrl("metrics");
  if (__DEV__) console.log("[listMetrics] GET", u);

  const res = await fetch(u, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    mode: "cors",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[listMetrics] ✗", res.status, res.statusText, txt);
    throw new Error(`metrics API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) return [];

  // API returns { items: [...] }
  const rawItems: any[] = Array.isArray(json.items) ? json.items : [];
  const items: Metric[] = rawItems.map((it) => ({
    metricId: Number(it.metricId ?? it.metric_id ?? it.id),
    code: String(it.code ?? it.Code ?? ""),
    displayName: String(it.displayName ?? it.display_name ?? it.DisplayName ?? ""),
    canonicalUnitCode: String(it.canonicalUnitCode ?? it.canonical_unit_code ?? it.CanonicalUnitCode ?? ""),
    isActive: Boolean(it.isActive ?? it.is_active ?? true),
  }));

  if (__DEV__) console.log(`[listMetrics] ✓ items=${items.length}`);
  return items;
}

/** Fetch posting statuses: GET /functions/v1/posting_statuses */
export async function listPostingStatuses(): Promise<PostingStatus[]> {
  const u = buildUrl("posting_statuses");
  if (__DEV__) console.log("[listPostingStatuses] GET", u);

  const res = await fetch(u, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[listPostingStatuses] ✗", res.status, res.statusText, txt);
    throw new Error(`posting_statuses API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) return [];

  const raw: any[] = Array.isArray(json.items) ? json.items : [];
  const items: PostingStatus[] = raw.map((r) => ({
    postingStatusId: Number(r.postingStatusId ?? r.posting_status_id ?? r.id),
    code: String(r.code ?? ""),
    displayName: String(r.displayName ?? r.display_name ?? ""),
    isActive: Boolean(r.isActive ?? r.is_active ?? true),
  }));

  if (__DEV__) console.log(`[listPostingStatuses] ✓ items=${items.length}`);
  return items;
}

/** Fetch reward types: GET /functions/v1/reward_types */
export async function listRewardTypes(): Promise<RewardType[]> {
  const u = buildUrl("reward_types");
  if (__DEV__) console.log("[listRewardTypes] GET", u);

  const res = await fetch(u, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[listRewardTypes] ✗", res.status, res.statusText, txt);
    throw new Error(`reward_types API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) return [];

  const raw: any[] = Array.isArray(json.items) ? json.items : [];
  const items: RewardType[] = raw.map((r) => ({
    rewardTypeId: Number(r.rewardTypeId ?? r.reward_type_id ?? r.id),
    code: String(r.code ?? ""),
    displayName: String(r.displayName ?? r.display_name ?? ""),
    isActive: Boolean(r.isActive ?? r.is_active ?? true),
  }));

  if (__DEV__) console.log(`[listRewardTypes] ✓ items=${items.length}`);
  return items;
}

/** Fetch health conditions: GET /functions/v1/health_conditions */
export async function listHealthConditions(): Promise<HealthCondition[]> {
  const u = buildUrl("health_conditions");
  if (__DEV__) console.log("[listHealthConditions] GET", u);

  const res = await fetch(u, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[listHealthConditions] ✗", res.status, res.statusText, txt);
    throw new Error(`health_conditions API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) return [];

  // the function returns an array (per your example) or { items: [...] } in other endpoints
  // handle both shapes for safety:
  const rawArr: any[] = Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : [];

  const items: HealthCondition[] = rawArr.map((r) => ({
    healthConditionId: Number(r.healthConditionId ?? r.health_condition_id ?? r.id),
    code: String(r.code ?? ""),
    displayName: String(r.displayName ?? r.display_name ?? ""),
  }));

  if (__DEV__) console.log(`[listHealthConditions] ✓ items=${items.length}`);
  return items;
}