const { onCall } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

exports.setTwoFactor = onCall(async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');
  const uid = request.auth.uid;
  const { enabled } = request.data || {};
  if (typeof enabled !== 'boolean') throw new Error('Invalid payload');

  const snap = await db.doc(`users/${uid}`).get();
  const user = snap.data();
  if (!user) throw new Error('User profile not found');

  if (enabled && !user.phone && !request.auth.token.phone_number) {
    throw new Error('A verified phone number is required before enabling 2FA');
  }

  await db.doc(`users/${uid}`).set({
    preferences: {
      ...(user.preferences || {}),
      twoFactorEnabled: enabled,
      twoFactorUpdatedAt: new Date(),
    },
  }, { merge: true });

  return { success: true, enabled };
});
