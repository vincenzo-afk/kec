const { onCall } = require('firebase-functions/v2/https');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();
const messaging = getMessaging();

exports.syncNotificationTopics = onCall(async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');
  const { token } = request.data || {};
  if (!token) throw new Error('Missing token');

  const userSnap = await db.doc(`users/${request.auth.uid}`).get();
  const user = userSnap.data();
  if (!user) throw new Error('User not found');

  const topics = [];
  if (user.department && user.year && user.section) {
    topics.push(`section_${user.department}_${user.year}_${user.section}`);
  }
  if (user.department) {
    topics.push(`dept_${user.department}`);
  }

  for (const topic of topics) {
    await messaging.subscribeToTopic([token], topic);
  }

  return { success: true, topics };
});
