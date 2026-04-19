import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { where, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: 'badge-gold', approved: 'badge-green', rejected: 'badge-red' };
const LEAVE_TYPES = ['medical', 'personal', 'event', 'other'];

export default function LeaveApplication() {
  const { profile, isTeacher, isHod } = useAuth();
  return isTeacher
    ? <TeacherLeavePanel profile={profile} isHod={isHod} />
    : <StudentLeavePanel profile={profile} />;
}

function StudentLeavePanel({ profile }) {
  const { subscribe, addDocument } = useFirestore();
  const [leaves, setLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fromDate: '', toDate: '', type: 'medical', reason: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    return subscribe('leaveApplications', [where('studentId', '==', profile.id), orderBy('appliedAt', 'desc'), limit(20)], setLeaves);
  }, [profile?.id]);

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fromDate || !form.toDate || !form.reason) return toast.error('Fill all fields');
    const days = differenceInDays(parseISO(form.toDate), parseISO(form.fromDate)) + 1;
    if (days < 1) return toast.error('End date must be after start date');
    setSaving(true);
    try {
      let attachmentURL = null;
      if (file) {
        const path = `leave-attachments/${profile.id}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        attachmentURL = await getDownloadURL(storageRef);
      }
      await addDocument('leaveApplications', {
        studentId: profile.id,
        teacherId: '',
        classId: `${profile.department}-${profile.year}-${profile.section}`,
        fromDate: form.fromDate, toDate: form.toDate,
        reason: form.reason, type: form.type,
        status: 'pending', daysCount: days,
        reviewedAt: null, reviewedBy: null, reviewNote: null,
        attachmentURL, autoReflected: false,
      });
      toast.success('Leave application submitted!');
      setShowForm(false);
      setForm({ fromDate: '', toDate: '', type: 'medical', reason: '' });
      setFile(null);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>Leave Applications</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Apply'}
        </button>
      </div>

      {showForm && (
        <form className="card animate-slide-down" style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={submit}>
          <h3 style={{ fontSize: 'var(--font-size-md)' }}>New Leave Application</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input className="form-input" type="date" value={form.fromDate} onChange={setF('fromDate')} required />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input className="form-input" type="date" value={form.toDate} onChange={setF('toDate')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Leave Type</label>
            <select className="form-select" value={form.type} onChange={setF('type')}>
              {LEAVE_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="form-textarea" placeholder="Explain your reason for leave…" value={form.reason} onChange={setF('reason')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Attachment (optional)</label>
            <input className="form-input" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ padding: '8px' }} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><span className="spinner" /> Submitting…</> : 'Submit Application'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {leaves.length === 0 && (
          <div className="empty-state"><div className="empty-state-icon">📋</div><p>No leave applications</p></div>
        )}
        {leaves.map(l => (
          <div key={l.id} className="card" style={{ padding: 'var(--space-4)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span className="font-semibold text-sm">{l.fromDate} → {l.toDate}</span>
              <span className={`badge ${STATUS_COLORS[l.status]}`}>{l.status}</span>
            </div>
            <div className="flex gap-3">
              <span className="badge badge-grey" style={{ textTransform: 'capitalize' }}>{l.type}</span>
              <span className="text-xs text-muted">{l.daysCount} day{l.daysCount !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-sm" style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>{l.reason}</p>
            {l.attachmentURL && <a href={l.attachmentURL} target="_blank" rel="noreferrer" className="text-xs text-primary-color">View attachment</a>}
            {l.reviewNote && (
              <div style={{ marginTop: 8, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)' }}>
                <span className="text-xs text-muted">Review note: </span>
                <span className="text-xs">{l.reviewNote}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TeacherLeavePanel({ profile, isHod }) {
  const { subscribe, updateDocument } = useFirestore();
  const [leaves, setLeaves] = useState([]);
  const [reviewNote, setReviewNote] = useState({});
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    if (!profile) return;
    return subscribe('leaveApplications', [
      where('classId', '==', `${profile.department}-${profile.year}-${profile.section}`),
      orderBy('appliedAt', 'desc'), limit(50),
    ], setLeaves);
  }, [profile]);

  const decide = async (id, status) => {
    setProcessing(p => ({ ...p, [id]: true }));
    try {
      await updateDocument('leaveApplications', id, {
        status, reviewedBy: profile.id,
        reviewNote: reviewNote[id] || null,
        reviewedAt: new Date(),
      });
      toast.success(`Leave ${status}!`);
    } catch (e) { toast.error(e.message); }
    finally { setProcessing(p => ({ ...p, [id]: false })); }
  };

  const pending = leaves.filter(l => l.status === 'pending');
  const reviewed = leaves.filter(l => l.status !== 'pending');

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>Leave Requests</h2>
        {pending.length > 0 && <span className="badge badge-red">{pending.length} pending</span>}
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-md)' }}>Pending Review</h3>
          {pending.map(l => (
            <div key={l.id} className="card" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-4)' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span className="font-semibold text-sm">{l.studentId?.slice(0, 8)}</span>
                <span className="badge badge-grey" style={{ textTransform: 'capitalize' }}>{l.type} · {l.daysCount}d</span>
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: 4 }}>{l.fromDate} → {l.toDate}</p>
              <p className="text-sm" style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>{l.reason}</p>
              {l.attachmentURL && <a href={l.attachmentURL} target="_blank" rel="noreferrer" className="text-xs text-primary-color">View attachment</a>}
              <input className="form-input" placeholder="Optional review note…" value={reviewNote[l.id] || ''} onChange={e => setReviewNote(r => ({ ...r, [l.id]: e.target.value }))} style={{ marginBottom: 'var(--space-2)' }} />
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1" onClick={() => decide(l.id, 'approved')} disabled={processing[l.id]}>✅ Approve</button>
                <button className="btn btn-danger flex-1" onClick={() => decide(l.id, 'rejected')} disabled={processing[l.id]}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-md)' }}>Reviewed</h3>
          {reviewed.map(l => (
            <div key={l.id} className="card" style={{ marginBottom: 'var(--space-2)', padding: 'var(--space-3)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm">{l.fromDate} → {l.toDate} · {l.type}</span>
                <span className={`badge ${STATUS_COLORS[l.status]}`}>{l.status}</span>
              </div>
              {isHod && (
                <div className="flex gap-2" style={{ marginTop: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => decide(l.id, 'approved')}>Override → Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => decide(l.id, 'rejected')}>Override → Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {leaves.length === 0 && (
        <div className="empty-state"><div className="empty-state-icon">📋</div><p>No leave requests</p></div>
      )}
    </div>
  );
}
