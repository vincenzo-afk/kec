import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Auth screens
import Login from './screens/Auth/Login';
import Signup from './screens/Auth/Signup';
import PendingApproval from './screens/Auth/PendingApproval';

// Layouts
import AppShell from './components/AppShell';

// Screens
import Dashboard from './screens/Dashboard/Dashboard';
import StudyGPT from './screens/StudyGPT/StudyGPT';
import Attendance from './screens/Attendance/Attendance';
import Results from './screens/Results/Results';
import CalendarScreen from './screens/Calendar/CalendarScreen';
import Timetable from './screens/Timetable/Timetable';
import Chat from './screens/Chat/Chat';
import Announcements from './screens/Announcements/Announcements';
import LeaveApplication from './screens/LeaveApplication/LeaveApplication';
import AchievementBoard from './screens/AchievementBoard/AchievementBoard';
import EventRegistration from './screens/EventRegistration/EventRegistration';
import Settings from './screens/Settings/Settings';
import AdminPanel from './screens/AdminPanel/AdminPanel';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireApproved({ children }) {
  const { isApproved, isPending, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (isPending) return <Navigate to="/pending" replace />;
  if (!isApproved) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isPrincipal, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!isPrincipal) return <Navigate to="/" replace />;
  return children;
}

function FullscreenSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', background: 'var(--color-bg)',
    }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1E3A8A, #2D52B8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, boxShadow: 'var(--shadow-glow)',
        }}>🎓</div>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>KingstonConnect AI</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, isApproved, isPending, loading } = useAuth();

  if (loading) return <FullscreenSpinner />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={!user ? <Login /> : (isPending ? <Navigate to="/pending" /> : <Navigate to="/" />)} />
      <Route path="/signup" element={!user ? <Signup /> : (isPending ? <Navigate to="/pending" /> : <Navigate to="/" />)} />
      <Route path="/pending" element={
        <RequireAuth>
          {isApproved ? <Navigate to="/" /> : <PendingApproval />}
        </RequireAuth>
      } />

      {/* Protected */}
      <Route path="/" element={
        <RequireAuth>
          <RequireApproved>
            <AppShell />
          </RequireApproved>
        </RequireAuth>
      }>
        <Route index element={<Dashboard />} />
        <Route path="studygpt" element={<StudyGPT />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="results" element={<Results />} />
        <Route path="calendar" element={<CalendarScreen />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:tab" element={<Chat />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="leave" element={<LeaveApplication />} />
        <Route path="achievements" element={<AchievementBoard />} />
        <Route path="events" element={<EventRegistration />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/:section" element={<Settings />} />
        <Route path="admin" element={
          <RequireAdmin>
            <AdminPanel />
          </RequireAdmin>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
