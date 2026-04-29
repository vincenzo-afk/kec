import React, { useState } from 'react';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function FeedbackSubmit() {
  const [text, setText] = useState('');
  const [targetType, setTargetType] = useState('Facility');
  const [targetName, setTargetName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return toast.error('Feedback text is required');
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('submitAnonymousFeedback', {
        body: { text, targetType, targetName }
      });
      if (error) throw error;
      toast.success('Feedback submitted anonymously!');
      navigate('/');
    } catch (err) {
      toast.error('Failed to submit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>💭 Anonymous Feedback</h2>
        <p className="text-muted text-sm">100% confidential. Your identity is completely hidden.</p>
      </div>

      <div className="card" style={{ padding: 'var(--space-6)', maxWidth: 600, margin: '0 auto' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              <option value="Facility">Facility / Infrastructure</option>
              <option value="Subject">Specific Subject / Course</option>
              <option value="Teacher">Teacher / Professor</option>
              <option value="General">General College Feedback</option>
            </select>
          </div>

          {(targetType === 'Subject' || targetType === 'Teacher') && (
            <div className="form-group animate-fade" style={{ animationDuration: '0.2s' }}>
              <label className="form-label">{targetType} Name</label>
              <input 
                className="form-input" 
                placeholder={`e.g., ${targetType === 'Teacher' ? 'Dr. Smith' : 'Data Structures'}`}
                value={targetName} 
                onChange={(e) => setTargetName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Your Feedback</label>
            <textarea 
              className="form-input" 
              placeholder="Be honest, be constructive... What can be improved?" 
              value={text} 
              onChange={(e) => setText(e.target.value)}
              rows={6}
              required
            />
          </div>

          <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 24 }}>🔒</span>
            <div>
              <div className="font-semibold text-sm">Strictly Anonymous</div>
              <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                Our system intentionally strips all user identifiers before storing this information. No one, not even administrators, can trace this back to your account.
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 'var(--space-2)' }}>
            {loading ? <span className="spinner" /> : '🚀 Submit Anonymously'}
          </button>
        </form>
      </div>
    </div>
  );
}
