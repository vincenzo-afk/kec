const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

async function sendPush(token, title, body) {
  if (!token) return;
  try {
    await messaging.send({ token, notification: { title, body } });
  } catch (_) {}
}

// onLeaveApply — notify teacher when student applies
exports.onLeaveApply = onDocumentCreated('leaveApplications/{leaveId}', async (event) => {
  const leave = event.data?.data();
  if (!leave) return;

  const studentSnap = await db.doc(`users/${leave.studentId}`).get();
  const student = studentSnap.data();

  // Find teacher for this classId
  const teachersSnap = await db.collection('users')
    .where('role', '==', 'teacher')
    .where('department', '==', student?.department)
    .where('year', '==', student?.year)
    .where('section', '==', student?.section)
    .limit(1).get();

  if (!teachersSnap.empty) {
    const teacher = teachersSnap.docs[0].data();
    // Update leave with teacherId
    await event.data.ref.update({ teacherId: teachersSnap.docs[0].id });
    await sendPush(teacher.fcmToken, '📋 New Leave Request', `${student?.name} applied for ${leave.daysCount} day(s) leave`);
  }
});

// onLeaveReview — notify student + auto-reflect attendance if approved
exports.onLeaveReview = onDocumentUpdated('leaveApplications/{leaveId}', async (event) => {
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();
  if (!after || before?.status === after?.status) return;

  const studentSnap = await db.doc(`users/${after.studentId}`).get();
  const studentToken = studentSnap.data()?.fcmToken;

  if (after.status === 'approved') {
    await sendPush(studentToken, '✅ Leave Approved', `Your leave from ${after.fromDate} to ${after.toDate} has been approved.`);
    // Auto-reflect attendance
    const { fromDate, toDate, studentId } = after;
    const leaveId = event.params.leaveId;
    let curr = new Date(fromDate);
    const end = new Date(toDate);
    const batch = db.batch();
    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const ref = db.collection('attendance').doc(`${studentId}_${dateStr}_leave`);
      batch.set(ref, {
        studentId, date: dateStr, status: 'leave',
        classId: after.classId, subject: 'ALL',
        markedBy: 'system', leaveRef: leaveId,
        timestamp: FieldValue.serverTimestamp(),
      }, { merge: true });
      curr.setDate(curr.getDate() + 1);
    }
    await batch.commit();
    await event.data.after.ref.update({ autoReflected: true });
  } else if (after.status === 'rejected') {
    await sendPush(studentToken, '❌ Leave Rejected', `Your leave request was rejected. ${after.reviewNote ? 'Note: ' + after.reviewNote : ''}`);
  }
});
