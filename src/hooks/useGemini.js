import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
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
        const attSnap = await getDocs(
          query(
            collection(db, 'attendance'),
            where('studentId', '==', userId),
            orderBy('date', 'desc'),
            limit(100)
          )
        );
        const records = attSnap.docs.map(d => d.data());
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
      } catch (e) {
        console.warn('[AI] Failed to load attendance:', e);
      }
    }

    // Results
    if (options.includeResults !== false) {
      try {
        const resSnap = await getDocs(
          query(
            collection(db, 'results'),
            where('classId', '==', classId),
            orderBy('createdAt', 'desc'),
            limit(3)
          )
        );
        context.results = resSnap.docs.map(d => {
          const r = d.data();
          const score = r.marksMap?.[userId];
          return { testName: r.testName, subject: r.subject, score, maxMarks: r.maxMarks };
        });
      } catch (e) {
        console.warn('[AI] Failed to load results:', e);
      }
    }

    // Leave Status
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const leaveSnap = await getDocs(
        query(
          collection(db, 'leaveApplications'),
          where('studentId', '==', userId),
          where('appliedAt', '>=', startOfMonth)
        )
      );
      
      let pendingLeaves = 0;
      let approvedLeaves = 0;
      leaveSnap.docs.forEach(d => {
        const l = d.data();
        if (l.status === 'pending') pendingLeaves += l.daysCount;
        if (l.status === 'approved') approvedLeaves += l.daysCount;
      });
      context.leaveStatus = { pendingDays: pendingLeaves, approvedDaysThisMonth: approvedLeaves };
    } catch (e) {
      console.warn('[AI] Failed to load leave status:', e);
    }

    // Calendar
    if (options.includeCalendar !== false) {
      try {
        const calSnap = await getDocs(
          query(
            collection(db, 'calendar'),
            where('date', '>=', new Date().toISOString().split('T')[0]),
            orderBy('date'),
            limit(7)
          )
        );
        context.calendar = calSnap.docs.map(d => d.data());
      } catch (e) {
        console.warn('[AI] Failed to load calendar:', e);
      }
    }

    // Announcements
    try {
      const annSnap = await getDocs(
        query(
          collection(db, 'announcements'),
          orderBy('timestamp', 'desc'),
          limit(10)
        )
      );
      context.announcements = annSnap.docs
        .map(d => d.data())
        .filter((a) => {
          if (a.scope === 'college-wide') return true;
          if (a.scope === 'section') return !a.targetSection || a.targetSection === userData.section;
          if (a.scope === 'department') return !a.targetDept || a.targetDept === userData.department;
          return true;
        })
        .slice(0, 2)
        .map(a => a.title);
    } catch (e) {
      console.warn('[AI] Failed to load announcements:', e);
    }

    // Events
    try {
      const eventsSnap = await getDocs(
        query(
          collection(db, 'events'),
          where('registrations', 'array-contains', userId),
          where('date', '>=', new Date().toISOString().split('T')[0]),
          limit(3)
        )
      );
      context.registeredEvents = eventsSnap.docs.map(d => d.data().title);
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
      const context = options.includeContext ? await buildAIContext(user.uid, options.contextPreferences) : { user: { name: profile?.name } };

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
