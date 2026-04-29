/**
 * Firestore Connection Manager
 * 
 * Prevents "quota exceeded" errors by limiting simultaneous Firestore connections.
 * Firebase has a limit of 100 concurrent connections on the free tier.
 */

const MAX_CONCURRENT_LISTENERS = 50;
const listeners = new Map();
let listenerCount = 0;

/**
 * Register a new Firestore listener
 * @param {string} id - Unique identifier for the listener
 * @param {Function} unsubscribe - Firestore unsubscribe function
 */
export function registerListener(id, unsubscribe) {
  if (listeners.has(id)) {
    // Already registered, replace it
    listeners.get(id)();
  }
  
  if (listenerCount >= MAX_CONCURRENT_LISTENERS) {
    console.warn(`[Firestore] Maximum listener limit (${MAX_CONCURRENT_LISTENERS}) reached. Oldest listener will be removed.`);
    // Remove the oldest listener
    const oldestKey = listeners.keys().next().value;
    if (oldestKey) {
      listeners.get(oldestKey)();
      listeners.delete(oldestKey);
      listenerCount--;
    }
  }
  
  listeners.set(id, unsubscribe);
  listenerCount++;
  
  if (import.meta.env.DEV) {
    console.log(`[Firestore] Active listeners: ${listenerCount}`);
  }
}

/**
 * Unregister a Firestore listener
 * @param {string} id - Unique identifier for the listener
 */
export function unregisterListener(id) {
  if (listeners.has(id)) {
    listeners.get(id)();
    listeners.delete(id);
    listenerCount--;
    
    if (import.meta.env.DEV) {
      console.log(`[Firestore] Active listeners: ${listenerCount}`);
    }
  }
}

/**
 * Get the current number of active listeners
 * @returns {number}
 */
export function getActiveListenerCount() {
  return listenerCount;
}

/**
 * Clear all listeners (useful for cleanup)
 */
export function clearAllListeners() {
  listeners.forEach((unsub) => unsub());
  listeners.clear();
  listenerCount = 0;
  console.info('[Firestore] All listeners cleared');
}
