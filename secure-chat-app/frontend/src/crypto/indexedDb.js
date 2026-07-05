/**
 * crypto/indexedDb.js
 * ---------------------
 * Wraps IndexedDB (via the tiny `idb` helper library) to store the user's
 * ECDH PRIVATE key locally in the browser. The private key NEVER leaves this
 * device and NEVER touches the network or the backend - that's what makes
 * this end-to-end encryption rather than "encryption in transit".
 *
 * Why IndexedDB and not localStorage?
 *  - localStorage is synchronous, string-only, and readable by any script
 *    running on the page (any XSS payload can read it instantly).
 *  - IndexedDB can store structured data (CryptoKey-derived JWKs) and, while
 *    still same-origin-readable, is the browser-recommended place for
 *    larger/structured client-side secrets and pairs well with marking the
 *    key non-extractable where possible.
 */

import { openDB } from 'idb';

const DB_NAME = 'secure-chat-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

/**
 * Persists the private key (as an exported JWK object) under a key scoped
 * to the user's id, so multiple accounts on the same browser don't collide.
 */
export async function savePrivateKey(userId, privateKeyJwk) {
  const db = await getDb();
  await db.put(STORE_NAME, privateKeyJwk, `privateKey:${userId}`);
}

export async function getPrivateKey(userId) {
  const db = await getDb();
  return db.get(STORE_NAME, `privateKey:${userId}`);
}

export async function hasPrivateKey(userId) {
  const key = await getPrivateKey(userId);
  return Boolean(key);
}

export async function deletePrivateKey(userId) {
  const db = await getDb();
  await db.delete(STORE_NAME, `privateKey:${userId}`);
}
