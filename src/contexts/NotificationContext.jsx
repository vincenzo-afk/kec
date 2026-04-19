import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getMessagingInstance } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isApproved } = useAuth();

  useEffect(() => {
    if (!user || !isApproved) return;
    let unsub;
    (async () => {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });
        if (token) {
          await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
          try {
            const fn = httpsCallable(functions, 'syncNotificationTopics');
            await fn({ token });
          } catch (e) {
            console.warn('Topic sync failed:', e);
          }
        }
      } catch (e) {
        console.warn('FCM token error:', e);
      }

      unsub = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (title) toast(body ? `${title}: ${body}` : title, { duration: 5000 });
      });
    })();
    return () => unsub?.();
  }, [user, isApproved]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
