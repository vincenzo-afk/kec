/**
 * Setup Principal Account Script
 * 
 * This script ensures a principal user exists in Firebase with proper permissions.
 * Run this after creating a user in Firebase Authentication.
 * 
 * Usage:
 * 1. Create a user in Firebase Console → Authentication
 * 2. Copy their UID
 * 3. Run: node scripts/setup-principal.mjs <uid> <email> <name>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '..', 'service-account.json');

let adminConfig;
try {
  adminConfig = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
} catch (error) {
  console.error('❌ Error: service-account.json not found!');
  console.error('');
  console.error('To get your service account key:');
  console.error('1. Go to https://console.firebase.google.com/project/kec-26/settings/serviceaccounts/adminsdk');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the downloaded JSON as "service-account.json" in the project root');
  console.error('4. Run this script again');
  process.exit(1);
}

initializeApp({
  credential: cert(adminConfig),
});

const db = getFirestore();

async function setupPrincipal(uid, email, name) {
  console.log(`🔧 Setting up principal account...`);
  console.log(`   UID: ${uid}`);
  console.log(`   Email: ${email}`);
  console.log(`   Name: ${name}`);
  console.log('');

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();

  const userData = {
    name: name || 'Principal Admin',
    email: email,
    phone: '',
    role: 'principal',
    department: 'ADMIN',
    year: '',
    section: '',
    registerNumber: '',
    encryptedGeminiKey: '',
    approvalStatus: 'approved',
    fcmToken: '',
    profilePhotoURL: '',
    preferences: {
      theme: 'system',
      accentColor: '#F59E0B',
      fontSize: 'medium',
      language: 'en',
      notificationsEnabled: true,
      notificationTypes: {
        announcements: true,
        chatP2P: true,
        chatGroup: true,
        results: true,
        notes: true,
        leave: true,
        events: true,
        achievements: true,
        calendar: true,
      },
      chatBubbleStyle: 'modern',
      dashboardLayout: 'grid',
      calendarStartDay: 'sun',
      compactMode: false,
      aiResponseLanguage: 'auto',
      showAttendanceWarning: true,
      attendanceWarningThreshold: 75,
      studyGptPersonality: 'friendly',
      showAchievementsOnDashboard: true,
      twoFactorEnabled: false,
      crossDepartmentChat: true,
    },
    createdAt: userSnap.exists ? userSnap.data().createdAt : new Date(),
    lastActive: new Date(),
    updatedAt: new Date(),
  };

  await userRef.set(userData, { merge: true });

  console.log('✅ Principal account setup successful!');
  console.log('');
  console.log('You can now log in with:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: (the password you set in Firebase Console)`);
  console.log('');
  console.log('The account has:');
  console.log('   ✓ Role: principal');
  console.log('   ✓ Approval Status: approved');
  console.log('   ✓ Full admin access');
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Usage: node scripts/setup-principal.mjs <uid> <email> [name]');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/setup-principal.mjs abc123xyz principal@kec.edu.in "Dr. Principal"');
  process.exit(1);
}

const [uid, email, name] = args;

setupPrincipal(uid, email, name).catch((error) => {
  console.error('❌ Error setting up principal:', error);
  process.exit(1);
});
