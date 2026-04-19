const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

exports.onEventRegistration = onDocumentUpdated('events/{eventId}', async (event) => {
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();
  if (!before || !after) return;

  const newRegistrations = (after.registrations || []).filter(uid => !(before.registrations || []).includes(uid));
  if (newRegistrations.length === 0) return;

  // Notify newly registered student
  for (const uid of newRegistrations) {
    const userSnap = await db.doc(`users/${uid}`).get();
    const token = userSnap.data()?.fcmToken;
    if (token) {
      try {
        await messaging.send({ token, notification: { title: '✅ Event Registration Confirmed', body: `You are registered for: ${after.title}` } });
      } catch (_) {}
    }
  }

  // Notify organiser of new headcount
  if (after.createdBy) {
    const organiserSnap = await db.doc(`users/${after.createdBy}`).get();
    const token = organiserSnap.data()?.fcmToken;
    if (token) {
      try {
        await messaging.send({ token, notification: { title: '📊 Event Update', body: `${after.title}: ${after.registrations?.length || 0} registered` } });
      } catch (_) {}
    }
  }
});
