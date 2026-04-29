import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function FeedbackDashboard() {
  const { profile, isPrincipal, isHod } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ sentiment: 'All', type: 'All' });

  useEffect(() => {
    if (!isPrincipal && !isHod) return;

    let q = supabase.from('feedback').select('*').order('createdAt', { ascending: false });
    if (!isPrincipal) {
      q = q.eq('department', profile.department);
    }

    q.then(({ data, error }) => {
      if (error) {
        console.error(error);
        toast.error('Failed to load feedback');
      } else {
        setFeedbacks(data || []);
      }
      setLoading(false);
    });
  }, [profile, isPrincipal, isHod]);

  const toggleRead = async (id, currentRead) => {
    try {
      await supabase.from('feedback').update({ isRead: !currentRead }).eq('id', id);
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, isRead: !currentRead } : f));
    } catch {
      toast.error('Could not update status');
    }
  };

  const filtered = feedbacks.filter(f => {
    if (filter.sentiment !== 'All' && f.sentiment !== filter.sentiment) return false;
    if (filter.type !== 'All' && f.targetType !== filter.type) return false;
    return true;
  });

  const getSentimentBadge = (s) => {
    if (s === 'Positive') return 'badge-green';
    if (s === 'Negative') return 'badge-red';
    return 'badge-grey';
  };

  if (!isPrincipal && !isHod) {
    return <div className="page animate-fade flex items-center justify-center p-8 text-muted">Access Denied</div>;
  }

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>📊 Direct Feedback Dashboard</h2>
        <div className="text-muted text-sm">
          {isPrincipal ? 'Viewing all departments' : `Viewing feedback for ${profile?.department} department`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <select className="form-select" value={filter.sentiment} onChange={e => setFilter(f => ({ ...f, sentiment: e.target.value }))}>
          <option value="All">All Sentiments</option>
          <option value="Positive">🟩 Positive</option>
          <option value="Neutral">⬜ Neutral</option>
          <option value="Negative">🟥 Negative</option>
        </select>
        <select className="form-select" value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="All">All Categories</option>
          <option value="Facility">Facility</option>
          <option value="Subject">Subject</option>
          <option value="Teacher">Teacher</option>
        </select>
        <div className="badge badge-blue flex items-center" style={{ marginLeft: 'auto' }}>
          Total: {filtered.length} Responses
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8"><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          No feedback found matching the criteria.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(f => (
            <div key={f.id} className={`card ${f.isRead ? 'opacity-80' : ''}`} style={{ padding: 'var(--space-4)', borderLeft: !f.isRead ? '4px solid var(--color-primary)' : '4px solid transparent' }}>
              <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-2)' }}>
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="badge badge-grey font-semibold">{f.targetType}</span>
                  {(f.targetType === 'Subject' || f.targetType === 'Teacher') && (
                    <span className="text-sm font-semibold text-primary">{f.targetName}</span>
                  )}
                  {isPrincipal && <span className="text-xs text-muted">({f.department})</span>}
                  <span className={`badge ${getSentimentBadge(f.sentiment)}`}>
                    {f.sentiment === 'Positive' ? '🟩' : f.sentiment === 'Negative' ? '🟥' : '⬜'} {f.sentiment}
                  </span>
                  <span className="badge badge-blue">#{f.topic || 'General'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    {f.createdAt ? formatDistanceToNow(new Date(f.createdAt), { addSuffix: true }) : 'Just now'}
                  </span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleRead(f.id, f.isRead)} title={f.isRead ? 'Mark Unread' : 'Mark Read'}>
                    {f.isRead ? '📖' : '📕'}
                  </button>
                </div>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                "{f.text}"
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
