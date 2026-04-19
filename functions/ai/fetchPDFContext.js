const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const db = getFirestore();
const storage = getStorage();

/**
 * Fetches the latest 3 notes for the student's section and downloads them as base64 
 * inline data parts suitable for the Gemini API.
 */
async function fetchPDFContext(user) {
  if (!user || !user.department || !user.year || !user.section) return [];

  // Get the latest notes metadata for this specific section
  const notesSnap = await db.collection('notes')
    .where('department', '==', user.department)
    .where('year', '==', user.year)
    .where('section', '==', user.section)
    .orderBy('uploadedAt', 'desc')
    .limit(3)
    .get();

  if (notesSnap.empty) return [];

  const parts = [];
  const bucket = storage.bucket();

  for (const doc of notesSnap.docs) {
    const note = doc.data();
    if (note.mimeType === 'application/pdf') {
      try {
        let storagePath = note.storagePath || null;
        if (!storagePath && note.fileURL?.includes('/o/')) {
          storagePath = decodeURIComponent(note.fileURL.split('/o/')[1].split('?')[0]);
        }
        if (!storagePath) continue;
        
        const file = bucket.file(storagePath);
        const [buffer] = await file.download();
        
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: buffer.toString('base64')
          }
        });
      } catch (err) {
        console.error(`Failed to fetch note ${note.title}:`, err);
      }
    }
  }

  return parts;
}

exports.fetchPDFContext = fetchPDFContext;
