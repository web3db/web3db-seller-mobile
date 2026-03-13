// Shared JWT authentication for Edge Functions (Clerk JWKS)
import { jwtVerify, createRemoteJWKSet } from 'https://esm.sh/jose@5';

const CLERK_JWKS_URL = Deno.env.get('CLERK_JWKS_URL');
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks && CLERK_JWKS_URL) {
    jwks = createRemoteJWKSet(new URL(CLERK_JWKS_URL));
  }
  return jwks;
}

export interface AuthUser {
  clerkUserId: string;
  internalUserId?: number;
}

export async function verifyAuth(req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Missing authorization token');

  const keys = getJWKS();
  if (!keys) throw new Error('Auth not configured: set CLERK_JWKS_URL');

  const { payload } = await jwtVerify(token, keys);
  const clerkUserId = payload.sub;
  if (!clerkUserId) throw new Error('Invalid token: missing subject');

  const internalIdStr = req.headers.get('x-internal-user-id');
  return {
    clerkUserId,
    internalUserId: internalIdStr ? Number(internalIdStr) : undefined,
  };
}
