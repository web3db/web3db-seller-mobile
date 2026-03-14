// AES-256-GCM message encryption for survey messages
// Key loaded from MESSAGE_ENCRYPTION_KEY env var (base64-encoded 32-byte key)

const KEY_ENV = 'MESSAGE_ENCRYPTION_KEY';
const CURRENT_KEY_VERSION = 1;

// Cache imported CryptoKeys to avoid re-importing on every call
const _keyCache = new Map<number, CryptoKey>();

function base64ToBytes(b64: string): Uint8Array {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    throw new Error('Invalid base64 input');
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function getKey(version: number = CURRENT_KEY_VERSION): Promise<CryptoKey> {
  const cached = _keyCache.get(version);
  if (cached) return cached;

  // Currently only version 1 is supported; future versions can load different keys
  if (version !== CURRENT_KEY_VERSION) {
    throw new Error(`Unsupported key version: ${version}. Only version ${CURRENT_KEY_VERSION} is supported.`);
  }
  const raw = Deno.env.get(KEY_ENV);
  if (!raw) throw new Error(`${KEY_ENV} environment variable is required`);
  const keyBytes = base64ToBytes(raw);
  if (keyBytes.length !== 32) throw new Error(`${KEY_ENV} must be a 32-byte key (base64-encoded)`);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  _keyCache.set(version, key);
  return key;
}

export async function encryptMessage(plaintext: string): Promise<{ ciphertext: string; nonce: string; keyVersion: number }> {
  const key = await getKey(CURRENT_KEY_VERSION);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoded);
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    nonce: bytesToBase64(nonce),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

export async function decryptMessage(ciphertext: string, nonce: string, keyVersion: number): Promise<string> {
  const key = await getKey(keyVersion);
  const ciphertextBytes = base64ToBytes(ciphertext);
  const nonceBytes = base64ToBytes(nonce);
  if (nonceBytes.length !== 12) throw new Error('Invalid nonce length');
  if (ciphertextBytes.length < 16) throw new Error('Invalid ciphertext: too short');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonceBytes }, key, ciphertextBytes);
  return new TextDecoder().decode(decrypted);
}
