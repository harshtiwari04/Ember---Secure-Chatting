/**
 * crypto/keyManager.js
 * ----------------------
 * Everything related to generating and handling the ECDH (P-256) key pair
 * that powers this app's end-to-end encryption.
 *
 * THE BIG PICTURE
 * ----------------
 * 1. On signup, each user's browser generates an ECDH key PAIR locally using
 *    the Web Crypto API.
 * 2. The PUBLIC key is exported as a JWK and sent to the server -> stored in
 *    MongoDB (User.publicKey) so other users can encrypt messages *to* them.
 * 3. The PRIVATE key is exported as a JWK and saved ONLY in this browser's
 *    IndexedDB (see indexedDb.js). It is never sent anywhere.
 * 4. To send Alice a message, Bob's browser combines Bob's private key with
 *    Alice's public key via ECDH to derive a SHARED SECRET. Alice's browser
 *    derives the exact same shared secret from her private key + Bob's
 *    public key (this is the "Diffie-Hellman" property). That shared secret
 *    becomes an AES-GCM key used to encrypt/decrypt messages between them.
 *
 * The backend only ever sees ciphertext + IV + public keys - never anything
 * that lets it recover plaintext.
 */

const ECDH_PARAMS = { name: 'ECDH', namedCurve: 'P-256' };

/**
 * Generates a fresh ECDH key pair. `privateKey` is extractable ONLY so we
 * can back it up into IndexedDB - it never leaves the browser process.
 */
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits']);
  return keyPair; // { publicKey, privateKey } as CryptoKey objects
}

/** Exports a CryptoKey to a plain JWK object (JSON-serializable). */
export async function exportKeyToJwk(cryptoKey) {
  return window.crypto.subtle.exportKey('jwk', cryptoKey);
}

/** Imports a public key JWK back into a usable CryptoKey (no private-key rights). */
export async function importPublicKey(jwk) {
  return window.crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, []);
}

/** Imports a private key JWK back into a usable CryptoKey. */
export async function importPrivateKey(jwk) {
  return window.crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, ['deriveKey', 'deriveBits']);
}

/**
 * Computes a short, human-readable "fingerprint" of a public key so two
 * users can visually compare and confirm they're really talking to each
 * other (a lightweight version of Signal's "safety numbers").
 */
export async function computeFingerprint(publicKeyJwk) {
  const encoder = new TextEncoder();
  // Stable stringify: JWK key order from exportKey is consistent within a
  // browser session, which is sufficient for a display fingerprint.
  const data = encoder.encode(JSON.stringify(publicKeyJwk));
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  // Format as groups of 4 hex chars for readability, first 20 chars (10 bytes).
  return hex.slice(0, 20).match(/.{1,4}/g).join(' ').toUpperCase();
}

/**
 * Full "generate everything a new account needs" helper used during signup.
 * Returns exported JWKs (for network/storage) plus the fingerprint string.
 */
export async function createIdentity() {
  const { publicKey, privateKey } = await generateKeyPair();
  const publicKeyJwk = await exportKeyToJwk(publicKey);
  const privateKeyJwk = await exportKeyToJwk(privateKey);
  const fingerprint = await computeFingerprint(publicKeyJwk);
  return { publicKeyJwk, privateKeyJwk, fingerprint };
}
