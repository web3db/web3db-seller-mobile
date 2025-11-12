import type { User, UserDTO } from './types';
import { CreateUserPayloadDTO } from './types';

/**
 * The shape of the data expected when creating a new user.
 * This should match the fields your Edge Function expects (camelCase).
 */
export type CreateUserPayload = {
  clerkId: string;
  email: string;
  name: string;
  BirthYear?: number | null;
  RaceId?: number | null;
  SexId?: number | null;
  HeightNum?: number | null;
  WeightNum?: number | null;
  RoleId?: number | null;
  IsActive?: boolean;
};

// --- Configuration & Utilities (Copied from postings/api.ts) ---

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

// --- End Utilities ---

/**
 * Maps the raw Supabase `MST_User` DTO to the application's internal 'User' type.
 * This keeps the data mapping logic centralized.
 */
function mapDtoToUser(dto: UserDTO): User {
  return {
    userId: dto.UserId,
    clerkId: dto.ClerkId,
    email: dto.Email,
    name: dto.Name,
    birthYear: dto.BirthYear,
    raceId: dto.RaceId,
    sexId: dto.SexId,
    heightNum: dto.HeightNum,
    weightNum: dto.WeightNum,
    roleId: dto.RoleId,
    isActive: dto.IsActive,

    // New display name fields (null-safe)
    raceName: dto.Race?.DisplayName ?? null,
    sexName: dto.Sex?.DisplayName ?? null,
    roleName: dto.Role?.DisplayName ?? null,
    heightUnitName: dto.HeightUnit?.DisplayName ?? null,
    weightUnitName: dto.WeightUnit?.DisplayName ?? null,
    measurementSystemName: dto.MeasurementSystem?.DisplayName ?? null,
  };
}

/**
 * The shape of the data expected when updating an existing user.
 * All fields are optional.
 */
export type UpdateUserPayload = Partial<CreateUserPayload>;

/**
 * Creates a new user record in the MST_User table.
 * @param payload - The user data to insert.
 */
export async function createUser(payload: CreateUserPayloadDTO): Promise<User> {
  // Assumes an Edge Function named 'users_create' exists
  const u = buildUrl("users_create");
  if (__DEV__) console.log("[createUser] POST", u);

  const res = await fetch(u, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[createUser] ✗", res.status, res.statusText, txt);
    throw new Error(`users_create API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) throw new Error("users_create API returned no data");

  return mapDtoToUser(json);
}

/**
 * LIST - Fetches a list of all users from the MST_User table.
 */
export async function listUsers(): Promise<User[]> {
  // Assumes an Edge Function named 'users_list' exists
  const u = buildUrl("users_list");
  if (__DEV__) console.log("[listUsers] GET", u);

  const res = await fetch(u, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[listUsers] ✗", res.status, res.statusText, txt);
    throw new Error(`users_list API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  const rawItems: any[] = Array.isArray(json) ? json : (json?.items && Array.isArray(json.items)) ? json.items : [];

  const items: User[] = rawItems.map((p: UserDTO) => mapDtoToUser(p));
  if (__DEV__) console.log(`[listUsers] ✓ items=${items.length}`);
  return items;
}

/**
 * GET DETAIL - Fetches a single user's details by their UserId.
 * @param userId - The primary key of the user in your database.
 */
export async function getUserDetail(userId: number): Promise<User | null> {
  // Assumes an Edge Function named 'users_profile' that accepts a 'userId' query parameter
  const u = buildUrl('users_profile', { userId });
  if (__DEV__) console.log("[getUserDetail] GET", u);

  const res = await fetch(u, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    // If the user is not found, the function might return a 404
    if (res.status === 404) {
      console.log(`User with ID ${userId} not found.`);
      return null;
    }
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[getUserDetail] ✗", res.status, res.statusText, txt);
    throw new Error(`users_detail API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  const dto = json?.user ?? json?.data ?? json;
  return dto ? mapDtoToUser(dto) : null;
}

/**
 * UPDATE - Sends an update payload for a user to the MST_User table.
 * @param userId - The primary key of the user to update.
 * @param payload - The fields to update.
 */
export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<User> {
  // Assumes an Edge Function named 'users_update/{userId}' exists
  const u = buildUrl(`users_update/${userId}`);
  if (__DEV__) console.log("[updateUser] PATCH", u, payload);

  const res = await fetch(u, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[updateUser] ✗", res.status, res.statusText, txt);
    throw new Error(`users_update API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) throw new Error("users_update API returned no data");

  return mapDtoToUser(json);
}

/**
 * GET PROFILE BY CLERK ID - Fetches a single user's profile by their Clerk ID via an Edge Function.
 * @param clerkId - The Clerk ID of the user.
 */
export async function getUserProfileByClerkId(clerkId: string): Promise<User | null> {
  // Assumes an Edge Function named 'users_profile' that accepts a 'clerkId' query parameter
  const u = buildUrl('users_profile', { clerkId });
  if (__DEV__) console.log("[getUserProfileByClerkId] GET", u);

  const res = await fetch(u, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    // If the user is not found, the function might return a 404
    if (res.status === 404) {
      console.log(`User profile with Clerk ID ${clerkId} not found.`);
      return null;
    }
    const txt = await res.text().catch(() => "");
    if (__DEV__) console.warn("[getUserProfileByClerkId] ✗", res.status, res.statusText, txt);
    throw new Error(`users_profile API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  return json ? mapDtoToUser(json) : null;
}

/**
 * Calls the `auth_lookup` edge function to check if a user exists and is active,
 * returning their MST_User primary key and name.
 *
 * Success (200):
 *   { ok: true, userId: number, name: string | null }
 *
 * Known failures:
 *   400: invalid email
 *   403: user inactive
 *   404: user not found
 *   5xx: server error
 */
export type AuthLookupResult = {
  userId: number;
  name: string | null;
};

export async function lookupUser(email: string): Promise<AuthLookupResult> {
  // Prefer GET with query string (the function supports GET or POST)
  const u = buildUrl('auth_lookup', { email });
  if (__DEV__) console.log('[lookupUser] GET', u);

  const res = await fetch(u, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // ignore JSON parse errors; we'll handle below
  }

  if (!res.ok) {
    const msg = (body && (body.error || body.message)) || `${res.status} ${res.statusText}`;
    if (__DEV__) console.warn('[lookupUser] ✗', res.status, msg);
    // Surface meaningful messages to the caller
    throw new Error(msg);
  }

  const userId = body?.userId;
  const name = (body?.name ?? null) as string | null;

  if (typeof userId !== 'number') {
    throw new Error('Invalid response from auth_lookup: missing userId');
  }

  if (__DEV__) console.log('[lookupUser] ✓', { userId, name });
  return { userId, name };
}