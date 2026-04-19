const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();

/**
 * Scheduled function to send reminders for upcoming tests.
 * Runs every day at 8:00 AM.
 */
exports.testReminder = onSchedule('0 8 * * *', async (event) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const snap = await db.collection('calendar')
    .where('type', '==', 'test')
    .where('date', '==', tomorrowStr)
    .get();

  if (snap.empty) return;

  const messaging = getMessaging();

  for (const doc of snap.docs) {
    const test = doc.data();
    const { targetDept, targetSection, title, subject } = test;

    // Send to members of the section/dept
    // We'll use a topic or fetch users. Topic is better for scale.
    // Assuming users subscribe to topics like 'section_CSE_4_A'
    const topic = targetSection 
      ? `section_${targetDept}_${test.targetYear || 'Any'}_${targetSection}`
      : `dept_${targetDept}`;

    await messaging.send({
      topic,
      notification: {
        title: `📝 Test Reminder: ${title}`,
        body: `Don't forget! You have a ${subject || 'test'} scheduled for tomorrow, ${tomorrowStr}.`,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        screen: 'Calendar',
      },
    }).catch(e => console.error('FCM failed:', e));
  }
});
