import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // Firebase auth user
  const [profile, setProfile] = useState(null);   // Firestore user doc
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // When user changes, subscribe to their Firestore profile
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Email / Password signup
  const signupWithEmail = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Create pending user doc
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: displayName,
      email,
      phone: '',
      role: 'student',
      department: '',
      year: '',
      section: '',
      registerNumber: '',
      encryptedGeminiKey: '',
      approvalStatus: 'pending',
      fcmToken: '',
      profilePhotoURL: '',
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      preferences: defaultPreferences(),
    });
    return cred;
  };

  const loginWithEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);
  const requestPhoneOtp = async (phoneNumber, recaptchaContainerId = 'recaptcha-container') => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
    }
    return signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
  };

  const verifyPhoneOtp = async (verificationId, otp) => {
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    return signInWithCredential(auth, credential);
  };

  // Derived helpers
  const isApproved = profile?.approvalStatus === 'approved';
  const isPending  = profile?.approvalStatus === 'pending';
  const role       = profile?.role || 'student';
  const isTeacher  = ['teacher', 'hod', 'principal'].includes(role);
  const isHod      = ['hod', 'principal'].includes(role);
  const isPrincipal = role === 'principal';

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signupWithEmail, loginWithEmail, logout, resetPassword,
      requestPhoneOtp, verifyPhoneOtp,
      isApproved, isPending, role, isTeacher, isHod, isPrincipal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

function defaultPreferences() {
  return {
    theme: 'system',
    accentColor: '#F59E0B',
    fontSize: 'medium',
    language: 'en',
    notificationsEnabled: true,
    notificationTypes: {
      announcements: true, chatP2P: true, chatGroup: true,
      results: true, notes: true, leave: true, events: true,
      achievements: true, calendar: true,
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
  };
}
