import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for calling the Gemini Cloud Function (StudyGPT)
 */
export function useGemini() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callGemini = useCallback(async (message, options = {}) => {
    if (!user) throw new Error('Not authenticated');
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'callGemini');
      const result = await fn({ message, ...options });
      return result.data;
    } catch (e) {
      setError(e.message || 'Gemini call failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const encryptApiKey = useCallback(async (apiKey) => {
    const fn = httpsCallable(functions, 'encryptApiKey');
    return fn({ apiKey });
  }, []);

  const clearApiKey = useCallback(async () => {
    const fn = httpsCallable(functions, 'encryptApiKey');
    return fn({ apiKey: null });
  }, []);

  return { callGemini, encryptApiKey, clearApiKey, loading, error };
}
