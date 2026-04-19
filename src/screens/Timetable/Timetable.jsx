import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { where, orderBy, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function Timetable() {
  const { profile, isTeacher, isHod } = useAuth();
  const { subscribe, addDocument, fetchDoc } = useFirestore();
  const [timetables, setTimetables] = useState([]);
  const [uploaderName, setUploaderName] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scale, setScale] = useState(1);
  const fileRef = useRef(null);
  const [form, setForm] = useState({ department: '', year: '', section: '', validFrom: '' });

  useEffect(() => {
    if (!profile) return;
    const constraints = isTeacher
      ? [orderBy('uploadedAt', 'desc'), limit(5)]
      : [where('department', '==', profile.department), where('year', '==', profile.year), where('section', '==', profile.section), orderBy('uploadedAt', 'desc'), limit(1)];
    return subscribe('timetable', constraints, setTimetables);
  }, [profile]);

  const current = timetables[0];
  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error('Select a file');
    if (!form.department || !form.year || !form.section) return toast.error('Fill all fields');
    setUploading(true);
    try {
      const path = `timetables/${form.department}/${form.year}/${form.section}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const imageURL = await getDownloadURL(storageRef);
      await addDocument('timetable', {
        department: form.department, year: form.year, section: form.section,
        imageURL, uploadedBy: profile.id, validFrom: form.validFrom,
      });
      toast.success('Timetable uploaded!');
      setShowUpload(false);
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const share = () => {
    if (navigator.share && current) {
      navigator.share({ title: 'Timetable', url: current.imageURL }).catch(() => {});
    } else if (current) {
      navigator.clipboard.writeText(current.imageURL);
      toast.success('Link copied!');
    }
  };

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>Timetable</h2>
        <div className="flex gap-2">
          {current && <button className="btn btn-secondary btn-sm" onClick={share}>📤 Share</button>}
          {isTeacher && <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(!showUpload)}>📤 Upload</button>}
        </div>
      </div>

      {showUpload && isTeacher && (
        <form className="card animate-slide-down" style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={handleUpload}>
          <h3 style={{ fontSize: 'var(--font-size-md)' }}>Upload New Timetable</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" placeholder="CSE" value={form.department} onChange={setF('department')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={form.year} onChange={setF('year')} required>
                <option value="">Year</option>
                {['1','2','3','4'].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-select" value={form.section} onChange={setF('section')} required>
                <option value="">Sec</option>
                {['A','B','C','D'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Valid From</label>
            <input className="form-input" type="date" value={form.validFrom} onChange={setF('validFrom')} />
          </div>
          <div className="form-group">
            <label className="form-label">Timetable Image / PDF</label>
            <input className="form-input" type="file" accept="image/*,application/pdf" ref={fileRef} required style={{ padding: '8px' }} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={uploading}>
            {uploading ? <><span className="spinner"/> Uploading…</> : 'Upload Timetable'}
          </button>
        </form>
      )}

      {current ? (
        <div className="animate-fade">
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Current Timetable</div>
                <div className="text-xs text-muted">
                  {current.department} · Year {current.year} · Section {current.section}
                  {current.validFrom && ` · Valid from ${current.validFrom}`}
                  {uploaderName && ` · Uploaded by ${uploaderName}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-icon" onClick={() => setScale(s => Math.max(0.5, s - 0.25))} title="Zoom out">−</button>
                <span className="text-xs text-muted" style={{ lineHeight: '32px' }}>{Math.round(scale * 100)}%</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setScale(s => Math.min(3, s + 0.25))} title="Zoom in">+</button>
                <button className="btn btn-ghost btn-icon" onClick={() => setScale(1)} title="Reset zoom">↺</button>
              </div>
            </div>
          </div>

          <div style={{ overflow: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            {current.imageURL?.toLowerCase().includes('.pdf') || current.imageURL?.includes('application%2Fpdf') ? (
              <iframe
                src={current.imageURL}
                title="Timetable PDF"
                style={{ width: '100%', height: '70vh', border: 'none', transform: `scale(${scale})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}
              />
            ) : (
              <img
                src={current.imageURL}
                alt="Timetable"
                style={{ display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left', transition: 'transform 0.2s', maxWidth: '100%' }}
                onDoubleClick={() => setScale(1)}
              />
            )}
          </div>
          <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>Double-tap to reset zoom</p>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p>No timetable uploaded yet for your section</p>
          {isTeacher && <button className="btn btn-primary" onClick={() => setShowUpload(true)}>Upload Timetable</button>}
        </div>
      )}
    </div>
  );
}
  useEffect(() => {
    if (!current?.uploadedBy) return;
    fetchDoc('users', current.uploadedBy).then((u) => setUploaderName(u?.name || current.uploadedBy)).catch(() => setUploaderName(current.uploadedBy));
  }, [current?.uploadedBy, fetchDoc]);
