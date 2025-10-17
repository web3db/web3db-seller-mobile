// src/services/postings/api.ts
import type { Study, PostingsResponseDTO, PostingDTO } from "./types";

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
    return {
        id: raw.PostingId,
        title: raw.Title,
        summary: raw.Summary,
        description: raw.Description,
        statusId: raw.PostingStatusId,
        // Mocking display fields as they are not available from the raw PostgREST data here
        organizer: "Web3Health", 
        spots: 500, // Placeholder
    };
}


// --- API Functions ---

/** LIST (array response) - Fetches a list of TRN_Postings via an Edge Function */
export async function listTrnPostings(
  params: ListParams = {} // Using params if the Edge Function expects them
): Promise<Study[]> {
  
  // NOTE: Assuming you have deployed a Supabase Edge Function named 'list_postings'
  // that queries the TRN_Posting table and returns the results.
  const u = buildUrl("buyers_postings_detail", params as Record<string, unknown>);
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

  // The API returns an array of raw posting objects
  const rawPostings = (await res.json()) as PostingsResponseDTO; 
  
  const items: Study[] = Array.isArray(rawPostings)
    ? rawPostings.map((p: PostingDTO) => mapRawToStudy(p))
    : [];

  if (__DEV__) {
    console.log(`[listTrnPostings] ✓ items=${items.length}`);
  }

  return items; // Returns the mapped array of Study objects
}