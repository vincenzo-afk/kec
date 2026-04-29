import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { firebaseReady } from './firebase';
import './utils/consoleFilter'; // Suppress non-critical dev errors
import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

function renderApp() {
  // In development, disable StrictMode to prevent double-mounting Firestore listeners
  // which causes "quota exceeded" errors
  const Wrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode;
  
  root.render(
    <Wrapper>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3500,
                  style: {
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--font-size-sm)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-md)',
                  },
                }}
              />
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </Wrapper>
  );
}

firebaseReady.finally(renderApp);

// Only register the app shell service worker in production builds.
// In dev it can interfere with Vite + emulator network traffic.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
