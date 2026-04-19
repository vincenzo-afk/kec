/* eslint-disable no-undef */
// Firebase Cloud Messaging service worker.
// This file must live at the site root (`/firebase-messaging-sw.js`).

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDUuI5t7juP8nkzLoYtzUtQ8QM9M5VWQ6U',
  authDomain: 'kec-26.firebaseapp.com',
  projectId: 'kec-26',
  storageBucket: 'kec-26.firebasestorage.app',
  messagingSenderId: '402679461069',
  appId: '1:402679461069:web:12e66ce57311a3bfcae584',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'KingstonConnect';
  const options = {
    body: payload?.notification?.body,
    icon: '/favicon.svg',
    data: payload?.data,
  };
  self.registration.showNotification(title, options);
});

