const { onCall } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const https = require('https');

const db = getFirestore();
const ALGO = 'aes-256-gcm';

function getKey() {
  const keyHex = process.env.AES_KEY;
  if (!keyHex || keyHex.length !== 64) throw new Error('AES_KEY env var must be 32-byte hex (64 chars)');
  return Buffer.from(keyHex, 'hex');
}

function decrypt(payload) {
  const key = getKey();
  const [ivHex, encHex, tagHex] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}

exports.submitAnonymousFeedback = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');
  const uid = request.auth.uid;
  const { text, targetType, targetName } = request.data;
  if (!text) throw new Error('Feedback text is required');

  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data();
  if (!userData) throw new Error('User not found');
  
  const department = userData.department || 'General';

  let sentiment = 'Neutral';
  let topic = 'General';

  if (userData.encryptedGeminiKey) {
    try {
      const apiKey = decrypt(userData.encryptedGeminiKey);
      const prompt = `Analyze the following anonymous student feedback. Extract the overall sentiment (must be exactly one of: Positive, Neutral, Negative) and a short 1-3 word topic summary.
Feedback: "${text}"

Respond EXACTLY in this JSON format:
{"sentiment": "Positive|Neutral|Negative", "topic": "short topic string"}`;

      const payload = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
      });

      const reply = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        }, (res) => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (responseText) resolve(responseText);
              else reject(new Error('No response info'));
            } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      const cleanReply = reply.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanReply);
      sentiment = parsed.sentiment || 'Neutral';
      topic = parsed.topic || targetName || 'General';
    } catch (e) {
      console.error('Gemini Sentiment Analysis Error:', e);
    }
  }

  // Create document WITHOUT storing uid, ensuring total anonymity
  await db.collection('feedback').add({
    text,
    targetType: targetType || 'Facility', // 'Subject', 'Teacher', 'Facility'
    targetName: targetName || 'General',
    department,
    sentiment,
    topic,
    createdAt: FieldValue.serverTimestamp(),
    isRead: false
  });

  return { success: true, sentiment, topic };
});
