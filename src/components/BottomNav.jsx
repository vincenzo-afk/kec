import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', icon: '⊞', label: 'Home', end: true },
  { to: '/studygpt', icon: '🤖', label: 'StudyGPT' },
  { to: '/attendance', icon: '📊', label: 'Attendance' },
  { to: '/chat', icon: '💬', label: 'Chat' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
      <style>{`
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center;
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          height: var(--bottom-nav-height);
          padding: 0 var(--space-2);
          backdrop-filter: blur(12px);
          box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
        }
        @media (min-width: 768px) { .bottom-nav { display: none; } }
        .bottom-nav-item {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          gap: 3px; padding: 6px 4px; border-radius: var(--radius-md);
          color: var(--color-text-muted); text-decoration: none !important;
          transition: color var(--transition-fast);
          font-size: var(--font-size-xs); font-weight: 500;
        }
        .bottom-nav-item.active { color: var(--color-primary); }
        .bottom-nav-icon { font-size: 20px; line-height: 1; }
        .bottom-nav-label { font-size: 10px; font-weight: 600; }
      `}</style>
    </nav>
  );
}
