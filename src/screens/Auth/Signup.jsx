import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
  const { signupWithEmail } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Fill all fields');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await signupWithEmail(form.email, form.password, form.name);
      toast.success('Account created! Awaiting admin approval.');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use' ? 'Email already registered' : err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-scale">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎓</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join KingstonConnect AI — KEC</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input id="signup-name" className="form-input" type="text" placeholder="Your full name" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">College Email</label>
            <input id="signup-email" className="form-input" type="email" placeholder="you@kec.edu.in" value={form.email} onChange={set('email')} autoComplete="email" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="signup-password" className="form-input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input id="signup-confirm" className="form-input" type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} required />
          </div>

          <div style={{ background: 'var(--color-gold-muted, rgba(245,158,11,0.1))', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            💡 After signup, an admin will review and approve your account. You'll get a notification once approved.
          </div>

          <button id="signup-submit" className="btn btn-primary btn-full btn-lg" disabled={loading} type="submit">
            {loading ? <><span className="spinner" /> Creating account…</> : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
          <Link to="/login" className="text-sm text-primary-color font-semibold">
            Already have an account? Sign In →
          </Link>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100dvh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #152C6E 100%);
          padding: var(--space-6) var(--space-4);
        }
        .auth-card {
          background: var(--color-surface); border-radius: var(--radius-xl);
          padding: var(--space-8); width: 100%; max-width: 420px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
        }
        .auth-logo { text-align: center; margin-bottom: var(--space-6); }
        .auth-logo-icon {
          width: 72px; height: 72px; border-radius: var(--radius-lg);
          background: linear-gradient(135deg, #1E3A8A, #2D52B8);
          display: flex; align-items: center; justify-content: center;
          font-size: 36px; margin: 0 auto var(--space-4);
          box-shadow: var(--shadow-glow);
        }
        .auth-title { font-size: var(--font-size-xl); font-weight: 800; color: var(--color-primary); margin-bottom: 4px; }
        .auth-subtitle { color: var(--color-text-muted); font-size: var(--font-size-sm); }
        .auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
      `}</style>
    </div>
  );
}
