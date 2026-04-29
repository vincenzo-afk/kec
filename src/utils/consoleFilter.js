/**
 * Console Error Filter for Development
 * 
 * Suppresses known non-critical errors from browser extensions and Firebase
 * to keep the console clean during development.
 */

if (import.meta.env.DEV) {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalInfo = console.info;
  
  // Patterns to suppress
  const SUPPRESS_ERRORS = [
    /runtime\.lastError/,
    /Extension context invalidated/,
    /A listener indicated an asynchronous response/,
    /message channel closed/,
    /@firebase\/firestore.*Quota exceeded/,
    /Using maximum backoff delay/,
    /resource-exhausted/,
  ];
  
  const SUPPRESS_WARNINGS = [
    /@firebase\/firestore/,
    /Using maximum backoff delay/,
    /FCM token error/,
    /VAPID/,
    /applicationServerKey/,
  ];

  console.error = function(...args) {
    // ALWAYS show Approval errors
    const message = args.join(' ');
    if (message.includes('Approval') || message.includes('Admin')) {
      originalError.apply(console, args);
      return;
    }
    
    const shouldSuppress = SUPPRESS_ERRORS.some(pattern => pattern.test(message));
    
    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };

  console.warn = function(...args) {
    const message = args.join(' ');
    const shouldSuppress = SUPPRESS_WARNINGS.some(pattern => pattern.test(message));
    
    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };

  // Also filter console.log and console.info from Firebase
  console.log = function(...args) {
    const message = args.join(' ');
    const shouldSuppress = [
      /@firebase/,
      /\[Firebase\]/,
    ].some(pattern => pattern.test(message));
    
    if (!shouldSuppress) {
      originalLog.apply(console, args);
    }
  };

  console.info = function(...args) {
    const message = args.join(' ');
    const shouldSuppress = [
      /@firebase/,
    ].some(pattern => pattern.test(message));
    
    if (!shouldSuppress) {
      originalInfo.apply(console, args);
    }
  };

  console.info('[Dev] Console filter active - suppressing known non-critical errors');
}
