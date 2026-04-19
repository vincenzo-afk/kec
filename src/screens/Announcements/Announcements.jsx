import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { orderBy, limit, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function Announcements() {
  const { profile, isTeacher, isHod } = useAuth();
  const { subscribe, addDocument } = useFirestore();
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', scope: 'section', pinned: false });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!profile) return;
    return subscribe('announcements', [orderBy('timestamp', 'desc'), limit(50)], setAnnouncements);
  }, [profile]);

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return toast.error('Fill title and body');
    setSaving(true);
    try {
      await addDocument('announcements', {
        title: form.title, body: form.body,
        postedBy: profile.id, posterRole: profile.role,
        scope: form.scope, pinned: form.pinned,
        targetDept: profile.department || null,
        targetYear: profile.year || null,
        targetSection: profile.section || null,
        readBy: [], attachmentURL: null,
      });
      toast.success('Announcement posted!');
      setShowForm(false);
      setForm({ title: '', body: '', scope: 'section', pinned: false });
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const pinned = announcements.filter(a => a.pinned);
  const regular = announcements.filter(a => !a.pinned);

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>Announcements</h2>
        {isTeacher && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Post'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="card animate-slide-down" style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="Announcement title" value={form.title} onChange={setF('title')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Body</label>
            <textarea className="form-textarea" style={{ minHeight: 100 }} placeholder="Write your announcement…" value={form.body} onChange={setF('body')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Scope</label>
              <select className="form-select" value={form.scope} onChange={setF('scope')}>
                <option value="section">My Section</option>
                {isHod && <option value="college-wide">College-wide</option>}
              </select>
            </div>
            {isHod && (
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label className="form-label">Pin</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
                  <span className="text-sm">Pin to top</span>
                </label>
              </div>
            )}
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><span className="spinner" /> Posting…</> : 'Post Announcement'}
          </button>
        </form>
      )}

      {pinned.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div className="text-xs text-muted font-semibold" style={{ marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📌 Pinned</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {pinned.map(a => <AnnouncementCard key={a.id} a={a} profile={profile} expanded={expanded} setExpanded={setExpanded} />)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {regular.length === 0 && !pinned.length && (
          <div className="empty-state"><div className="empty-state-icon">📢</div><p>No announcements yet</p></div>
        )}
        {regular.map(a => <AnnouncementCard key={a.id} a={a} profile={profile} expanded={expanded} setExpanded={setExpanded} />)}
      </div>
    </div>
  );
}

function AnnouncementCard({ a, profile, expanded, setExpanded }) {
  const isExpanded = expanded === a.id;
  const isUnread = !a.readBy?.includes(profile?.id);

  return (
    <div className="card" onClick={() => setExpanded(isExpanded ? null : a.id)} style={{
      padding: 'var(--space-4)', cursor: 'pointer',
      borderLeft: isUnread ? '3px solid var(--color-primary)' : '3px solid transparent',
      transition: 'all 0.2s',
    }}>
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 4 }}>
        <span className="font-semibold text-sm truncate">{a.title}</span>
        <div className="flex gap-2 items-center" style={{ flexShrink: 0 }}>
          {a.pinned && <span>📌</span>}
          {a.scope === 'college-wide' && <span className="badge badge-blue">📢</span>}
          {isUnread && <span className="badge badge-blue">New</span>}
        </div>
      </div>
      <p className="text-xs text-muted" style={{ marginBottom: 4 }}>
        {a.posterRole} · {a.timestamp?.toDate ? formatDistanceToNow(a.timestamp.toDate(), { addSuffix: true }) : ''}
      </p>
      {isExpanded && (
        <p className="text-sm" style={{ marginTop: 8, lineHeight: 1.7, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{a.body}</p>
      )}
      {!isExpanded && (
        <p className="text-xs text-muted truncate">{a.body}</p>
      )}
    </div>
  );
}
