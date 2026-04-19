import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { loginWithEmail, requestPhoneOtp, verifyPhoneOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('email');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Enter email and password');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' ? 'Invalid email or password' : err.message;
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
          <h1 className="auth-title">KingstonConnect AI</h1>
          <p className="auth-subtitle">Your College, Smarter.</p>
        </div>

        {tab === 'phone' ? (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              if (!verificationId) {
                const confirmationResult = await requestPhoneOtp(phone, 'recaptcha-container');
                setVerificationId(confirmationResult.verificationId);
                toast.success('OTP sent to your phone');
              } else {
                await verifyPhoneOtp(verificationId, otp);
              }
            } catch (err) {
              toast.error(err.message);
            } finally {
              setLoading(false);
            }
          }} className="auth-form">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" type="tel" placeholder="+919876543210" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            {verificationId && (
              <div className="form-group">
                <label className="form-label">OTP</label>
                <input className="form-input" placeholder="6-digit code" value={otp} onChange={e => setOtp(e.target.value)} required />
              </div>
            )}
            <div id="recaptcha-container" />
            <button className="btn btn-primary btn-full btn-lg" disabled={loading} type="submit">
              {loading ? <span className="spinner" /> : verificationId ? 'Verify OTP' : 'Send OTP'}
            </button>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => { setTab('email'); setVerificationId(''); setOtp(''); }}>Back to Login</button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">College Email</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="you@kec.edu.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button id="login-submit" className="btn btn-primary btn-full btn-lg" disabled={loading} type="submit">
            {loading ? <><span className="spinner" /> Signing in…</> : 'Sign In'}
          </button>
        </form>
        )}

        {true && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Link to="/reset-password" className="btn btn-ghost btn-sm" style={{ alignSelf: 'center' }}>Forgot password?</Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab('phone')} style={{ alignSelf: 'center' }}>
              Sign in with Phone OTP
            </button>
            <Link to="/signup" className="text-sm text-primary-color font-semibold">
              New here? Create an account →
            </Link>
          </div>
        )}
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
        .auth-logo { text-align: center; margin-bottom: var(--space-8); }
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
