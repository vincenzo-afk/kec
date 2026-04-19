import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'kingstonconnect';
const RULES = readFileSync('firestore.rules', 'utf8');

let env;

async function seedUser(uid, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), data);
  });
}

async function seedDoc(path, data) {
  const segments = path.split('/');
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), ...segments), data);
  });
}

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES },
  });

  await seedUser('student1', {
    role: 'student',
    approvalStatus: 'approved',
    department: 'CSE',
    year: '2',
    section: 'A',
    preferences: { crossDepartmentChat: false },
  });
  await seedUser('student2', {
    role: 'student',
    approvalStatus: 'approved',
    department: 'ECE',
    year: '2',
    section: 'A',
    preferences: { crossDepartmentChat: false },
  });
  await seedUser('teacher1', {
    role: 'teacher',
    approvalStatus: 'approved',
    department: 'CSE',
    year: '2',
    section: 'A',
    preferences: {},
  });

  await seedDoc('announcements/a1', {
    title: 'Demo',
    body: 'Body',
    postedBy: 'teacher1',
    readBy: [],
    scope: 'section',
  });

  await seedDoc('p2pMeta/s1-s2', {
    members: ['student1', 'student2'],
    lastMessage: 'hi',
    unreadBy: { student1: 0, student2: 1 },
  });

  await seedDoc('events/e1', {
    title: 'Event',
    registrations: [],
    status: 'upcoming',
  });
});

test.after(async () => {
  await env.cleanup();
});

test('student can only add self to announcement readBy', async () => {
  const db = env.authenticatedContext('student1').firestore();
  await assertSucceeds(updateDoc(doc(db, 'announcements', 'a1'), { readBy: ['student1'] }));
  await assertFails(updateDoc(doc(db, 'announcements', 'a1'), { body: 'hacked' }));
});

test('student cannot create public calendar event but can create personal', async () => {
  const db = env.authenticatedContext('student1').firestore();
  await assertFails(setDoc(doc(db, 'calendar', 'c1'), {
    title: 'Holiday', visibility: 'public', createdBy: 'student1', date: '2026-04-20', type: 'holiday'
  }));
  await assertSucceeds(setDoc(doc(db, 'calendar', 'c2'), {
    title: 'Personal note', visibility: 'personal', createdBy: 'student1', date: '2026-04-20', type: 'personal'
  }));
});

test('p2pMeta requires membership and disallows changing members', async () => {
  const outsider = env.authenticatedContext('teacher1').firestore();
  await assertFails(updateDoc(doc(outsider, 'p2pMeta', 's1-s2'), { lastMessage: 'x' }));

  const member = env.authenticatedContext('student1').firestore();
  await assertSucceeds(updateDoc(doc(member, 'p2pMeta', 's1-s2'), { lastMessage: 'new text' }));
  await assertFails(updateDoc(doc(member, 'p2pMeta', 's1-s2'), { members: ['student1', 'teacher1'] }));
});

test('student can only update event registrations field', async () => {
  const db = env.authenticatedContext('student1').firestore();
  await assertSucceeds(updateDoc(doc(db, 'events', 'e1'), { registrations: ['student1'] }));
  await assertFails(updateDoc(doc(db, 'events', 'e1'), { title: 'Changed by student' }));
});
