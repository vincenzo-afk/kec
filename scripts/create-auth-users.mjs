#!/usr/bin/env node
/**
 * Create demo Firebase Auth users with fixed UIDs (for emulator).
 *
 * Prereq: Auth emulator running on 127.0.0.1:9099
 * Example:
 *   firebase emulators:start --only auth,firestore
 *   node scripts/create-auth-users.mjs
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'kec-26';

initializeApp({ projectId });
const auth = getAuth();

async function upsertUser(user) {
  try {
    await auth.createUser(user);
    console.log(`Created: ${user.uid} -> ${user.email}`);
  } catch (err) {
    if (err?.code === 'auth/uid-already-exists') {
      console.log(`Already exists: ${user.uid}`);
      return;
    }
    if (err?.code === 'auth/email-already-exists') {
      console.log(`Email already exists: ${user.email} (uid ${user.uid})`);
      return;
    }
    throw err;
  }
}

async function main() {
  console.log(`Project: ${projectId}`);
  console.log(`Auth emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);

  const users = [
    {
      uid: 'principal_demo_1',
      email: 'principal@kec.ac.in',
      password: 'demo1234',
      displayName: 'Dr. Principal',
    },
    {
      uid: 'hod_demo_1',
      email: 'hod@kec.ac.in',
      password: 'demo1234',
      displayName: 'Dr. HOD',
    },
    {
      uid: 'teacher_demo_1',
      email: 'teacher@kec.ac.in',
      password: 'demo1234',
      displayName: 'Prof. Teacher',
    },
    {
      uid: 'student_demo_1',
      email: 'student@kec.ac.in',
      password: 'demo1234',
      displayName: 'Arjun Student',
    },
  ];

  for (const user of users) {
    await upsertUser(user);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

