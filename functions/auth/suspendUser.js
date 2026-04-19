const { onCall } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

exports.suspendUser = onCall({ enforceAppCheck: false }, async (request) => {
  const caller = request.auth;
  if (!caller) throw new Error('Unauthenticated');

  const callerDoc = await db.doc(`users/${caller.uid}`).get();
  if (!['principal', 'hod'].includes(callerDoc.data()?.role)) throw new Error('Forbidden');

  const { userId } = request.data;
  await db.doc(`users/${userId}`).update({ approvalStatus: 'suspended' });

  return { success: true };
});
