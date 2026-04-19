import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/', icon: '⊞', label: 'Dashboard', end: true },
      { to: '/studygpt', icon: '🤖', label: 'StudyGPT' },
      { to: '/chat', icon: '💬', label: 'Chat' },
      { to: '/announcements', icon: '📢', label: 'Announcements' },
    ],
  },
  {
    label: 'Academic',
    items: [
      { to: '/attendance', icon: '📊', label: 'Attendance' },
      { to: '/results', icon: '🏆', label: 'Results' },
      { to: '/timetable', icon: '📅', label: 'Timetable' },
      { to: '/calendar', icon: '🗓️', label: 'Calendar' },
      { to: '/notes', icon: '📝', label: 'Notes Upload' },
    ],
  },
  {
    label: 'Community',
    items: [
      { to: '/achievements', icon: '🌟', label: 'Achievements' },
      { to: '/events', icon: '🎪', label: 'Events' },
      { to: '/leave', icon: '📋', label: 'Leave' },
    ],
  },
];

export default function Sidebar() {
  const { profile, logout, isPrincipal } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); }
    catch { toast.error('Logout failed'); }
  };

  const initials = (profile?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎓</div>
        {!collapsed && (
          <div>
            <div className="sidebar-logo-name">KingstonConnect</div>
            <div className="sidebar-logo-tag">AI Super-App</div>
          </div>
        )}
        <button className="btn btn-ghost btn-icon sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label} className="sidebar-group">
            {!collapsed && <div className="sidebar-group-label">{group.label}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        {isPrincipal && (
          <div className="sidebar-group">
            {!collapsed && <div className="sidebar-group-label">Admin</div>}
            <NavLink to="/admin" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} title={collapsed ? 'Admin Panel' : undefined}>
              <span className="sidebar-item-icon">🛡️</span>
              {!collapsed && <span className="sidebar-item-label">Admin Panel</span>}
            </NavLink>
          </div>
        )}
      </nav>

      {/* Profile / Logout */}
      <div className="sidebar-footer">
        <NavLink to="/settings/profile" className="sidebar-profile" title={collapsed ? profile?.name : undefined}>
          <div className="avatar avatar-sm" style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary)', fontSize: 12, fontWeight: 700 }}>
            {profile?.profilePhotoURL
              ? <img src={profile.profilePhotoURL} alt={profile.name} />
              : initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-semibold text-sm">{profile?.name || 'User'}</div>
              <div className="truncate text-xs text-muted" style={{ textTransform: 'capitalize' }}>{profile?.role || 'Student'}</div>
            </div>
          )}
        </NavLink>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={handleLogout} title="Logout" style={{ flexShrink: 0 }}>
          🚪
        </button>
      </div>

      <style>{`
        .sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 90;
          width: var(--sidebar-width);
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          display: none; flex-direction: column;
          transition: width var(--transition-base);
          overflow: hidden;
        }
        .sidebar.collapsed { width: 68px; }
        @media (min-width: 768px) { .sidebar { display: flex; } }

        .sidebar-logo {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-5) var(--space-4);
          border-bottom: 1px solid var(--color-border);
          min-height: 72px;
        }
        .sidebar-logo-icon {
          width: 36px; height: 36px; border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
          box-shadow: var(--shadow-glow);
        }
        .sidebar-logo-name { font-size: var(--font-size-sm); font-weight: 800; color: var(--color-text-primary); white-space: nowrap; }
        .sidebar-logo-tag { font-size: var(--font-size-xs); color: var(--color-text-muted); }
        .sidebar-collapse-btn { margin-left: auto; }

        .sidebar-nav { flex: 1; overflow-y: auto; padding: var(--space-4) var(--space-3); }
        .sidebar-group { margin-bottom: var(--space-5); }
        .sidebar-group-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--color-text-muted);
          padding: 0 var(--space-2); margin-bottom: var(--space-2);
        }
        .sidebar-item {
          display: flex; align-items: center; gap: var(--space-3);
          padding: 9px var(--space-3); border-radius: var(--radius-md);
          color: var(--color-text-secondary); text-decoration: none !important;
          font-size: var(--font-size-sm); font-weight: 500;
          transition: all var(--transition-fast); white-space: nowrap;
          margin-bottom: 2px;
        }
        .sidebar-item:hover { background: var(--color-bg-secondary); color: var(--color-text-primary); }
        .sidebar-item.active {
          background: var(--color-primary-muted); color: var(--color-primary);
          font-weight: 600;
        }
        .sidebar-item-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }

        .sidebar-footer {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-4);
          border-top: 1px solid var(--color-border);
        }
        .sidebar-profile {
          display: flex; align-items: center; gap: var(--space-2);
          flex: 1; min-width: 0; text-decoration: none !important;
          color: var(--color-text-primary);
        }
        .sidebar-profile:hover { opacity: 0.8; }
      `}</style>
    </aside>
  );
}
