const { initializeApp } = require('firebase-admin/app');

initializeApp();

// ── onUserSignup ────────────────────────────────────────────────────
exports.onUserSignup = require('./auth/onUserSignup').onUserSignup;
exports.approveUser  = require('./auth/approveUser').approveUser;
exports.suspendUser  = require('./auth/suspendUser').suspendUser;

// ── API Key / Gemini ────────────────────────────────────────────────
exports.encryptApiKey = require('./crypto/encryptApiKey').encryptApiKey;
exports.callGemini    = require('./ai/callGemini').callGemini;

// ── Storage Monitor ─────────────────────────────────────────────────
exports.storageMonitor = require('./storage/storageMonitor').storageMonitor;
exports.storageMonitorScheduled = require('./storage/storageMonitor').storageMonitorScheduled;

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
