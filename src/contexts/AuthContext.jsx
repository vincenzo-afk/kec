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
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // Firebase auth user
  const [profile, setProfile] = useState(null);   // Firestore user doc
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setProfileError(null);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      } else {
        setLoading(true);
      }
    });
    return unsub;
  }, []);

  // When user changes, subscribe to their Firestore profile
  useEffect(() => {
    if (!user) return undefined;

    const ref = doc(db, 'users', user.uid);
    let cancelled = false;
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Auth] Profile load timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000);
    
    const unsub = onSnapshot(ref, (snap) => {
      if (cancelled) return;
      
      clearTimeout(loadingTimeout);
      setProfileError(null);
      if (!snap.exists()) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile({ id: snap.id, ...snap.data() });
      setLoading(false);
    }, (error) => {
      if (cancelled) return;
      
      clearTimeout(loadingTimeout);
      console.error('[Auth] Failed to load user profile:', error);
      // Don't set profileError for permission errors during initial load
      // This allows the app to continue even if profile isn't immediately available
      if (error.code !== 'permission-denied') {
        setProfileError(error);
      }
      setProfile(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      unsub();
    };
  }, [user]);

  // Keep lastActive fresh for presence/online indicators
  useEffect(() => {
    if (!user || !profile) return undefined;

    const ref = doc(db, 'users', user.uid);
    let quotaExceeded = false;
    let backoffTime = 120000; // Start at 2 minutes
    const MAX_BACKOFF = 600000; // Max 10 minutes
    
    const tick = async () => {
      if (quotaExceeded) {
        // Skip update if we're in backoff mode
        return;
      }
      
      try {
        await updateDoc(ref, { lastActive: serverTimestamp() });
        // Reset backoff on success
        backoffTime = 120000;
        quotaExceeded = false;
      } catch (error) {
        if (error?.code === 'resource-exhausted') {
          // Quota exceeded - enter backoff mode
          quotaExceeded = true;
          console.warn('[Auth] Quota exceeded, pausing lastActive updates');
          
          // Retry after backoff period
          setTimeout(() => {
            quotaExceeded = false;
            backoffTime = Math.min(backoffTime * 2, MAX_BACKOFF);
          }, backoffTime);
        } else if (error?.code !== 'permission-denied') {
          console.warn('[Auth] Failed to update lastActive:', error);
        }
      }
    };

    tick();
    const id = setInterval(tick, 120000); // Update every 2 minutes
    return () => clearInterval(id);
  }, [user, profile]);

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
      approvalStatus: 'pending',
      fcmToken: '',
      profilePhotoURL: '',
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      preferences: defaultPreferences(),
    });
    return cred;
  };

  const loginWithEmail = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profileSnap = await getDoc(doc(db, 'users', cred.user.uid));
      const prefs = profileSnap.exists() ? (profileSnap.data().preferences || {}) : {};
      if (prefs.twoFactorEnabled === true && !cred.user.phoneNumber) {
        await signOut(auth);
        throw new Error('2FA is enabled. Use phone OTP login.');
      }
      return cred;
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (user) {
      // Make Firestore update non-blocking - don't wait for it
      updateDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() })
        .catch(() => {}); // Silently ignore errors
    }
    // Immediately sign out without waiting
    return signOut(auth);
  };

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);
  const requestPhoneOtp = async (phoneNumber, recaptchaContainerId = 'recaptcha-container') => {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (_) {}
      window.recaptchaVerifier = null;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
    await window.recaptchaVerifier.render();
    return signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
  };

  const verifyPhoneOtp = async (verificationId, otp) => {
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    return signInWithCredential(auth, credential);
  };

  // Derived helpers
  const isApproved = profile?.approvalStatus === 'approved';
  // If user exists but no profile exists in Firestore, treat as pending
  const isPending  = !!user && (!profile || profile.approvalStatus === 'pending');
  const role       = profile?.role || 'student';
  const isTeacher  = ['teacher', 'hod', 'principal'].includes(role);
  const isHod      = ['hod', 'principal'].includes(role);
  const isPrincipal = role === 'principal';

  return (
    <AuthContext.Provider value={{
      user, profile, loading, profileError,
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
    twoFactorEnabled: false,
  };
}
