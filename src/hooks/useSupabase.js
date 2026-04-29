import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

export function useSupabase() {
  const subscribe = useCallback((table, buildQuery, callback) => {
    let currentData = [];
    
    const fetchInitial = async () => {
      let q = supabase.from(table).select('*');
      if (buildQuery) q = buildQuery(q);
      const { data, error } = await q;
      if (!error && data) {
        currentData = data;
        callback([...currentData]);
      }
    };
    
    fetchInitial();

    const channel = supabase.channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, (payload) => {
        if (payload.eventType === 'INSERT') {
          currentData = [payload.new, ...currentData];
        } else if (payload.eventType === 'UPDATE') {
          currentData = currentData.map(item => item.id === payload.new.id ? payload.new : item);
        } else if (payload.eventType === 'DELETE') {
          currentData = currentData.filter(item => item.id !== payload.old.id);
        }
        callback([...currentData]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addDocument = useCallback(async (table, data) => {
    return supabase.from(table).insert([data]).select();
  }, []);

  const updateDocument = useCallback(async (table, id, data) => {
    return supabase.from(table).update(data).eq('id', id);
  }, []);

  const deleteDocument = useCallback(async (table, id) => {
    return supabase.from(table).delete().eq('id', id);
  }, []);

  const fetchCollection = useCallback(async (table, buildQuery) => {
    let q = supabase.from(table).select('*');
    if (buildQuery) q = buildQuery(q);
    const { data } = await q;
    return data || [];
  }, []);

  const fetchDoc = useCallback(async (table, id) => {
    const { data } = await supabase.from(table).select('*').eq('id', id).single();
    return data;
  }, []);

  return {
    subscribe, addDocument, updateDocument, deleteDocument, fetchCollection, fetchDoc
  };
}
