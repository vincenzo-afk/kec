import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

const typeColors = { test: '#EF4444', holiday: '#F59E0B', personal: '#3B82F6', event: '#10B981' };
const typeIcons  = { test: '📝', holiday: '🏖️', personal: '📌', event: '🎪' };

export default function CalendarScreen() {
  const { profile, isTeacher, isHod } = useAuth();
  const { subscribe, addDocument } = useFirestore();
  const [month, setMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState({ test: true, holiday: true, personal: true, event: true });
  const [form, setForm] = useState({ title: '', type: 'personal', description: '', visibility: 'personal' });

  useEffect(() => {
    if (!profile) return;
    return subscribe('calendar', [orderBy('date', 'asc')], setEvents);
  }, [profile]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

  const canViewEvent = (e) => {
    if (!profile) return false;
    if (e.visibility === 'public') return true;
    if (e.visibility === 'section') {
      return e.targetDept === profile.department && e.targetSection === profile.section;
    }
    return e.createdBy === profile.id;
  };

  const eventsForDay = (day) => {
    const ds = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.date === ds && filter[e.type] && canViewEvent(e));
  };

  const selectedDayEvents = selected ? eventsForDay(selected) : [];

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const addEvent = async (e) => {
    e.preventDefault();
    if (!form.title || !selected) return toast.error('Fill title and select a date');
    try {
      await addDocument('calendar', {
        ...form,
        date: format(selected, 'yyyy-MM-dd'),
        createdBy: profile.id,
        targetDept: profile.department || null,
        targetSection: profile.section || null,
        endDate: null,
        relatedEventId: null,
      });
      toast.success('Event added!');
      setShowAdd(false);
      setForm({ title: '', type: 'personal', description: '', visibility: 'personal' });
    } catch { toast.error('Failed to add event'); }
  };

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>Calendar</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕' : '+ Add Event'}
        </button>
      </div>

      {/* Filter toggles */}
      <div className="flex gap-2" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {Object.entries(typeColors).map(([type, color]) => (
          <button key={type} onClick={() => setFilter(f => ({ ...f, [type]: !f[type] }))}
            style={{
              padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, border: `1.5px solid ${color}`,
              background: filter[type] ? color : 'transparent',
              color: filter[type] ? '#fff' : color, cursor: 'pointer',
            }}>
            {typeIcons[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Month nav */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setMonth(m => subMonths(m, 1))}>←</button>
          <span className="font-semibold">{format(month, 'MMMM yyyy')}</span>
          <button className="btn btn-ghost btn-icon" onClick={() => setMonth(m => addMonths(m, 1))}>→</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
          {Array.from({ length: days[0].getDay() }).map((_,i)=><div key={`e${i}`}/>)}
          {days.map(day => {
            const dayEvents = eventsForDay(day);
            const isSelected = selected && isSameDay(day, selected);
            const isToday = isSameDay(day, new Date());
              <button key={day.toISOString()} 
                onClick={() => setSelected(isSameDay(day, selected||new Date('invalid')) ? null : day)}
                onContextMenu={(e) => { e.preventDefault(); setSelected(day); setShowAdd(true); }}
                style={{
                  aspectRatio: '1', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                  background: isSelected ? 'var(--color-primary)' : isToday ? 'var(--color-primary-muted)' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--color-text-primary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 2, position: 'relative', transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{format(day, 'd')}</span>
                {dayEvents.length > 0 && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? '#fff' : typeColors[ev.type] }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selected && (
        <div className="animate-slide-up">
          <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-md)' }}>
            {format(selected, 'MMMM d, yyyy')}
          </h3>
          {selectedDayEvents.length === 0
            ? <p className="text-sm text-muted">No events on this day.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {selectedDayEvents.map(ev => (
                  <div key={ev.id} className="card" style={{ padding: 'var(--space-4)', borderLeft: `3px solid ${typeColors[ev.type]}` }}>
                    <div className="flex items-center gap-2">
                      <span>{typeIcons[ev.type]}</span>
                      <span className="font-semibold text-sm">{ev.title}</span>
                      <span className="badge" style={{ marginLeft: 'auto', background: typeColors[ev.type]+'22', color: typeColors[ev.type] }}>{ev.type}</span>
                    </div>
                    {ev.description && <p className="text-xs text-muted" style={{ marginTop: 4 }}>{ev.description}</p>}
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Add Event Form */}
      {showAdd && (
        <form className="card animate-slide-down" style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={addEvent}>
          <h3 style={{ fontSize: 'var(--font-size-md)' }}>Add Event {selected ? `— ${format(selected, 'MMM d')}` : '(select a date first)'}</h3>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="Event title" value={form.title} onChange={setF('title')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={setF('type')}>
                <option value="personal">Personal</option>
                {isTeacher && <option value="test">Test Date</option>}
                {isHod && <option value="holiday">Holiday</option>}
                <option value="event">Event</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Visibility</label>
              <select className="form-select" value={form.visibility} onChange={setF('visibility')}>
                <option value="personal">Only Me</option>
                <option value="section">My Section</option>
                {isHod && <option value="public">College-wide</option>}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Optional description…" value={form.description} onChange={setF('description')} rows={2} />
          </div>
          <button className="btn btn-primary" type="submit">Add Event</button>
        </form>
      )}
    </div>
  );
}
