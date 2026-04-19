const { onCall, onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const { getMessaging } = require('firebase-admin/messaging');
const crypto = require('crypto');

initializeApp();

const db  = getFirestore();
const auth = getAuth();
const storage = getStorage();
const messaging = getMessaging();

// ── Encryption helpers ──────────────────────────────────────────────
const ALGO = 'aes-256-gcm';
const ENC_KEY = Buffer.from(process.env.AES_KEY || 'replace-with-32-byte-hex-key-here', 'hex'); // 32 bytes hex

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), encrypted.toString('hex'), tag.toString('hex')].join(':');
}

function decrypt(payload) {
  const [ivHex, encHex, tagHex] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGO, ENC_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}

// ── onUserSignup ────────────────────────────────────────────────────
exports.onUserSignup = require('./auth/onUserSignup').onUserSignup;
exports.approveUser  = require('./auth/approveUser').approveUser;
exports.suspendUser  = require('./auth/suspendUser').suspendUser;

// ── API Key / Gemini ────────────────────────────────────────────────
exports.encryptApiKey = require('./crypto/encryptApiKey').encryptApiKey;
exports.callGemini    = require('./ai/callGemini').callGemini;

// ── Storage Monitor ─────────────────────────────────────────────────
exports.storageMonitor = require('./storage/storageMonitor').storageMonitor;

// ── Notifications ───────────────────────────────────────────────────
exports.sendNotification = require('./notifications/sendNotification').sendNotification;

// ── Leave functions ─────────────────────────────────────────────────
exports.onLeaveApply  = require('./leave/onLeaveApply').onLeaveApply;
exports.onLeaveReview = require('./leave/onLeaveReview').onLeaveReview;

// ── Achievements & Events ───────────────────────────────────────────
exports.onNewAchievement   = require('./achievements/onNewAchievement').onNewAchievement;
exports.onEventRegistration = require('./events/onEventRegistration').onEventRegistration;

// ── Reports ─────────────────────────────────────────────────────────
exports.exportLeaveReport = require('./reports/exportLeaveReport').exportLeaveReport;
