const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const storage = getStorage();
const messaging = getMessaging();

const THRESHOLD_MB = parseInt(process.env.STORAGE_THRESHOLD_MB || '4096'); // 4 GB default

exports.storageMonitor = onSchedule('every 6 hours', async (event) => {
  const bucket = storage.bucket();
  const [files] = await bucket.getFiles();

  let totalBytes = 0;
  const fileList = [];

  for (const file of files) {
    const [meta] = await file.getMetadata();
    const size = parseInt(meta.size || 0);
    totalBytes += size;
    fileList.push({ file, size, updated: new Date(meta.updated) });
  }

  const usedMB = Math.round(totalBytes / (1024 * 1024));

  // Update system/storage doc
  await db.doc('system/storage').set({
    usedMB, fileCount: files.length,
    lastCheckedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // Auto-clean if over threshold
  if (usedMB > THRESHOLD_MB) {
    const sorted = fileList.sort((a, b) => a.updated - b.updated);
    const toDelete = sorted.slice(0, 20);

    for (const { file } of toDelete) {
      await file.delete().catch(() => {});
    }

    await db.doc('system/storage').update({
      lastCleanupAt: FieldValue.serverTimestamp(),
      usedMB: Math.max(0, usedMB - toDelete.reduce((s, f) => s + f.size, 0) / (1024 * 1024)),
    });

    // Notify principal
    const principalsSnap = await db.collection('users').where('role', '==', 'principal').where('approvalStatus', '==', 'approved').limit(5).get();
    const tokens = principalsSnap.docs.map(d => d.data().fcmToken).filter(Boolean);
    if (tokens.length) {
      await messaging.sendEachForMulticast({
        tokens,
        notification: { title: '⚠️ Storage Auto-Cleaned', body: `Usage was ${usedMB} MB. Deleted ${toDelete.length} oldest files.` },
      });
    }
  } else if (usedMB > THRESHOLD_MB * 0.8) {
    // Warn at 80%
    const principalsSnap = await db.collection('users').where('role', '==', 'principal').limit(1).get();
    const token = principalsSnap.docs[0]?.data()?.fcmToken;
    if (token) {
      await messaging.send({ token, notification: { title: '💾 Storage Warning', body: `Storage is at ${usedMB} MB (${Math.round(usedMB / THRESHOLD_MB * 100)}% of threshold)` } });
    }
  }
});
