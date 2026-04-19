import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

/**
 * Hook to update user preferences in Firestore
 */
export function usePreferences() {
  const { user, profile } = useAuth();

  const updatePreference = useCallback(async (key, value) => {
    if (!user) return;
    const updateObj = { [`preferences.${key}`]: value, lastActive: serverTimestamp() };
    try {
      await updateDoc(doc(db, 'users', user.uid), updateObj);
    } catch {
      await setDoc(doc(db, 'users', user.uid), updateObj, { merge: true });
    }
  }, [user]);

  const updatePreferences = useCallback(async (prefs) => {
    if (!user) return;
    const flattened = Object.entries(prefs || {}).reduce((acc, [k, v]) => {
      acc[`preferences.${k}`] = v;
      return acc;
    }, {});
    const payload = {
      ...flattened,
      lastActive: serverTimestamp(),
    };
    try {
      await updateDoc(doc(db, 'users', user.uid), payload);
    } catch {
      await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
    }
  }, [user]);

  return {
    preferences: profile?.preferences || {},
    updatePreference,
    updatePreferences,
  };
}
