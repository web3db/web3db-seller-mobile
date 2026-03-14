// Simple token manager for API auth
// Updated by AuthContext, consumed by API layer

let _clerkToken: string | null = null;
let _internalUserId: number | null = null;

export function setClerkToken(token: string | null) {
  _clerkToken = token;
}

export function getClerkToken(): string | null {
  return _clerkToken;
}

export function setInternalUserId(id: number | null) {
  _internalUserId = id;
}

export function getInternalUserId(): number | null {
  return _internalUserId;
}
