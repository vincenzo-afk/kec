import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'kec-26';

initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();

const users = [
  { id: 'student_demo_1', name: 'Demo Student', role: 'student', department: 'CSE', year: '2', section: 'A', approvalStatus: 'approved', email: 'student@example.com' },
  { id: 'teacher_demo_1', name: 'Demo Teacher', role: 'teacher', department: 'CSE', year: '2', section: 'A', approvalStatus: 'approved', email: 'teacher@example.com' },
  { id: 'hod_demo_1', name: 'Demo HOD', role: 'hod', department: 'CSE', year: '2', section: 'A', approvalStatus: 'approved', email: 'hod@example.com' },
  { id: 'principal_demo_1', name: 'Demo Principal', role: 'principal', department: 'Admin', year: '', section: '', approvalStatus: 'approved', email: 'principal@example.com' },
];

const now = new Date().toISOString().slice(0, 10);

for (const u of users) {
  await db.collection('users').doc(u.id).set({
    ...u,
    createdAt: new Date(),
    preferences: {
      notificationsEnabled: true,
      notificationTypes: { announcements: true, chatP2P: true },
      compactMode: false,
      dashboardLayout: 'grid',
    },
  }, { merge: true });
}

await db.collection('calendar').doc('demo_event_1').set({
  title: 'Demo Internal Test',
  type: 'test',
  visibility: 'section',
  targetDept: 'CSE',
  targetSection: 'A',
  date: now,
  createdBy: 'teacher_demo_1',
}, { merge: true });

await db.collection('announcements').doc('demo_announcement_1').set({
  title: 'Welcome to KingstonConnect Emulator',
  body: 'Seed data loaded successfully.',
  scope: 'section',
  targetDept: 'CSE',
  targetSection: 'A',
  pinned: true,
  readBy: [],
  timestamp: new Date(),
}, { merge: true });

console.log('Seeded emulator data successfully.');
