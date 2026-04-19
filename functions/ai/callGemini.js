const { onCall } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const https = require('https');
const { fetchPDFContext } = require('./fetchPDFContext');

const db      = getFirestore();
const ALGO    = 'aes-256-gcm';

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

async function buildAIContext(userId, options = {}) {
  const userSnap = await db.doc(`users/${userId}`).get();
  const user = userSnap.data();
  if (!user) return {};

  const classId = `${user.department}-${user.year}-${user.section}`;
  const context = { user: { name: user.name, year: user.year, department: user.department, section: user.section, personality: user.preferences?.studyGptPersonality || 'friendly' } };

  if (options.includeAttendance !== false) {
    const attSnap = await db.collection('attendance').where('studentId', '==', userId).orderBy('date', 'desc').limit(100).get();
    const records = attSnap.docs.map(d => d.data());
    const present = records.filter(r => r.status === 'present').length;
    
    // Subject-wise grouping
    const subjects = {};
    records.forEach(r => {
      if (!subjects[r.subject]) subjects[r.subject] = { total: 0, present: 0 };
      subjects[r.subject].total++;
      if (r.status === 'present') subjects[r.subject].present++;
    });
    
    const subjectWise = {};
    Object.keys(subjects).forEach(s => {
      subjectWise[s] = Math.round(subjects[s].present / subjects[s].total * 100) + '%';
    });

    context.attendance = { 
      overall: records.length ? Math.round(present / records.length * 100) + '%' : 'N/A', 
      subjectWise 
    };
  }

  if (options.includeResults !== false) {
    const resSnap = await db.collection('results').where('classId', '==', classId).orderBy('createdAt', 'desc').limit(3).get();
    context.results = resSnap.docs.map(d => {
      const r = d.data();
      const score = r.marksMap?.[userId];
      return { testName: r.testName, subject: r.subject, score, maxMarks: r.maxMarks };
    });
  }

  // Leave Status
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const leaveSnap = await db.collection('leaveApplications')
    .where('studentId', '==', userId)
    .where('appliedAt', '>=', startOfMonth)
    .get();
  
  let pendingLeaves = 0;
  let approvedLeaves = 0;
  leaveSnap.docs.forEach(d => {
    const l = d.data();
    if (l.status === 'pending') pendingLeaves += l.daysCount;
    if (l.status === 'approved') approvedLeaves += l.daysCount;
  });
  context.leaveStatus = { pendingDays: pendingLeaves, approvedDaysThisMonth: approvedLeaves };

  if (options.includeCalendar !== false) {
    const calSnap = await db.collection('calendar').where('date', '>=', new Date().toISOString().split('T')[0]).orderBy('date').limit(7).get();
    context.calendar = calSnap.docs.map(d => d.data());
  }

  // Announcements
  // Avoid compound query requiring composite index and 'in' query with null
  const annSnap = await db.collection('announcements')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();
  context.announcements = annSnap.docs
    .map(d => d.data())
    .filter((a) => {
      if (a.scope === 'college-wide') return true;
      if (a.scope === 'section') return !a.targetSection || a.targetSection === user.section;
      if (a.scope === 'department') return !a.targetDept || a.targetDept === user.department;
      return true;
    })
    .slice(0, 2)
    .map(a => a.title);

  // Registered Events
  const eventsSnap = await db.collection('events')
    .where('registrations', 'array-contains', userId)
    .where('date', '>=', new Date().toISOString().split('T')[0])
    .limit(3)
    .get();
  context.registeredEvents = eventsSnap.docs.map(d => d.data().title);

  return context;
}

exports.callGemini = onCall({ enforceAppCheck: false, timeoutSeconds: 120 }, async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');
  const uid = request.auth.uid;
  const { message, includeContext = true, contextPreferences = null } = request.data;
  if (!message) throw new Error('No message provided');

  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data();
  if (!userData?.encryptedGeminiKey) throw new Error('No API key configured. Set your Gemini key in Settings.');

  const apiKey = decrypt(userData.encryptedGeminiKey);
  const mergedPrefs = {
    ...(userData.preferences || {}),
    ...(contextPreferences || {}),
  };
  const context = includeContext ? await buildAIContext(uid, mergedPrefs) : { user: { name: userData.name } };

  const personality = context.user?.personality || 'friendly';
  const personalityPrompts = {
    formal: 'Respond formally and professionally.',
    friendly: 'Respond in a warm, encouraging, friendly manner.',
    tutor: 'Respond like a patient tutor explaining concepts step by step.',
  };

  const systemPrompt = `You are KingstonConnect AI, a personalised academic assistant for ${context.user?.name}, a Year ${context.user?.year} ${context.user?.department} student at Kingston Engineering College, Section ${context.user?.section}. ${personalityPrompts[personality]} Respond in the same language the student used.

STUDENT CONTEXT:
- Overall Attendance: ${context.attendance?.overall ?? 'N/A'}
- Subject-wise Attendance: ${JSON.stringify(context.attendance?.subjectWise || {})}
- Last 3 Test Scores: ${JSON.stringify(context.results || [])}
- Leave Status: Pending ${context.leaveStatus?.pendingDays || 0} days, Approved ${context.leaveStatus?.approvedDaysThisMonth || 0} days this month
- Upcoming Calendar Events (next 7 days): ${JSON.stringify(context.calendar || [])}
- Latest Announcements: ${JSON.stringify(context.announcements || [])}
- Registered Events: ${JSON.stringify(context.registeredEvents || [])}`;

  const messageParts = [{ text: message }];

  if (includeContext && mergedPrefs?.includeNotes !== false) {
    const pdfParts = await fetchPDFContext(userData);
    if (pdfParts && pdfParts.length > 0) {
      messageParts.push({ text: "\n\nSECTION NOTES (Attached for context):\n" });
      pdfParts.forEach(p => messageParts.push(p));
    }
  }

  const payload = JSON.stringify({
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood! I\'m ready to help.' }] },
      { role: 'user', parts: messageParts },
    ],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
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
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) resolve(text);
          else reject(new Error(json.error?.message || 'No response from Gemini'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  return { reply };
});
