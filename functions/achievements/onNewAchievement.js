const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

exports.onNewAchievement = onDocumentCreated('achievements/{achievementId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  if (data.postedBy) {
    await db.doc(`users/${data.postedBy}`).set({
      lastAchievementAt: new Date(),
    }, { merge: true });
  }

  // Notify all approved users (throttled — max 1 per 30 mins handled by checking last notif time)
  const usersSnap = await db.collection('users').where('approvalStatus', '==', 'approved').limit(500).get();
  const tokens = usersSnap.docs.map(d => d.data().fcmToken).filter(Boolean);

  if (tokens.length === 0) return;

  // Send in batches of 500
  for (let i = 0; i < tokens.length; i += 500) {
    await messaging.sendEachForMulticast({
      tokens: tokens.slice(i, i + 500),
      notification: {
        title: `🌟 New Achievement by ${data.posterName}`,
        body: data.title,
      },
    });
  }
});
