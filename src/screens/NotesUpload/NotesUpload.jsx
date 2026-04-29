import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../hooks/useSupabase';
import { supabase } from '../../supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// Increment download count server-side
async function incrementDownload(noteId) {
  try {
    const { data } = await supabase.from('notes').select('downloadCount').eq('id', noteId).single();
    if (data) {
      await supabase.from('notes').update({ downloadCount: (data.downloadCount || 0) + 1 }).eq('id', noteId);
    }
  } catch (_) { /* non-critical */ }
}

export default function NotesScreen() {
  const { isTeacher } = useAuth();
  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>📝 Notes</h2>
        <span className="text-muted text-sm">
          {isTeacher ? 'Upload materials for your section' : 'Browse & download section notes'}
        </span>
      </div>
      {isTeacher && <UploadForm />}
      <NotesList />
    </div>
  );
}

/* ─── Teacher Upload Form ─── */
function UploadForm() {
  const { profile } = useAuth();
  const { addDocument } = useSupabase();
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !subject.trim()) return toast.error('Select a file and enter the subject');
    setUploading(true);
    try {
      const path = `${profile.department}/${profile.year}/${profile.section}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('notes').upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('notes').getPublicUrl(path);
      const url = data.publicUrl;
      await addDocument('notes', {
        subject: subject.trim(),
        title: title.trim() || file.name,
        fileURL: url,
        storagePath: path,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
        department: profile.department,
        year: profile.year,
        section: profile.section,
        uploadedBy: profile.id,
        uploaderName: profile.name || 'Teacher',
        uploadedAt: new Date().toISOString(),
        downloadCount: 0,
      });
      setFile(null); setSubject(''); setTitle(''); setOpen(false);
      toast.success('Notes uploaded! 📤');
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <button className={`btn btn-primary btn-sm`} onClick={() => setOpen(o => !o)} style={{ marginBottom: 'var(--space-3)' }}>
        {open ? '✕ Cancel' : '+ Upload Notes'}
      </button>
      {open && (
        <form className="card animate-slide-down" onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input className="form-input" placeholder="e.g. Data Structures" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Title (optional)</label>
              <input className="form-input" placeholder="e.g. Unit 2 — Trees" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">File (PDF / Image) *</label>
            <input className="form-input" type="file" accept="application/pdf,image/*"
              onChange={e => setFile(e.target.files?.[0] || null)} style={{ padding: 8 }} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={uploading}>
            {uploading ? <><span className="spinner" /> Uploading…</> : '📤 Upload'}
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── Notes List (all users) ─── */
function NotesList() {
  const { profile } = useAuth();
  const { subscribe } = useSupabase();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;
    
    // Principals/admins can view all notes (no department filter)
    const isPrincipal = profile.role === 'principal';
    const hasDepartment = profile.department && profile.department !== '';
    
    if (!isPrincipal && !hasDepartment) {
      // User doesn't have department assigned yet
      setLoading(false);
      setNotes([]);
      return;
    }
    
    const constraints = isPrincipal
      ? q => q.order('uploadedAt', { ascending: false }).limit(100)
      : q => q
          .eq('department', profile.department)
          .eq('year', profile.year)
          .eq('section', profile.section)
          .order('uploadedAt', { ascending: false })
          .limit(100);
    
    return subscribe('notes', constraints, (data) => {
      setNotes(data);
      setLoading(false);
    });
  }, [profile, subscribe]);

  const subjects = ['all', ...new Set(notes.map(n => n.subject).filter(Boolean))];
  const filtered = notes.filter(n => {
    if (subject !== 'all' && n.subject !== subject) return false;
    if (search && !n.subject?.toLowerCase().includes(search.toLowerCase()) &&
      !n.fileName?.toLowerCase().includes(search.toLowerCase()) &&
      !n.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Search + subject filter */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="🔍 Search notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Subject filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)', overflowX: 'auto', paddingBottom: 4 }}>
        {subjects.map(s => (
          <button key={s} onClick={() => setSubject(s)}
            className={`btn btn-sm ${subject === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap' }}>
            {s === 'all' ? 'All Subjects' : s}
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center p-8"><span className="spinner" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <p>{notes.length === 0 ? 'No notes uploaded yet for your section' : 'No notes match your search'}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.map(note => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}

function NoteCard({ note }) {
  const isPDF = note.mimeType === 'application/pdf' || note.fileName?.endsWith('.pdf');
  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
            background: isPDF ? 'var(--color-danger-muted)' : 'var(--color-primary-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            {isPDF ? '📄' : '🖼️'}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{note.title || note.fileName}</div>
            <div className="text-xs text-muted" style={{ marginTop: 2 }}>
              <span className="badge badge-blue" style={{ marginRight: 6 }}>{note.subject}</span>
              {note.uploaderName && <span>{note.uploaderName} · </span>}
              {note.uploadedAt
                ? formatDistanceToNow(new Date(note.uploadedAt), { addSuffix: true })
                : 'Just now'}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 2 }}>
              📥 {note.downloadCount || 0} downloads
            </div>
          </div>
        </div>
        <a
          href={note.fileURL}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0 }}
          onClick={() => incrementDownload(note.id)}
        >
          📥 Open
        </a>
      </div>
    </div>
  );
}
