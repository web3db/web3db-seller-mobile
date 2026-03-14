// Shared CORS headers for all Edge Functions
// Set ALLOWED_ORIGIN env var to restrict origins in production (e.g., 'https://app.example.com')

function getAllowedOrigin(): string {
  return Deno.env.get('ALLOWED_ORIGIN') ?? '*';
}

export function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

// Backward-compatible export — evaluated per access via getter
export const corsHeaders: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    return getCorsHeaders()[prop];
  },
  has(_target, prop: string) {
    return prop in getCorsHeaders();
  },
  ownKeys() {
    return Object.keys(getCorsHeaders());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    const headers = getCorsHeaders();
    if (prop in headers) {
      return { value: headers[prop], enumerable: true, configurable: true };
    }
    return undefined;
  },
});

export function corsResponse() {
  return new Response(null, { status: 204, headers: getCorsHeaders() });
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
  });
}

export function errorResponse(code: string, message: string, status = 400, details?: unknown) {
  return jsonResponse({ ok: false, code, message, details: details ?? null }, status);
}
