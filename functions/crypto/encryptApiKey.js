const { onCall } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

const db = getFirestore();
const ALGO = 'aes-256-gcm';

function getKey() {
  const keyHex = process.env.AES_KEY;
  if (!keyHex || keyHex.length !== 64) throw new Error('AES_KEY env var must be 32-byte hex (64 chars)');
  return Buffer.from(keyHex, 'hex');
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

exports.encryptApiKey = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');
  const { apiKey } = request.data;

  const userRef = db.doc(`users/${request.auth.uid}`);

  if (!apiKey) {
    // Clear key
    await userRef.update({ encryptedGeminiKey: '' });
    return { success: true, cleared: true };
  }

  const encrypted = encrypt(apiKey);
  await userRef.update({ encryptedGeminiKey: encrypted });
  return { success: true };
});
