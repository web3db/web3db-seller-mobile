// Shared Supabase client factory for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse } from './cors.ts';

export function createServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getPostingId(url: URL, pathIndex = 0): number {
  const parts = url.pathname.split('/').filter(Boolean);
  // Edge function path: /function_name/param
  const val = parts[parts.length - 1 - pathIndex];
  if (!val || !/^\d+$/.test(val)) throw new Error('Invalid posting ID');
  const id = parseInt(val, 10);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid posting ID');
  return id;
}

export function getPathParam(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function getPathParamAsInt(url: URL): number {
  const raw = getPathParam(url);
  if (!/^\d+$/.test(raw)) throw new ValidationError('Path parameter must be a numeric ID');
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ValidationError('Path parameter must be a positive integer');
  return id;
}

export function getQueryParam(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

export function getPageParams(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const page_size = Math.min(200, Math.max(1, Number(url.searchParams.get('page_size')) || 50));
  const offset = (page - 1) * page_size;
  return { page, page_size, offset };
}

export function enforceMethod(req: Request, method: string): Response | null {
  if (req.method !== method) {
    return errorResponse('METHOD_NOT_ALLOWED', `Only ${method} requests are allowed`, 405);
  }
  return null;
}

// Lazy-load HMAC secret to avoid issues with env vars not available at module init
let _hmacSecret: string | undefined;
function getHmacSecret(): string {
  if (!_hmacSecret) _hmacSecret = Deno.env.get('PSEUDONYM_HMAC_SECRET');
  if (!_hmacSecret) throw new Error('PSEUDONYM_HMAC_SECRET environment variable is required');
  if (_hmacSecret.length < 32) throw new Error('PSEUDONYM_HMAC_SECRET must be at least 32 characters');
  return _hmacSecret;
}

let _hmacKey: CryptoKey | null = null;
async function getHmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey;
  const secret = getHmacSecret();
  _hmacKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return _hmacKey;
}

export async function pseudonymize(postingId: number, userId: number): Promise<string> {
  const key = await getHmacKey();
  const input = `posting:${postingId}:user:${userId}`;
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  // base64url encoding, 16 bytes, prefix p_
  const bytes = new Uint8Array(signature).slice(0, 16);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64url = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `p_${base64url}`;
}

/** Derive the Edge Functions base URL from a request URL (e.g., https://host/functions/v1) */
export function getFunctionsBaseUrl(reqUrl: URL): string {
  const idx = reqUrl.pathname.indexOf('/functions/v1/');
  if (idx >= 0) {
    return `${reqUrl.protocol}//${reqUrl.host}${reqUrl.pathname.substring(0, idx + '/functions/v1'.length)}`;
  }
  // Fallback: use SUPABASE_URL env var
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (supabaseUrl) return `${supabaseUrl}/functions/v1`;
  // Last resort: assume functions are at root (local dev edge case)
  return `${reqUrl.protocol}//${reqUrl.host}`;
}
