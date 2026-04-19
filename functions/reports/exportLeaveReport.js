const { onCall } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

exports.exportLeaveReport = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');

  const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
  const role = callerSnap.data()?.role;
  if (!['principal', 'hod'].includes(role)) throw new Error('Forbidden');

  const { startDate, endDate, department } = request.data || {};

  let q = db.collection('leaveApplications').orderBy('appliedAt', 'desc').limit(1000);

  const snap = await q.get();
  const records = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      classId: data.classId,
      fromDate: data.fromDate,
      toDate: data.toDate,
      type: data.type,
      reason: data.reason,
      status: data.status,
      daysCount: data.daysCount,
      appliedAt: data.appliedAt?.toDate?.()?.toISOString() || null,
      reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || null,
      reviewNote: data.reviewNote || null,
    };
  });

  return { records, exportedAt: new Date().toISOString(), total: records.length };
});
