import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isApproved } = useAuth();

  useEffect(() => {
    if (!user || !isApproved) return;
    // Push notifications removed for Supabase migration
    console.warn('[Notifications] Firebase FCM disabled due to Supabase migration.');
    return () => {};
  }, [user, isApproved]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
