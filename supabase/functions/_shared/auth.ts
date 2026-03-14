// Shared JWT authentication for Edge Functions (Clerk JWKS)
import { jwtVerify, createRemoteJWKSet } from 'https://esm.sh/jose@5';

/** Typed auth error for reliable catch-block classification */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Lazy-load JWKS with TTL-based refresh to handle key rotation
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksCreatedAt = 0;
const JWKS_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getJWKS() {
  const now = Date.now();
  if (!jwks || (now - jwksCreatedAt > JWKS_TTL_MS)) {
    const url = Deno.env.get('CLERK_JWKS_URL');
    if (!url) return null;
    jwks = createRemoteJWKSet(new URL(url));
    jwksCreatedAt = now;
  }
  return jwks;
}

export interface AuthUser {
  clerkUserId: string;
  internalUserId?: number;
}

export async function verifyAuth(req: Request, sb?: any): Promise<AuthUser> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new AuthError('Missing authorization token');

  const keys = getJWKS();
  if (!keys) throw new AuthError('Auth not configured: set CLERK_JWKS_URL');

  let payload;
  try {
    const jwtOptions: Record<string, unknown> = { clockTolerance: 30 };
    const issuer = Deno.env.get('CLERK_ISSUER');
    if (issuer) jwtOptions.issuer = issuer;
    const result = await jwtVerify(token, keys, jwtOptions);
    payload = result.payload;
  } catch (jwtErr: any) {
    throw new AuthError(`JWT verification failed: ${jwtErr.message}`);
  }
  const clerkUserId = payload.sub;
  if (!clerkUserId) throw new AuthError('Invalid token: missing subject');

  // Resolve internal user ID from database using verified JWT subject
  let internalUserId: number | undefined;
  if (sb) {
    const { data: userRow, error: userErr } = await sb
      .from('MST_User')
      .select('UserId')
      .eq('ClerkId', clerkUserId)
      .single();
    if (userErr || !userRow?.UserId) {
      console.error('Failed to resolve internal user ID for ClerkId:', clerkUserId, userErr ?? 'User not found');
      throw new AuthError('User account not found');
    }
    const parsed = Number(userRow.UserId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AuthError('Failed to resolve user identity');
    }
    internalUserId = parsed;
  }

  return { clerkUserId, internalUserId };
}
