/**
 * Direct Firestore REST API bypass
 * Used when the Firestore SDK is having connection issues
 */

import { auth } from '../firebase';

/**
 * Update a Firestore document directly via REST API
 * @param {string} documentPath - e.g., 'users/V4YEkHDxRxMr2WGgjUVzsX7FBE22'
 * @param {Object} data - Fields to update
 */
export async function directFirestoreUpdate(documentPath, data) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const token = await user.getIdToken();
  const projectId = 'kec-26';
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  
  // Convert data to Firestore format
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null) {
      fields[key] = { nullValue: 'NULL_VALUE' };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { integerValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { 
        timestampValue: value.toISOString() 
      };
    } else {
      // For serverTimestamp, use request time
      fields[key] = { 
        timestampValue: new Date().toISOString() 
      };
    }
  }
  
  const response = await fetch(`${baseUrl}/${documentPath}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields,
      mask: {
        fieldPaths: Object.keys(data)
      }
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Firestore REST API error: ${error.error.message}`);
  }
  
  return await response.json();
}
