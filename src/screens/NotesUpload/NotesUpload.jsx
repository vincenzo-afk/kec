import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function NotesUpload() {
  const { profile, isTeacher } = useAuth();
  const { addDocument } = useFirestore();
  const [subject, setSubject] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  if (!isTeacher) {
    return <div className="page"><div className="empty-state"><div className="empty-state-icon">📝</div><p>Only staff can upload notes.</p></div></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !subject.trim()) return toast.error('Select file and subject');
    setUploading(true);
    try {
      const path = `notes/${profile.department}/${profile.year}/${profile.section}/${Date.now()}_${file.name}`;
      const sRef = ref(storage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      await addDocument('notes', {
        subject: subject.trim(),
        fileURL: url,
        fileName: file.name,
        department: profile.department,
        year: profile.year,
        section: profile.section,
        uploadedBy: profile.id,
      });
      setFile(null);
      setSubject('');
      toast.success('Notes uploaded');
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page animate-fade">
      <div className="page-header"><h2>Notes Upload</h2></div>
      <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">File (PDF/Image)</label><input className="form-input" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ padding: 8 }} /></div>
        <button className="btn btn-primary" type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload Notes'}</button>
      </form>
    </div>
  );
}
