import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    await updateDoc(doc(db, 'users', user.uid), {
      [`preferences.${key}`]: value,
      lastActive: serverTimestamp(),
    });
  }, [user]);

  const updatePreferences = useCallback(async (prefs) => {
    if (!user) return;
    const updates = {};
    for (const [k, v] of Object.entries(prefs)) {
      updates[`preferences.${k}`] = v;
    }
    await updateDoc(doc(db, 'users', user.uid), { ...updates, lastActive: serverTimestamp() });
  }, [user]);

  return {
    preferences: profile?.preferences || {},
    updatePreference,
    updatePreferences,
  };
}
