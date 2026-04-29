import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
      } else {
        setLoading(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (cancelled) return;
        
        if (error) {
          if (error.code !== 'PGRST116') {
            setProfileError(error);
          }
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          setProfileError(err);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();

    const channel = supabase.channel(`public:users:id=eq.${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, payload => {
        if (payload.eventType === 'DELETE') {
          setProfile(null);
        } else {
          setProfile(payload.new);
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    
    let quotaExceeded = false;
    const tick = async () => {
      if (quotaExceeded) return;
      try {
        await supabase.from('users').update({ lastActive: new Date().toISOString() }).eq('id', user.id);
      } catch (error) {
        console.warn('[Auth] Failed to update lastActive:', error);
      }
    };

    tick();
    const id = setInterval(tick, 120000);
    return () => clearInterval(id);
  }, [user, profile]);

  const signupWithEmail = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    
    if (data?.user) {
      const { error: profileError } = await supabase.from('users').insert([{
        id: data.user.id,
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
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        preferences: defaultPreferences(),
      }]);
      if (profileError) throw profileError;
    }
    return data;
  };

  const loginWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    const { data: profileSnap } = await supabase.from('users').select('preferences').eq('id', data.user.id).single();
    const prefs = profileSnap?.preferences || {};
    if (prefs.twoFactorEnabled === true && !data.user.phone) {
      await supabase.auth.signOut();
      throw new Error('2FA is enabled. Use phone OTP login.');
    }
    return data;
  };

  const logout = async () => {
    if (user) {
      await supabase.from('users').update({ lastActive: new Date().toISOString() }).eq('id', user.id).catch(() => {});
    }
    return supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const requestPhoneOtp = async (phone) => {
    const { data, error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
    return data; // returning this so UI can just track the phone number state
  };

  const verifyPhoneOtp = async (phone, otp) => {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    if (error) throw error;
    return data;
  };

  const isApproved = profile?.approvalStatus === 'approved';
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
