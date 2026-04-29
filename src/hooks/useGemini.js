import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

// Central Groq API key
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Hook for calling Groq AI directly from client
 * Uses central API key - no user key required
 */
export function useGemini() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buildAIContext = useCallback(async (userId, options = {}) => {
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!userData) return {};

    const classId = `${userData.department}-${userData.year}-${userData.section}`;
    const context = { 
      user: { 
        name: userData.name, 
        year: userData.year, 
        department: userData.department, 
        section: userData.section, 
        personality: userData.preferences?.studyGptPersonality || 'friendly' 
      } 
    };

    // Attendance
    if (options.includeAttendance !== false) {
      try {
        const { data: records, error } = await supabase.from('attendance')
          .select('*')
          .eq('studentId', userId)
          .order('date', { ascending: false })
          .limit(100);
          
        if (!error && records) {
          const present = records.filter(r => r.status === 'present').length;
          
          const subjects = {};
          records.forEach(r => {
            if (!subjects[r.subject]) subjects[r.subject] = { total: 0, present: 0 };
            subjects[r.subject].total++;
            if (r.status === 'present') subjects[r.subject].present++;
          });
          
          const subjectWise = {};
          Object.keys(subjects).forEach(s => {
            subjectWise[s] = Math.round(subjects[s].present / subjects[s].total * 100) + '%';
          });

          context.attendance = { 
            overall: records.length ? Math.round(present / records.length * 100) + '%' : 'N/A', 
            subjectWise 
          };
        }
      } catch (e) {
        console.warn('[AI] Failed to load attendance:', e);
      }
    }

    // Results
    if (options.includeResults !== false) {
      try {
        const { data: resDocs, error } = await supabase.from('results')
          .select('*')
          .eq('classId', classId)
          .order('createdAt', { ascending: false })
          .limit(3);
          
        if (!error && resDocs) {
          context.results = resDocs.map(r => {
            const score = r.marksMap?.[userId];
            return { testName: r.testName, subject: r.subject, score, maxMarks: r.maxMarks };
          });
        }
      } catch (e) {
        console.warn('[AI] Failed to load results:', e);
      }
    }

    // Leave Status
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: leaveDocs, error } = await supabase.from('leaveApplications')
        .select('*')
        .eq('studentId', userId)
        .gte('appliedAt', startOfMonth);
        
      if (!error && leaveDocs) {
        let pendingLeaves = 0;
        let approvedLeaves = 0;
        leaveDocs.forEach(l => {
          if (l.status === 'pending') pendingLeaves += l.daysCount;
          if (l.status === 'approved') approvedLeaves += l.daysCount;
        });
        context.leaveStatus = { pendingDays: pendingLeaves, approvedDaysThisMonth: approvedLeaves };
      }
    } catch (e) {
      console.warn('[AI] Failed to load leave status:', e);
    }

    // Calendar
    if (options.includeCalendar !== false) {
      try {
        const { data: calDocs, error } = await supabase.from('calendar')
          .select('*')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(7);
          
        if (!error && calDocs) {
          context.calendar = calDocs;
        }
      } catch (e) {
        console.warn('[AI] Failed to load calendar:', e);
      }
    }

    // Announcements
    try {
      const { data: annDocs, error } = await supabase.from('announcements')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
        
      if (!error && annDocs) {
        context.announcements = annDocs
          .filter((a) => {
            if (a.scope === 'college-wide') return true;
            if (a.scope === 'section') return !a.targetSection || a.targetSection === userData.section;
            if (a.scope === 'department') return !a.targetDept || a.targetDept === userData.department;
            return true;
          })
          .slice(0, 2)
          .map(a => a.title);
      }
    } catch (e) {
      console.warn('[AI] Failed to load announcements:', e);
    }

    // Events
    try {
      const { data: eventsDocs, error } = await supabase.from('events')
        .select('*')
        .contains('registrations', [userId])
        .gte('date', new Date().toISOString().split('T')[0])
        .limit(3);
        
      if (!error && eventsDocs) {
        context.registeredEvents = eventsDocs.map(d => d.title);
      }
    } catch (e) {
      console.warn('[AI] Failed to load events:', e);
    }

    return context;
  }, []);

  const callGemini = useCallback(async (message, options = {}) => {
    if (!user) throw new Error('Not authenticated');
    setLoading(true);
    setError(null);
    
    try {
      const context = options.includeContext ? await buildAIContext(user.id, options.contextPreferences) : { user: { name: profile?.name } };

      const personality = context.user?.personality || 'friendly';
      const personalityPrompts = {
        formal: 'Respond formally and professionally.',
        friendly: 'Respond in a warm, encouraging, friendly manner.',
        tutor: 'Respond like a patient tutor explaining concepts step by step.',
      };

      const systemPrompt = `You are KingstonConnect AI, a personalised academic assistant for ${context.user?.name}, a Year ${context.user?.year} ${context.user?.department} student at Kingston Engineering College, Section ${context.user?.section}. ${personalityPrompts[personality]} Respond in the same language the student used.

STUDENT CONTEXT:
- Overall Attendance: ${context.attendance?.overall ?? 'N/A'}
- Subject-wise Attendance: ${JSON.stringify(context.attendance?.subjectWise || {})}
- Last 3 Test Scores: ${JSON.stringify(context.results || [])}
- Leave Status: Pending ${context.leaveStatus?.pendingDays || 0} days, Approved ${context.leaveStatus?.approvedDaysThisMonth || 0} days this month
- Upcoming Calendar Events (next 7 days): ${JSON.stringify(context.calendar || [])}
- Latest Announcements: ${JSON.stringify(context.announcements || [])}
- Registered Events: ${JSON.stringify(context.registeredEvents || [])}`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get AI response');
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      
      if (!reply) {
        throw new Error('No response from AI');
      }

      return { reply };
    } catch (e) {
      setError(e.message || 'AI call failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [user, profile, buildAIContext]);

  return { callGemini, loading, error };
}
