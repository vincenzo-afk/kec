import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const CATEGORIES = ['certification', 'competition', 'project', 'publication', 'sports', 'other'];
const CAT_ICONS  = { certification: '🏅', competition: '🏆', project: '💡', publication: '📖', sports: '⚽', other: '🌟' };

export default function AchievementBoard() {
  const { profile, isHod } = useAuth();
  const { subscribe, addDocument } = useFirestore();
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'certification', description: '', externalLink: '' });
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    return subscribe('achievements', [orderBy('pinned', 'desc'), orderBy('timestamp', 'desc'), limit(50)], setPosts);
  }, [profile]);

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return toast.error('Fill title and description');
    setSaving(true);
    try {
      await addDocument('achievements', {
        postedBy: profile.id, posterName: profile.name,
        posterRole: profile.role, department: profile.department,
        title: form.title, description: form.description,
        category: form.category, imageURL: null,
        externalLink: form.externalLink || null,
        likes: [], pinned: false, approved: true,
      });
      toast.success('Achievement posted! 🎉');
      setShowForm(false);
      setForm({ title: '', category: 'certification', description: '', externalLink: '' });
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const toggleLike = async (post) => {
    const liked = post.likes?.includes(profile.id);
    await updateDoc(doc(db, 'achievements', post.id), {
      likes: liked ? arrayRemove(profile.id) : arrayUnion(profile.id),
    });
  };

  const togglePin = async (post) => {
    await updateDoc(doc(db, 'achievements', post.id), { pinned: !post.pinned });
    toast.success(post.pinned ? 'Unpinned' : 'Pinned!');
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter);

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>🌟 Achievements</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '✚ Post'}
        </button>
      </div>

      {showForm && (
        <form className="card animate-slide-down" style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="e.g. AWS Certified Developer" value={form.title} onChange={setF('title')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={setF('category')}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Tell us about this achievement…" value={form.description} onChange={setF('description')} required />
          </div>
          <div className="form-group">
            <label className="form-label">External Link (optional)</label>
            <input className="form-input" type="url" placeholder="https://certificate-link.com" value={form.externalLink} onChange={setF('externalLink')} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><span className="spinner" /> Posting…</> : '🌟 Post Achievement'}
          </button>
        </form>
      )}

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', overflowX: 'auto', paddingBottom: 4 }}>
        <button onClick={() => setFilter('all')} className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-secondary'}`} style={{ whiteSpace: 'nowrap' }}>
            {CAT_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {filtered.length === 0 && (
          <div className="empty-state"><div className="empty-state-icon">🌟</div><p>No achievements yet — be the first!</p></div>
        )}
        {filtered.map(post => {
          const liked = post.likes?.includes(profile?.id);
          return (
            <div key={post.id} className="card animate-fade" style={{ padding: 'var(--space-5)' }}>
              {post.pinned && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 8 }}>📌 PINNED</div>}
              <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                <div className="avatar avatar-md">{post.posterName?.[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{post.posterName}</div>
                  <div className="text-xs text-muted">{post.department} · {post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : ''}</div>
                </div>
                <span className="badge badge-blue">{CAT_ICONS[post.category]} {post.category}</span>
              </div>
              <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 8 }}>{post.title}</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>{post.description}</p>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleLike(post)} className="btn btn-ghost btn-sm" style={{ color: liked ? '#EF4444' : 'var(--color-text-muted)' }}>
                  {liked ? '❤️' : '🤍'} {post.likes?.length || 0}
                </button>
                {post.externalLink && (
                  <a href={post.externalLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🔗 View</a>
                )}
                <button onClick={() => {
                  if (navigator.share) navigator.share({ title: post.title, text: post.description }).catch(() => {});
                  else { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
                }} className="btn btn-ghost btn-sm">📤 Share</button>
                {isHod && (
                  <button onClick={() => togglePin(post)} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
                    {post.pinned ? '📌 Unpin' : '📌 Pin'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
