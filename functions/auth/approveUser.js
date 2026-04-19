const { onCall } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

exports.approveUser = onCall({ enforceAppCheck: false }, async (request) => {
  const caller = request.auth;
  if (!caller) throw new Error('Unauthenticated');

  // Verify caller is principal
  const callerDoc = await db.doc(`users/${caller.uid}`).get();
  if (callerDoc.data()?.role !== 'principal') throw new Error('Forbidden');

  const { userId, role, department, year, section } = request.data;
  if (!userId || !role || !department || !year || !section) throw new Error('Missing fields');

  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error('User not found');

  await userRef.update({
    role, department, year, section,
    approvalStatus: 'approved',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Auto-create section group chat if not exists
  const classId = `${department}-${year}-${section}`;
  const groupRef = db.collection('chats/groups/meta');
  const existing = await db.collection('chats').doc('groups').collection('meta')
    .where('classId', '==', classId).limit(1).get();

  if (existing.empty) {
    await db.collection('chats').doc('groups').collection('meta').add({
      groupName: `${department} ${year}${section}`,
      classId, members: [userId],
      createdAt: FieldValue.serverTimestamp(),
      createdBy: caller.uid,
      type: 'section',
    });
  } else {
    await existing.docs[0].ref.update({ members: FieldValue.arrayUnion(userId) });
  }

  // Push notification to approved user
  const userData = userSnap.data();
  if (userData.fcmToken) {
    try {
      await messaging.send({
        token: userData.fcmToken,
        notification: { title: 'Account Approved! 🎉', body: `Welcome to KingstonConnect! You are now a ${role} in ${department}.` },
      });
    } catch (_) {}
  }

  return { success: true };
});
