/**
 * E2E encryption for live collaboration.
 *
 * Matches excalidraw.com exactly:
 *   - Algorithm : AES-GCM, 128-bit key
 *   - Key format: JWK — the raw `k` field is placed in the URL hash fragment,
 *                 which browsers never send to the server.
 *   - IV        : 12 random bytes per message, prepended to the message as metadata.
 *
 * The server stores and relays ciphertext only and cannot decrypt it.
 */

const IV_BYTES = 12;

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

function uint8ToBase64(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 128 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return jwk.k as string;
}

export async function importKeyFromBase64(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { k: base64, alg: "A128GCM", ext: true, key_ops: ["encrypt", "decrypt"], kty: "oct" },
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt any JSON-serialisable value.
 * Returns Base64 strings so the wire representation is ~3× smaller than
 * the previous number-array format, and stays well under Cloudflare's
 * 128 KB per-key Durable Object storage limit.
 */
export async function encryptData(
  data: unknown,
  key: CryptoKey,
): Promise<{ payload: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    payload: uint8ToBase64(new Uint8Array(encrypted)),
    iv: uint8ToBase64(iv),
  };
}

/** Decrypt and JSON-parse a value encrypted by `encryptData`. */
export async function decryptData<T>(
  payload: string,
  iv: string,
  key: CryptoKey,
): Promise<T> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(payload),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}
