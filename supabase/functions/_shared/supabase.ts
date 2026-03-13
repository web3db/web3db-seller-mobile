// Shared Supabase client factory for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse } from './cors.ts';

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

export function getPostingId(url: URL, pathIndex = 0): number {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  // Edge function path: /function_name/param
  const val = parts[parts.length - 1 - pathIndex];
  const id = Number(val);
  if (!id || isNaN(id)) throw new Error('Invalid posting ID');
  return id;
}

export function getPathParam(url: URL): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export function getQueryParam(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

export function getPageParams(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const page_size = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size')) || 25));
  const offset = (page - 1) * page_size;
  return { page, page_size, offset };
}

export function enforceMethod(req: Request, method: string): Response | null {
  if (req.method !== method) {
    return errorResponse('METHOD_NOT_ALLOWED', `Only ${method} requests are allowed`, 405);
  }
  return null;
}

const HMAC_SECRET = Deno.env.get('PSEUDONYM_HMAC_SECRET');

export async function pseudonymize(userId: number): Promise<string> {
  if (!HMAC_SECRET) throw new Error('PSEUDONYM_HMAC_SECRET environment variable is required');
  if (HMAC_SECRET.length < 32) throw new Error('PSEUDONYM_HMAC_SECRET must be at least 32 characters');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(HMAC_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(String(userId)));
  const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `P-${hex.slice(0, 16)}`;
}
