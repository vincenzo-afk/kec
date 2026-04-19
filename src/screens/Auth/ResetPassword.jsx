import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email');
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('Password reset email sent');
      navigate('/login');
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-scale">
        <h1 className="auth-title" style={{ marginBottom: 'var(--space-4)' }}>Reset Password</h1>
        <form className="auth-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">College Email</label>
            <input className="form-input" type="email" placeholder="you@kec.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-full" disabled={loading} type="submit">{loading ? 'Sending…' : 'Send Reset Link'}</button>
        </form>
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          <Link to="/login" className="text-sm text-primary-color font-semibold">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
