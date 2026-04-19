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
        // Construct the file path as stored in Firebase Storage
        // The fileURL might be a download URL, but we need the bucket path to download internally
        // In the README: /notes/{dept}/{year}/{section}/{subject}/{filename}
        
        // Try to parse the filename from the URL or just query by prefix if needed
        // Assuming fileURL contains the path or we saved the path.
        // Actually, let's just extract the path from the un-encoded download URL
        let storagePath = decodeURIComponent(note.fileURL.split('/o/')[1].split('?alt=media')[0]);
        
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
