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
 * Returns plain arrays (not TypedArrays) so they serialise cleanly to JSON.
 */
export async function encryptData(
  data: unknown,
  key: CryptoKey,
): Promise<{ payload: number[]; iv: number[] }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    payload: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv),
  };
}

/** Decrypt and JSON-parse a value encrypted by `encryptData`. */
export async function decryptData<T>(
  payload: number[],
  iv: number[],
  key: CryptoKey,
): Promise<T> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(payload),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}
