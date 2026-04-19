import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function PendingApproval() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #152C6E 100%)',
      padding: 'var(--space-6) var(--space-4)',
    }}>
      <div className="animate-scale" style={{
        background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-10)', maxWidth: 460, width: '100%',
        textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
      }}>
        <div style={{ fontSize: 64, marginBottom: 'var(--space-5)' }}>⏳</div>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>Awaiting Approval</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.7 }}>
          Hi <strong style={{ color: 'var(--color-text-primary)' }}>{profile?.name || 'there'}</strong>! Your account has been created and is pending admin approval.<br /><br />
          The Principal will review your account and assign your role, department, year, and section. You'll receive a push notification once approved.
        </p>

        <div style={{
          background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)', marginBottom: 'var(--space-6)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        }}>
          <div className="flex items-center gap-2 justify-between">
            <span className="text-sm text-muted">Email</span>
            <span className="text-sm font-semibold">{profile?.email}</span>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <span className="text-sm text-muted">Status</span>
            <span className="badge badge-gold">Pending Review</span>
          </div>
        </div>

        <button className="btn btn-secondary btn-full" onClick={handleLogout}>
          Sign out & try different account
        </button>
      </div>
    </div>
  );
}
