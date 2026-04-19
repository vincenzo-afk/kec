const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

exports.onUserSignup = onDocumentCreated('users/{userId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  // Notify all principals of new signup
  const principals = await db.collection('users')
    .where('role', '==', 'principal')
    .where('approvalStatus', '==', 'approved')
    .get();

  const tokens = principals.docs.map(d => d.data().fcmToken).filter(Boolean);
  if (tokens.length > 0) {
    await messaging.sendEachForMulticast({
      tokens,
      notification: { title: 'New Signup Request 👤', body: `${data.name} (${data.email}) is awaiting approval.` },
    });
  }
});
