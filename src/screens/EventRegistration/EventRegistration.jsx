import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = { upcoming: 'badge-blue', ongoing: 'badge-green', completed: 'badge-grey', cancelled: 'badge-red' };
const CATEGORIES = ['workshop', 'symposium', 'seminar', 'cultural', 'sports', 'other'];
const CAT_ICONS  = { workshop: '🔧', symposium: '🎓', seminar: '🎤', cultural: '🎭', sports: '⚽', other: '🎪' };

export default function EventRegistration() {
  const { profile, isTeacher } = useAuth();
  const { subscribe, addDocument } = useFirestore();
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'workshop', date: '', time: '', venue: '', maxCapacity: '', registrationDeadline: '', scope: 'section' });
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState({});

  useEffect(() => {
    if (!profile) return;
    return subscribe('events', [orderBy('date', 'asc'), limit(50)], setEvents);
  }, [profile]);

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const createEvent = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.venue) return toast.error('Fill required fields');
    setSaving(true);
    try {
      await addDocument('events', {
        title: form.title, description: form.description, createdBy: profile.id,
        scope: form.scope, date: form.date, time: form.time, venue: form.venue,
        maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : null,
        registrationDeadline: form.registrationDeadline,
        category: form.category, registrations: [], status: 'upcoming',
        targetDept: profile.department, targetSection: profile.section,
        attachmentURL: null, calendarEventId: '', createdAt: new Date(),
      });
      toast.success('Event created! 🎪');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'workshop', date: '', time: '', venue: '', maxCapacity: '', registrationDeadline: '', scope: 'section' });
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const register = async (event) => {
    const isRegistered = event.registrations?.includes(profile.id);
    setRegistering(r => ({ ...r, [event.id]: true }));
    try {
      await updateDoc(doc(db, 'events', event.id), {
        registrations: isRegistered ? arrayRemove(profile.id) : arrayUnion(profile.id),
      });
      toast.success(isRegistered ? 'Registration cancelled' : 'Registered! 🎉');
    } catch (e) { toast.error(e.message); }
    finally { setRegistering(r => ({ ...r, [event.id]: false })); }
  };

  const upcoming = events.filter(e => e.status !== 'cancelled' && !isPast(parseISO(e.date)));
  const past = events.filter(e => isPast(parseISO(e.date)));

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>Events</h2>
        {isTeacher && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Create Event'}
          </button>
        )}
      </div>

      {showForm && isTeacher && (
        <form className="card animate-slide-down" style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={createEvent}>
          <div className="form-group">
            <label className="form-label">Event Title *</label>
            <input className="form-input" placeholder="Event name" value={form.title} onChange={setF('title')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={setF('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Scope</label>
              <select className="form-select" value={form.scope} onChange={setF('scope')}>
                <option value="section">My Section</option>
                <option value="department">Department</option>
                <option value="college-wide">College-wide</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.date} onChange={setF('date')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="form-input" type="time" value={form.time} onChange={setF('time')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Venue *</label>
              <input className="form-input" placeholder="Seminar Hall" value={form.venue} onChange={setF('venue')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Max Capacity</label>
              <input className="form-input" type="number" placeholder="Leave blank for unlimited" value={form.maxCapacity} onChange={setF('maxCapacity')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Registration Deadline</label>
            <input className="form-input" type="date" value={form.registrationDeadline} onChange={setF('registrationDeadline')} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Event details…" value={form.description} onChange={setF('description')} rows={3} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><span className="spinner" /> Creating…</> : 'Create Event'}
          </button>
        </form>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-md)' }}>Upcoming Events</h3>
          {upcoming.map(ev => <EventCard key={ev.id} ev={ev} profile={profile} onRegister={register} registering={registering} />)}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-md)', color: 'var(--color-text-muted)' }}>Past Events</h3>
          {past.map(ev => <EventCard key={ev.id} ev={ev} profile={profile} onRegister={register} registering={registering} past />)}
        </div>
      )}

      {events.length === 0 && (
        <div className="empty-state"><div className="empty-state-icon">🎪</div><p>No events yet</p></div>
      )}
    </div>
  );
}

function EventCard({ ev, profile, onRegister, registering, past }) {
  const isRegistered = ev.registrations?.includes(profile?.id);
  const spotsLeft = ev.maxCapacity ? ev.maxCapacity - (ev.registrations?.length || 0) : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0 && !isRegistered;

  return (
    <div className="card" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-4)', opacity: past ? 0.7 : 1 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>{CAT_ICONS[ev.category]}</span>
          <span className="font-semibold text-sm">{ev.title}</span>
        </div>
        <span className={`badge ${STATUS_COLORS[ev.status]}`}>{ev.status}</span>
      </div>
      <div className="flex gap-3" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        <span className="text-xs text-muted">📅 {ev.date}{ev.time && ` at ${ev.time}`}</span>
        <span className="text-xs text-muted">📍 {ev.venue}</span>
        {spotsLeft !== null && <span className="text-xs text-muted">🎟️ {spotsLeft} spots left</span>}
        <span className="text-xs text-muted">👥 {ev.registrations?.length || 0} registered</span>
      </div>
      {ev.description && <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>{ev.description}</p>}
      {!past && (
        <button
          className={`btn ${isRegistered ? 'btn-secondary' : 'btn-primary'} btn-sm`}
          onClick={() => onRegister(ev)}
          disabled={registering[ev.id] || (isFull && !isRegistered)}
        >
          {registering[ev.id] ? <span className="spinner" /> : isRegistered ? '✕ Cancel Registration' : isFull ? 'Full' : '✅ Register'}
        </button>
      )}
    </div>
  );
}
