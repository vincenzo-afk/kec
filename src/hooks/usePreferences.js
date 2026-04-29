import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

/**
 * Hook to update user preferences in Supabase
 */
export function usePreferences() {
  const { user, profile } = useAuth();

  const updatePreference = useCallback(async (key, value) => {
    if (!user) return;
    
    // In Supabase, preferences is a JSONB column. We need to fetch it first, update the key, then update the DB.
    // Or we could try using a DB function if we set one up, but for now we'll do read-modify-write.
    try {
      const { data, error } = await supabase.from('users').select('preferences').eq('id', user.id).single();
      if (error) throw error;
      
      const newPrefs = { ...(data.preferences || {}), [key]: value };
      
      await supabase.from('users').update({ 
        preferences: newPrefs,
        lastActive: new Date().toISOString()
      }).eq('id', user.id);
    } catch (err) {
      console.error('Failed to update preference', err);
    }
  }, [user]);

  const updatePreferences = useCallback(async (prefs) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('users').select('preferences').eq('id', user.id).single();
      if (error) throw error;
      
      const newPrefs = { ...(data.preferences || {}), ...prefs };
      
      await supabase.from('users').update({ 
        preferences: newPrefs,
        lastActive: new Date().toISOString()
      }).eq('id', user.id);
    } catch (err) {
      console.error('Failed to update preferences', err);
    }
  }, [user]);

  return {
    preferences: profile?.preferences || {},
    updatePreference,
    updatePreferences,
  };
}
