import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { where, orderBy, limit, collectionGroup, query, onSnapshot, doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { db } from '../../firebase';

export default function Dashboard() {
  const { profile, role, isTeacher, isHod, isPrincipal } = useAuth();
  const { subscribe } = useFirestore();

  const [announcements, setAnnouncements] = useState([]);
  const [attendance, setAttendance]       = useState([]);
  const [leaves, setLeaves]               = useState([]);
  const [achievements, setAchievements]   = useState([]);
  const [events, setEvents]               = useState([]);
  const [unreadChats, setUnreadChats]     = useState(0);

  // Fetch latest announcements
  useEffect(() => {
    if (!profile) return;
    return subscribe('announcements', [orderBy('timestamp', 'desc'), limit(3)], setAnnouncements);
  }, [profile, subscribe]);

  // Fetch leave status (students and teachers)
  useEffect(() => {
    if (!profile) return;
    if (isTeacher) {
      if (!isHod && !isPrincipal) {
        return subscribe('leaveApplications', [where('teacherId', '==', profile.id), where('status', '==', 'pending')], setLeaves);
      }
    } else {
      return subscribe('leaveApplications', [where('studentId', '==', profile.id), orderBy('appliedAt', 'desc'), limit(3)], setLeaves);
    }
  }, [profile, isTeacher, isHod, isPrincipal, subscribe]);

  // Fetch own attendance records (student)
  useEffect(() => {
    if (!profile || isTeacher) return;
    return subscribe('attendance', [where('studentId', '==', profile.id), limit(200)], setAttendance);
  }, [profile, isTeacher, subscribe]);

  // Fetch achievement board preview
  useEffect(() => {
    if (!profile) return;
    return subscribe('achievements', [orderBy('timestamp', 'desc'), limit(2)], setAchievements);
  }, [profile, subscribe]);

  // Fetch upcoming calendar events
  useEffect(() => {
    if (!profile) return;
    return subscribe('calendar', [where('date', '>=', new Date().toISOString().split('T')[0]), orderBy('date'), limit(2)], setEvents);
  }, [profile, subscribe]);

  // Fetch unread chat count
  useEffect(() => {
    if (!profile) return;
    const q = query(collectionGroup(db, 'messages'), where('receiverId', '==', profile.id), where('read', '==', false));
    return onSnapshot(q, snap => setUnreadChats(snap.docs.length));
  }, [profile]);

  const overallAtt = calcOverallAttendance(attendance);
  const attWarning = profile?.preferences?.showAttendanceWarning && overallAtt !== null && overallAtt < (profile?.preferences?.attendanceWarningThreshold || 75);

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page animate-fade">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <p className="text-sm text-muted">{greetingTime()},</p>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 4 }}>{profile?.name?.split(' ')[0] || 'User'} 👋</h1>
        <p className="text-sm text-muted" style={{ textTransform: 'capitalize' }}>
          {role} · {profile?.department} · Year {profile?.year} · Section {profile?.section}
        </p>
      </div>

      {/* Attendance Warning Banner */}
      {attWarning && (
        <div className="animate-slide-down" style={{
          background: 'var(--color-danger-muted)', border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
          marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--color-danger)' }}>Low Attendance Alert</div>
            <div className="text-xs" style={{ color: 'var(--color-danger)' }}>
              Your overall attendance is <strong>{overallAtt}%</strong> — below your {profile?.preferences?.attendanceWarningThreshold}% threshold.
            </div>
          </div>
          <Link to="/attendance" className="btn btn-danger btn-sm" style={{ marginLeft: 'auto', flexShrink: 0 }}>View</Link>
        </div>
      )}

      {/* Stats Row */}
      {!isTeacher && (
        <div className={`dashboard-stats ${profile?.preferences?.dashboardLayout === 'list' ? 'list' : ''}`}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--color-primary-muted)' }}>📊</div>
            <div>
              <div className="stat-value" style={{ color: overallAtt && overallAtt < 75 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {overallAtt !== null ? `${overallAtt}%` : '—'}
              </div>
              <div className="stat-label">Attendance</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--color-warning-muted)' }}>📋</div>
            <div>
              <div className="stat-value">{leaves.filter(l => l.status === 'pending').length}</div>
              <div className="stat-label">Pending Leaves</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--color-success-muted)' }}>💬</div>
            <div>
              <div className="stat-value">{unreadChats}</div>
              <div className="stat-label">Unread Chats</div>
            </div>
          </div>
        </div>
      )}
      
      {isTeacher && !isHod && !isPrincipal && (
        <div className={`dashboard-stats ${profile?.preferences?.dashboardLayout === 'list' ? 'list' : ''}`}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--color-warning-muted)' }}>📋</div>
            <div>
              <div className="stat-value">{leaves.length}</div>
              <div className="stat-label">Pending Leave Approvals</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--color-success-muted)' }}>💬</div>
            <div>
              <div className="stat-value">{unreadChats}</div>
              <div className="stat-label">Unread Chats</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links Grid */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)' }}>Quick Access</h3>
        <div className="quick-grid">
          {quickLinks(role).map(link => (
            <Link key={link.to} to={link.to} className="quick-link">
              <span className="quick-link-icon">{link.icon}</span>
              <span className="quick-link-label">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* StudyGPT CTA */}
      <Link to="/studygpt" className="study-gpt-cta animate-slide-up">
        <div>
          <div className="font-semibold" style={{ color: '#fff', fontSize:'var(--font-size-md)' }}>Ask StudyGPT</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>AI-powered academic assistant</div>
        </div>
        <span style={{ fontSize: 28 }}>🤖</span>
      </Link>

      {/* Calendar Preview */}
      {events.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)' }}>🗓️ Upcoming Events</h3>
            <Link to="/calendar" className="text-sm text-primary-color font-semibold">See all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {events.map(e => (
              <div key={e.id} className="card" style={{ padding: 'var(--space-4)', borderLeft: '3px solid var(--color-warning)' }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm truncate">{e.title}</div>
                  <div className="badge badge-grey">{e.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements Preview */}
      {announcements.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)' }}>Announcements</h3>
            <Link to="/announcements" className="text-sm text-primary-color font-semibold">See all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {announcements.slice(0, 2).map(a => (
              <div key={a.id} className="card" style={{ padding: 'var(--space-4)', borderLeft: '3px solid var(--color-primary)' }}>
                <div className="flex items-center justify-between gap-2" style={{ marginBottom: 4 }}>
                  <span className="font-semibold text-sm truncate">{a.title}</span>
                  {a.scope === 'college-wide' && <span className="badge badge-blue">📢 College</span>}
                </div>
                <p className="text-xs text-muted truncate">{a.body}</p>
                <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                  {a.timestamp?.toDate ? formatDistanceToNow(a.timestamp.toDate(), { addSuffix: true }) : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements Preview */}
      {profile?.preferences?.showAchievementsOnDashboard && achievements.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)' }}>🌟 Achievements</h3>
            <Link to="/achievements" className="text-sm text-primary-color font-semibold">See all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {achievements.map(a => (
              <div key={a.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ fontSize: 28 }}>{categoryIcon(a.category)}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{a.title}</div>
                    <div className="text-xs text-muted">{a.posterName} · {a.department}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teacher extras */}
      {isTeacher && !isHod && !isPrincipal && <TeacherDashboardExtras profile={profile} />}
      {isHod && <HodDashboardExtras profile={profile} />}
      {isPrincipal && <PrincipalDashboardExtras />}

      <style>{`
        .dashboard-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-bottom: var(--space-6); }
        .dashboard-stats.list { grid-template-columns: 1fr; }
        .stat-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); display: flex; align-items: center; gap: var(--space-3); transition: box-shadow var(--transition-fast); }
        .stat-card:hover { box-shadow: var(--shadow-md); }
        .stat-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .stat-value { font-size: var(--font-size-xl); font-weight: 800; color: var(--color-text-primary); line-height: 1; }
        .stat-label { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; }
        .quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
        @media (max-width: 480px) { .quick-grid { grid-template-columns: repeat(3, 1fr); } .dashboard-stats { grid-template-columns: repeat(2, 1fr); } }
        .quick-link { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-4) var(--space-2); border-radius: var(--radius-lg); background: var(--color-surface); border: 1px solid var(--color-border); text-decoration: none !important; transition: all var(--transition-fast); }
        .quick-link:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); border-color: var(--color-primary); }
        .quick-link-icon { font-size: 26px; }
        .quick-link-label { font-size: 11px; font-weight: 600; color: var(--color-text-secondary); text-align: center; }
        .study-gpt-cta { display: flex; align-items: center; justify-content: space-between; padding: var(--space-5); border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light)); text-decoration: none !important; transition: all var(--transition-fast); box-shadow: var(--shadow-glow); }
        .study-gpt-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(30,58,138,0.35); }
      `}</style>
    </div>
  );
}

function TeacherDashboardExtras({ profile }) {
  return (
    <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={{ background: 'var(--color-warning-muted)', borderColor: 'var(--color-warning)', padding: 'var(--space-4)' }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 24 }}>📋</span>
          <div>
            <div className="font-semibold text-sm">Attendance Reminder</div>
            <div className="text-xs text-muted">Check if today's attendance has been marked</div>
          </div>
          <Link to="/attendance" className="btn btn-accent btn-sm" style={{ marginLeft: 'auto' }}>Mark Now</Link>
        </div>
      </div>
    </div>
  );
}

function HodDashboardExtras({ profile }) {
  return (
    <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
          <span className="font-semibold text-sm">Dept Attendance Heatmap</span>
          <span className="text-xs text-muted">{profile.department}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
          {['Yr 1','Yr 2','Yr 3','Yr 4'].map((yr, i) => (
             <div key={yr} style={{ padding: 'var(--space-2)', textAlign: 'center', background: `rgba(16, 185, 129, ${0.2 + (i*0.2)})`, borderRadius: 'var(--radius-sm)' }}>
                <div className="text-sm font-semibold">{yr}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{82 + i * 4}%</div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrincipalDashboardExtras() {
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'storage'), snap => {
      if (snap.exists()) setStorageInfo(snap.data());
    });
    return unsub;
  }, []);

  const usedGB = storageInfo?.usedMB ? (storageInfo.usedMB / 1024).toFixed(2) : 0;
  const pct = Math.min(100, Math.round((storageInfo?.usedMB || 0) / (5 * 1024) * 100));

  return (
    <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
          <span className="font-semibold text-sm">Storage Usage</span>
          <span className="text-xs text-muted">Firebase Storage</span>
        </div>
        <div style={{ height: 8, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 'var(--radius-full)',
            background: pct > 80 ? 'var(--color-danger)' : pct > 60 ? 'var(--color-warning)' : 'var(--color-success)',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 6 }}>~{usedGB} GB / 5 GB</div>
      </div>
      <Link to="/admin" className="btn btn-primary">Open Admin Panel →</Link>
    </div>
  );
}

function calcOverallAttendance(records) {
  if (!records.length) return null;
  const present = records.filter(r => r.status === 'present' || r.status === 'leave').length;
  return Math.round((present / records.length) * 100);
}

function categoryIcon(cat) {
  const m = { certification:'🏅', competition:'🏆', project:'💡', publication:'📖', sports:'⚽', other:'🌟' };
  return m[cat] || '🌟';
}

function quickLinks(role) {
  const all = [
    { to: '/attendance', icon: '📊', label: 'Attendance' },
    { to: '/results', icon: '🏆', label: 'Results' },
    { to: '/calendar', icon: '🗓️', label: 'Calendar' },
    { to: '/timetable', icon: '📅', label: 'Timetable' },
    { to: '/announcements', icon: '📢', label: 'Announce' },
    { to: '/leave', icon: '📋', label: 'Leave' },
    { to: '/achievements', icon: '🌟', label: 'Achieve' },
    { to: '/events', icon: '🎪', label: 'Events' },
  ];
  if (['hod','principal'].includes(role)) all.push({ to: '/admin', icon: '🛡️', label: 'Admin' });
  return all.slice(0, 8);
}
