import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../hooks/useSupabase';
import { supabase } from '../../supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function Announcements() {
  const { profile, isTeacher, isHod } = useAuth();
  const { subscribe, addDocument } = useSupabase();
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', scope: 'section', pinned: false });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!profile) return;
    return subscribe('announcements', q => q.order('timestamp', { ascending: false }).limit(50), setAnnouncements);
  }, [profile]);

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return toast.error('Fill title and body');
    setSaving(true);
    try {
      let attachmentURL = null;
      if (file) {
        const path = `${profile.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('announcements').upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('announcements').getPublicUrl(path);
        attachmentURL = data.publicUrl;
      }
      await addDocument('announcements', {
        title: form.title, body: form.body,
        postedBy: profile.id, posterRole: profile.role,
        scope: form.scope, pinned: form.pinned,
        targetDept: profile.department || null,
        targetYear: profile.year || null,
        targetSection: profile.section || null,
        readBy: [], attachmentURL,
        timestamp: new Date().toISOString(),
      });
      toast.success('Announcement posted!');
      setShowForm(false);
      setForm({ title: '', body: '', scope: 'section', pinned: false });
      setFile(null);
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
          <div className="form-group">
            <label className="form-label">Attachment (optional)</label>
            <input className="form-input" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ padding: '8px' }} />
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
  const markRead = async () => {
    if (!isUnread || !profile?.id || !a?.id) return;
    await supabase.from('announcements').update({ readBy: [...(a.readBy || []), profile.id] }).eq('id', a.id).catch(() => {});
  };

  return (
    <div className="card" onClick={() => { setExpanded(isExpanded ? null : a.id); markRead(); }} style={{
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
        {a.posterRole} · {a.timestamp ? formatDistanceToNow(new Date(a.timestamp), { addSuffix: true }) : ''}
      </p>
      {isExpanded && (
        <div>
          <p className="text-sm" style={{ marginTop: 8, lineHeight: 1.7, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{a.body}</p>
          {a.attachmentURL && (
            <div style={{ marginTop: 10 }}>
              {a.attachmentURL.toLowerCase().includes('.pdf') || a.attachmentURL.includes('application%2Fpdf')
                ? <iframe src={a.attachmentURL} title="Announcement attachment" style={{ width: '100%', height: 320, border: '1px solid var(--color-border)', borderRadius: 8 }} />
                : <img src={a.attachmentURL} alt="Announcement attachment" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--color-border)' }} />
              }
            </div>
          )}
        </div>
      )}
      {!isExpanded && (
        <p className="text-xs text-muted truncate">{a.body}</p>
      )}
    </div>
  );
}
