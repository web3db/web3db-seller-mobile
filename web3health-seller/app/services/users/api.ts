// --- 1. Type Definitions (Assumed to be in './types' and moved here for completeness) ---

/**
 * The DTO (Data Transfer Object) shape received from the Supabase Edge Function response.
 * This MUST use the exact casing of the columns in your Postgres database (PascalCase).
 *
 * NOTE: I have corrected your 'bigint' fields (UserId, CreatedBy, ModifiedBy) to be 'string'
 * in TypeScript. This is critical to prevent data corruption, as JavaScript 'number'
 * cannot safely handle the full range of a Postgres 'bigint'.
 */
export type UserDTO = {
  UserId: string; // BIGINT
  ClerkId: string;
  Email: string;
  Name: string;
  BirthYear: number | null;
  RaceId: number | null;
  SexId: number | null;
  HeightNum: number | null; // numeric
  HeightUnitId: number | null;
  WeightNum: number | null; // numeric
  WeightUnitId: number | null;
  MeasurementSystemId: number | null;
  IsActive: boolean;
  CreatedBy: string; // BIGINT
  CreatedOn: string; // timestamp with time zone
  ModifiedBy: string | null; // BIGINT
  ModifiedOn: string | null; // timestamp with time zone
  RoleId: number | null;
};

/**
 * The internal application model for a User.
 * This uses standard JavaScript/TypeScript camelCase convention.
 */
export type User = {
  userId: string; // BIGINT
  clerkId: string;
  email: string;
  name: string;
  birthYear: number | null;
  raceId: number | null;
  sexId: number | null;
  heightNum: number | null;
  heightUnitId: number | null;
  weightNum: number | null;
  weightUnitId: number | null;
  measurementSystemId: number | null;
  isActive: boolean;
  createdBy: string; // BIGINT
  createdOn: Date; // <-- Changed to Date for easier use
  modifiedBy: string | null; // BIGINT
  modifiedOn: Date | null; // <-- Changed to Date for easier use
  roleId: number | null;
};

/**
 * The shape of the data expected when creating a new user (the payload sent to the API).
 * This uses camelCase and should contain only client-editable fields.
 * It is mapped to the 'CreateUserPayload' below.
 */
export type CreateUserPayloadDTO = {
  clerkId: string;
  email: string;
  name: string;
  birthYear?: number | null;
  raceId?: number | null;
  sexId?: number | null;
  heightNum?: number | null;
  heightUnitId?: number | null;
  weightNum?: number | null;
  weightUnitId?: number | null;
  measurementSystemId?: number | null;
  roleId?: number | null; // <-- FIXED: Added this field
  isActive?: boolean; // <-- FIXED: Added this field
};

// --- 2. Imports and Client-Side Payload Type ---

// Renamed and fixed the import to reflect the combined file structure,
// but kept original structure for reference if 'types' is a separate file.
// import type { User, UserDTO } from './types';
// import { CreateUserPayloadDTO } from './types';

/**
 * The shape of the data expected when creating a new user.
 * This should match the fields your Edge Function expects (camelCase).
 * NOTE: Used 'CreateUserPayloadDTO' for payload consistency.
 */
export type CreateUserPayload = CreateUserPayloadDTO;

// --- Configuration & Utilities (Copied from postings/api.ts) ---

// ** REPLACE with your actual Supabase Function base URL **
export const FUNCTIONS_BASE = (() => {
  // Use a runtime override for development (e.g., http://localhost:8787)
  try {
    // window is available in web; process.env in build time
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).__DEV_PROXY__)
      return (window as any).__DEV_PROXY__;
  } catch {}
  // fallback to process env (used by bundlers)
  if (typeof process !== 'undefined' && process.env && process.env.DEV_PROXY)
    return process.env.DEV_PROXY;

  return 'https://jkyctppxygjhsqwmbyvb.supabase.co/functions/v1';
})();

// Global flag assumed to be set in your build system
declare const __DEV__: boolean;

function buildQuery(qs?: Record<string, unknown>) {
  if (!qs) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function buildUrl(name: string, qs?: Record<string, unknown>) {
  const clean = name.replace(/^\/+/, '');
  return `${FUNCTIONS_BASE}/${clean}${buildQuery(qs)}`;
}

// --- End Utilities ---

// --- 3. Fixed Mapping Function ---

/**
 * Maps the raw Supabase `MST_User` DTO (PascalCase) to the application's internal 'User' type (camelCase).
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
    heightUnitId: dto.HeightUnitId,
    weightNum: dto.WeightNum,
    weightUnitId: dto.WeightUnitId,
    measurementSystemId: dto.MeasurementSystemId,
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

// --- 4. API Client Functions (No functional changes needed here) ---

/**
 * Creates a new user record in the MST_User table.
 * @param payload - The user data to insert.
 */
export async function createUser(payload: CreateUserPayloadDTO): Promise<User> {
  // Assumes an Edge Function named 'users_create' exists
  const u = buildUrl('users_create');
  if (__DEV__) console.log('[createUser] POST', u);

  const res = await fetch(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__)
      console.warn('[createUser] ✗', res.status, res.statusText, txt);
    throw new Error(
      `users_create API failed: ${res.status} ${res.statusText} ${txt}`,
    );
  }

  const json = await res.json().catch(() => null);
  if (!json) throw new Error('users_create API returned no data');

  return mapDtoToUser(json);
}

/**
 * LIST - Fetches a list of all users from the MST_User table.
 */
export async function listUsers(): Promise<User[]> {
  // Assumes an Edge Function named 'users_list' exists
  const u = buildUrl('users_list');
  if (__DEV__) console.log('[listUsers] GET', u);

  const res = await fetch(u, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__)
      console.warn('[listUsers] ✗', res.status, res.statusText, txt);
    throw new Error(
      `users_list API failed: ${res.status} ${res.statusText} ${txt}`,
    );
  }

  const json = await res.json().catch(() => null);
  const rawItems: any[] = Array.isArray(json)
    ? json
    : json?.items && Array.isArray(json.items)
      ? json.items
      : [];

  const items: User[] = rawItems.map((p: UserDTO) => mapDtoToUser(p));
  if (__DEV__) console.log(`[listUsers] ✓ items=${items.length}`);
  return items;
}

/**
 * GET DETAIL - Fetches a single user's details by their UserId.
 * @param userId - The primary key of the user in your database (as a string, since it's a bigint).
 */
export async function getUserDetail(userId: number): Promise<User | null> {
  // Assumes an Edge Function named 'users_profile' that accepts a 'userId' query parameter
  const u = buildUrl('users_profile', { userId });
  if (__DEV__) console.log("[getUserDetail] GET", u);

  const res = await fetch(u, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    // If the user is not found, the function might return a 404
    if (res.status === 404) {
      console.log(`User with ID ${userId} not found.`);
      return null;
    }
    const txt = await res.text().catch(() => '');
    if (__DEV__)
      console.warn('[getUserDetail] ✗', res.status, res.statusText, txt);
    throw new Error(
      `users_detail API failed: ${res.status} ${res.statusText} ${txt}`,
    );
  }

  const json = await res.json().catch(() => null);
  const dto = json?.user ?? json?.data ?? json;
  return dto ? mapDtoToUser(dto) : null;
}

/**
 * UPDATE - Sends an update payload for a user to the MST_User table.
 * @param userId - The primary key of the user to update (as a string, since it's a bigint).
 * @param payload - The fields to update.
 */
export async function updateUser(
  userId: string,
  payload: UpdateUserPayload,
): Promise<User> {
  // Assumes an Edge Function named 'users_update/{userId}' exists
  const u = buildUrl(`users_update/${userId}`);
  if (__DEV__) console.log('[updateUser] PATCH', u, payload);

  const res = await fetch(u, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__)
      console.warn('[updateUser] ✗', res.status, res.statusText, txt);
    throw new Error(
      `users_update API failed: ${res.status} ${res.statusText} ${txt}`,
    );
  }

  const json = await res.json().catch(() => null);
  if (!json) throw new Error('users_update API returned no data');

  return mapDtoToUser(json);
}

/**
 * GET PROFILE BY CLERK ID - Fetches a single user's profile by their Clerk ID via an Edge Function.
 * @param clerkId - The Clerk ID of the user.
 */
export async function getUserProfileByClerkId(
  clerkId: string,
): Promise<User | null> {
  // Assumes an Edge Function named 'users_profile' that accepts a 'clerkId' query parameter
  const u = buildUrl('users_profile', { clerkId });
  if (__DEV__) console.log('[getUserProfileByClerkId] GET', u);

  const res = await fetch(u, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    // If the user is not found, the function might return a 404
    if (res.status === 404) {
      console.log(`User profile with Clerk ID ${clerkId} not found.`);
      return null;
    }
    const txt = await res.text().catch(() => '');
    if (__DEV__)
      console.warn(
        '[getUserProfileByClerkId] ✗',
        res.status,
        res.statusText,
        txt,
      );
    throw new Error(
      `users_profile API failed: ${res.status} ${res.statusText} ${txt}`,
    );
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

/** Fetch sex/gender reference values from the backend: GET /functions/v1/sexes */
export async function listSexes(): Promise<{
  sexId: number;
  sexCode: string;
  displayName: string;
  isActive: boolean;
}[]> {
  const u = buildUrl('sexes');
  if (__DEV__) console.log('[listSexes] GET', u);

  const res = await fetch(u, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__) console.warn('[listSexes] ✗', res.status, res.statusText, txt);
    throw new Error(`sexes API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) return [];

  const raw: any[] = Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : [];
  const items = raw.map((r) => ({
    sexId: Number(r.sexId ?? r.SexId ?? r.id),
    sexCode: String(r.sexCode ?? r.SexCode ?? r.code ?? ''),
    displayName: String(r.sexDisplayName ?? r.DisplayName ?? r.name ?? ''),
    isActive: Boolean(r.isActive ?? r.IsActive ?? true),
  }));

  if (__DEV__) console.log(`[listSexes] ✓ items=${items.length}`);
  return items;
}

/** Fetch race reference values from the backend: GET /functions/v1/races */
export async function listRaces(): Promise<{
  raceId: number;
  raceCode: string;
  displayName: string;
  isActive: boolean;
}[]> {
  const u = buildUrl('races');
  if (__DEV__) console.log('[listRaces] GET', u);

  const res = await fetch(u, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (__DEV__) console.warn('[listRaces] ✗', res.status, res.statusText, txt);
    throw new Error(`races API failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const json = await res.json().catch(() => null);
  if (!json) return [];

  const raw: any[] = Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : [];
  const items = raw.map((r) => ({
    raceId: Number(r.raceId ?? r.RaceId ?? r.id),
    raceCode: String(r.raceCode ?? r.RaceCode ?? r.code ?? ''),
    displayName: String(r.raceDisplayName ?? r.DisplayName ?? r.name ?? ''),
    isActive: Boolean(r.isActive ?? r.IsActive ?? true),
  }));

  if (__DEV__) console.log(`[listRaces] ✓ items=${items.length}`);
  return items;
}