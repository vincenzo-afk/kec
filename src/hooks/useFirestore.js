import {
  collection, doc, query, where, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useCallback } from 'react';

/**
 * Core Firestore helpers — thin wrappers used across all screens
 */
export function useFirestore() {

  // ── Generic real-time collection listener ──
  const subscribe = useCallback((collectionPath, constraints = [], callback) => {
    const ref = collection(db, collectionPath);
    const q = query(ref, ...constraints);
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ── Single-doc listener ──
  const subscribeDoc = useCallback((path, callback) => {
    return onSnapshot(doc(db, path), (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, []);

  // ── Add document ──
  const addDocument = useCallback(async (collectionPath, data) => {
    return addDoc(collection(db, collectionPath), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }, []);

  // ── Update document ──
  const updateDocument = useCallback(async (collectionPath, id, data) => {
    return updateDoc(doc(db, collectionPath, id), data);
  }, []);

  // ── Delete document ──
  const deleteDocument = useCallback(async (collectionPath, id) => {
    return deleteDoc(doc(db, collectionPath, id));
  }, []);

  // ── Fetch once ──
  const fetchCollection = useCallback(async (collectionPath, constraints = []) => {
    const ref = collection(db, collectionPath);
    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, []);

  const fetchDoc = useCallback(async (collectionPath, id) => {
    const snap = await getDoc(doc(db, collectionPath, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  return {
    db, collection, doc, query, where, orderBy, limit,
    subscribe, subscribeDoc, addDocument, updateDocument, deleteDocument,
    fetchCollection, fetchDoc, writeBatch, serverTimestamp,
  };
}
