/**
 * crypto/encryption.js
 * ----------------------
 * Derives a shared AES-GCM key from an ECDH key pair and uses it to
 * encrypt/decrypt message text.
 *
 * Message flow for "Bob sends Alice a message":
 *  1. Bob's browser: deriveSharedKey(bobPrivateKey, alicePublicKey) -> AES key
 *  2. Bob's browser: encryptMessage(aesKey, "hello") -> { ciphertext, iv }  (base64)
 *  3. Ciphertext + iv travel over the network / sit in MongoDB - meaningless
 *     without the AES key.
 *  4. Alice's browser: deriveSharedKey(alicePrivateKey, bobPublicKey) -> the
 *     SAME AES key (ECDH's core property), then decryptMessage(...) -> "hello"
 */

const AES_PARAMS = { name: 'AES-GCM', length: 256 };
const IV_LENGTH_BYTES = 12; // 96 bits, the recommended IV size for AES-GCM

/**
 * Derives a symmetric AES-GCM key shared between two parties from one
 * party's private key and the other party's public key.
 *
 * We run the raw ECDH output through HKDF so the final AES key is uniformly
 * random even though the raw ECDH shared secret has some structure.
 */
export async function deriveSharedKey(privateKey, publicKey) {
  // Step 1: ECDH -> raw shared secret bits.
  const sharedBits = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  );

  // Step 2: Import those bits as HKDF input key material.
  const hkdfKey = await window.crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);

  // Step 3: HKDF -> a proper AES-GCM key. A fixed, app-specific "info"
  // string domain-separates this from any other protocol that might reuse
  // the same ECDH secret.
  const encoder = new TextEncoder();
  return window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0), // no extra salt needed; ECDH output is already unique per pair
      info: encoder.encode('secure-chat-app/message-key/v1'),
    },
    hkdfKey,
    AES_PARAMS,
    false, // not extractable - the derived key only ever lives in memory
    ['encrypt', 'decrypt']
  );
}

/** Encrypts plaintext with the given AES-GCM key. Returns base64 strings. */
export async function encryptMessage(aesKey, plaintext) {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const encoder = new TextEncoder();
  const encoded = encoder.encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
  };
}

/** Decrypts a { ciphertext, iv } pair (base64 strings) back to plaintext. */
export async function decryptMessage(aesKey, ciphertextB64, ivB64) {
  const ciphertext = base64ToBuffer(ciphertextB64);
  const iv = base64ToBuffer(ivB64);

  const plainBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);

  const decoder = new TextDecoder();
  return decoder.decode(plainBuffer);
}

// --- base64 <-> ArrayBuffer helpers ----------------------------------------

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
