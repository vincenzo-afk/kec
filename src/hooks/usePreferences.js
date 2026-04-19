import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
    const updateObj = key.includes('.')
      ? { [`preferences.${key}`]: value }
      : { [`preferences.${key}`]: value };
    await setDoc(doc(db, 'users', user.uid), {
      ...updateObj,
      lastActive: serverTimestamp(),
    }, { merge: true });
  }, [user]);

  const updatePreferences = useCallback(async (prefs) => {
    if (!user) return;
    const flattened = Object.entries(prefs || {}).reduce((acc, [k, v]) => {
      acc[`preferences.${k}`] = v;
      return acc;
    }, {});
    await setDoc(doc(db, 'users', user.uid), {
      ...flattened,
      lastActive: serverTimestamp()
    }, { merge: true });
  }, [user]);

  return {
    preferences: profile?.preferences || {},
    updatePreference,
    updatePreferences,
  };
}
