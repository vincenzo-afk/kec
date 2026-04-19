const { onLeaveApply } = require('./onLeaveApply');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

exports.onLeaveApply = onLeaveApply;
exports.onLeaveReview = require('./onLeaveApply').onLeaveReview;
