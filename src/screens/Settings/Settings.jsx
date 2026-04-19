import React, { useState } from 'react';
import { NavLink, Outlet, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePreferences } from '../../hooks/usePreferences';
import { useGemini } from '../../hooks/useGemini';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const SECTIONS = [
  { id: 'appearance',   icon: '🎨', label: 'Appearance' },
  { id: 'language',     icon: '🌐', label: 'Language & Region' },
  { id: 'ai',           icon: '🤖', label: 'AI / StudyGPT' },
  { id: 'notifications',icon: '🔔', label: 'Notifications' },
  { id: 'academic',     icon: '📊', label: 'Attendance & Academic' },
  { id: 'chat',         icon: '💬', label: 'Chat' },
  { id: 'privacy',      icon: '🔒', label: 'Privacy & Security' },
  { id: 'profile',      icon: '👤', label: 'Profile' },
];

export default function Settings() {
  const { section = 'appearance' } = useParams();
  const navigate = useNavigate();

  return (
    <div className="page animate-fade" style={{ maxWidth: 720 }}>
      <h2 style={{ marginBottom: 'var(--space-5)' }}>Settings</h2>
      <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/settings/${s.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: section === s.id ? 'var(--color-primary-muted)' : 'transparent',
                color: section === s.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: section === s.id ? 700 : 500,
                fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-sans)',
                transition: 'all 0.15s',
              }}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {section === 'appearance'    && <AppearanceSettings />}
          {section === 'language'      && <LanguageSettings />}
          {section === 'ai'            && <AISettings />}
          {section === 'notifications' && <NotificationSettings />}
          {section === 'academic'      && <AcademicSettings />}
          {section === 'chat'          && <ChatSettings />}
          {section === 'privacy'       && <PrivacySettings />}
          {section === 'profile'       && <ProfileSettings />}
          {!SECTIONS.find(s => s.id === section) && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}

/* ── Reusable Setting Row ── */
function SettingRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <div className="font-semibold text-sm">{label}</div>
        {hint && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: value ? 'var(--color-primary)' : 'var(--color-border)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: value ? 23 : 3,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="form-select" style={{ width: 'auto', minWidth: 130 }} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

/* ── Appearance ── */
function AppearanceSettings() {
  const { theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize } = useTheme();
  const { updatePreferences } = usePreferences();

  const applyTheme = (t) => { setTheme(t); updatePreferences({ theme: t }); };
  const applyAccent = (c) => { setAccentColor(c); updatePreferences({ accentColor: c }); };
  const applyFontSize = (s) => { setFontSize(s); updatePreferences({ fontSize: s }); };

  const ACCENTS = ['#F59E0B','#3B82F6','#10B981','#8B5CF6','#EF4444','#EC4899','#06B6D4','#F97316'];

  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-md)' }}>🎨 Appearance</h3>
      <SettingRow label="Theme" hint="System follows OS preference">
        <Select value={theme} onChange={applyTheme} options={[['light','Light'],['dark','Dark'],['system','System']]} />
      </SettingRow>
      <SettingRow label="Font Size" hint="Scales all body text">
        <Select value={fontSize} onChange={applyFontSize} options={[['small','Small'],['medium','Medium'],['large','Large']]} />
      </SettingRow>
      <SettingRow label="Accent Color" hint="Changes buttons, active tabs, highlights">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 180 }}>
          {ACCENTS.map(c => (
            <button key={c} onClick={() => applyAccent(c)} style={{
              width: 24, height: 24, borderRadius: '50%', background: c, border: accentColor === c ? '2px solid var(--color-text-primary)' : '2px solid transparent', cursor: 'pointer',
            }} />
          ))}
          <input type="color" value={accentColor} onChange={e => applyAccent(e.target.value)} title="Custom color" style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
        </div>
      </SettingRow>
    </div>
  );
}

/* ── Language ── */
function LanguageSettings() {
  const { preferences, updatePreference } = usePreferences();
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-md)' }}>🌐 Language & Region</h3>
      <SettingRow label="App Language">
        <Select value={preferences.language || 'en'} onChange={v => updatePreference('language', v)} options={[['en','English'],['ta','Tamil']]} />
      </SettingRow>
      <SettingRow label="AI Response Language">
        <Select value={preferences.aiResponseLanguage || 'auto'} onChange={v => updatePreference('aiResponseLanguage', v)} options={[['auto','Auto-detect'],['en','Always English'],['ta','Always Tamil']]} />
      </SettingRow>
      <SettingRow label="Calendar Start Day">
        <Select value={preferences.calendarStartDay || 'sun'} onChange={v => updatePreference('calendarStartDay', v)} options={[['sun','Sunday'],['mon','Monday']]} />
      </SettingRow>
    </div>
  );
}

/* ── AI Settings ── */
function AISettings() {
  const { preferences, updatePreference } = usePreferences();
  const { encryptApiKey, clearApiKey } = useGemini();
  const { profile } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const saveKey = async () => {
    if (!apiKey.trim()) return toast.error('Enter your Gemini API key');
    setSaving(true);
    try {
      await encryptApiKey(apiKey.trim());
      setApiKey('');
      toast.success('API key saved securely!');
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const removeKey = async () => {
    await clearApiKey();
    toast.success('API key removed');
  };

  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-md)' }}>🤖 AI / StudyGPT</h3>
      <SettingRow label="AI Personality" hint="Changes system prompt tone">
        <Select value={preferences.studyGptPersonality || 'friendly'} onChange={v => updatePreference('studyGptPersonality', v)} options={[['formal','Formal'],['friendly','Friendly'],['tutor','Tutor']]} />
      </SettingRow>
      <SettingRow label="Include Attendance" hint="Send attendance data to Gemini">
        <Toggle value={preferences.includeAttendance !== false} onChange={v => updatePreference('includeAttendance', v)} />
      </SettingRow>
      <SettingRow label="Include Results" hint="Send test scores to Gemini">
        <Toggle value={preferences.includeResults !== false} onChange={v => updatePreference('includeResults', v)} />
      </SettingRow>
      <SettingRow label="Include Notes" hint="Send section PDFs to Gemini">
        <Toggle value={preferences.includeNotes !== false} onChange={v => updatePreference('includeNotes', v)} />
      </SettingRow>
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
          Gemini API Key {profile?.encryptedGeminiKey ? '✅ Set' : '❌ Not set'}
        </label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input className="form-input" type="password" placeholder="AIza…" value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={saveKey} disabled={saving}>{saving ? <span className="spinner"/> : 'Save'}</button>
          {profile?.encryptedGeminiKey && <button className="btn btn-danger btn-sm" onClick={removeKey}>Remove</button>}
        </div>
        <p className="form-hint" style={{ marginTop: 6 }}>Your key is AES-256 encrypted server-side and never exposed to the client again.</p>
      </div>
    </div>
  );
}

/* ── Notifications ── */
function NotificationSettings() {
  const { preferences, updatePreference } = usePreferences();
  const types = [
    ['announcements','New Announcements'],['chatP2P','P2P Messages'],['chatGroup','Group Messages'],
    ['results','New Test Results'],['notes','New Notes'],['leave','Leave Updates'],
    ['events','New Events'],['achievements','Achievement Posts'],['calendar','Calendar Reminders'],
  ];
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-md)' }}>🔔 Notifications</h3>
      <SettingRow label="Enable All Notifications">
        <Toggle value={preferences.notificationsEnabled !== false} onChange={v => updatePreference('notificationsEnabled', v)} />
      </SettingRow>
      {types.map(([k, l]) => (
        <SettingRow key={k} label={l}>
          <Toggle value={preferences.notificationTypes?.[k] !== false} onChange={v => updatePreference(`notificationTypes.${k}`, v)} />
        </SettingRow>
      ))}
    </div>
  );
}

/* ── Academic ── */
function AcademicSettings() {
  const { preferences, updatePreference } = usePreferences();
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-md)' }}>📊 Attendance & Academic</h3>
      <SettingRow label="Attendance Warning Banner" hint="Shown on Dashboard if below threshold">
        <Toggle value={preferences.showAttendanceWarning !== false} onChange={v => updatePreference('showAttendanceWarning', v)} />
      </SettingRow>
      <SettingRow label="Warning Threshold" hint={`Currently: ${preferences.attendanceWarningThreshold || 75}%`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min={50} max={90} step={5} value={preferences.attendanceWarningThreshold || 75} onChange={e => updatePreference('attendanceWarningThreshold', Number(e.target.value))} style={{ width: 120 }} />
          <span className="text-sm font-semibold">{preferences.attendanceWarningThreshold || 75}%</span>
        </div>
      </SettingRow>
      <SettingRow label="Show Achievement Board on Dashboard">
        <Toggle value={preferences.showAchievementsOnDashboard !== false} onChange={v => updatePreference('showAchievementsOnDashboard', v)} />
      </SettingRow>
    </div>
  );
}

/* ── Chat ── */
function ChatSettings() {
  const { preferences, updatePreference } = usePreferences();
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-md)' }}>💬 Chat</h3>
      <SettingRow label="Chat Bubble Style">
        <Select value={preferences.chatBubbleStyle || 'modern'} onChange={v => updatePreference('chatBubbleStyle', v)} options={[['modern','Modern'],['classic','Classic'],['minimal','Minimal']]} />
      </SettingRow>
      <SettingRow label="Show Read Receipts">
        <Toggle value={preferences.showReadReceipts !== false} onChange={v => updatePreference('showReadReceipts', v)} />
      </SettingRow>
      <SettingRow label="Show Online Status">
        <Toggle value={preferences.showOnlineStatus !== false} onChange={v => updatePreference('showOnlineStatus', v)} />
      </SettingRow>
    </div>
  );
}

/* ── Privacy ── */
function PrivacySettings() {
  const { preferences, updatePreference } = usePreferences();
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-md)' }}>🔒 Privacy & Security</h3>
      <SettingRow label="Two-Factor Authentication (2FA)" hint="Require SMS or Authenticator on login">
        <Toggle value={preferences.twoFactorEnabled !== false} onChange={v => {
          updatePreference('twoFactorEnabled', v);
          toast.success(v ? '2FA Enabled!' : '2FA Disabled');
        }} />
      </SettingRow>
      <SettingRow label="Last Active Visibility">
        <Select value={preferences.lastActiveVisibility || 'everyone'} onChange={v => updatePreference('lastActiveVisibility', v)} options={[['everyone','Everyone'],['teachers','Only Teachers'],['none','No One']]} />
      </SettingRow>
      <SettingRow label="Allow P2P Messages From">
        <Select value={preferences.allowP2PFrom || 'everyone'} onChange={v => updatePreference('allowP2PFrom', v)} options={[['everyone','Everyone'],['teachers','Teachers Only'],['none','No One']]} />
      </SettingRow>
      <SettingRow label="Profile Photo Visibility">
        <Select value={preferences.profilePhotoVisibility || 'everyone'} onChange={v => updatePreference('profilePhotoVisibility', v)} options={[['everyone','Everyone'],['section','My Section'],['me','Only Me']]} />
      </SettingRow>
    </div>
  );
}

/* ── Profile ── */
function ProfileSettings() {
  const { profile, user } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef(null);

  const saveName = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: name.trim() });
      toast.success('Name updated!');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `profile-photos/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { profilePhotoURL: url });
      toast.success('Photo updated!');
    } catch (e) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const initials = (profile?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-md)' }}>👤 Profile</h3>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div className="avatar avatar-xl" style={{ margin: '0 auto', background: 'var(--color-primary-muted)', color: 'var(--color-primary)', fontSize: 28, fontWeight: 800 }}>
            {profile?.profilePhotoURL ? <img src={profile.profilePhotoURL} alt={profile.name} /> : initials}
          </div>
          <button onClick={() => fileRef.current?.click()} style={{
            position: 'absolute', bottom: 0, right: 0, width: 26, height: 26,
            borderRadius: '50%', background: 'var(--color-primary)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {uploading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✏️'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadPhoto} />
        </div>
      </div>

      <SettingRow label="Full Name">
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} style={{ width: 160 }} />
          <button className="btn btn-primary btn-sm" onClick={saveName} disabled={saving}>Save</button>
        </div>
      </SettingRow>
      <SettingRow label="Email"><span className="text-sm text-muted">{profile?.email}</span></SettingRow>
      <SettingRow label="Register Number"><span className="text-sm text-muted">{profile?.registerNumber || '—'}</span></SettingRow>
      <SettingRow label="Role"><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{profile?.role}</span></SettingRow>
      <SettingRow label="Department / Year / Section">
        <span className="text-sm text-muted">{profile?.department} · Year {profile?.year} · Sec {profile?.section}</span>
      </SettingRow>
      <div style={{ marginTop: 'var(--space-5)' }}>
        <button className="btn btn-secondary btn-full" onClick={() => {
          const profileLink = `${window.location.origin}/profile/${profile.id}`;
          navigator.clipboard.writeText(`Check out my KingstonConnect profile!\nName: ${profile.name}\nDept: ${profile.department}\n${profileLink}`);
          toast.success('Profile card link copied to clipboard!');
        }}>
          🔗 Share Profile Card
        </button>
      </div>
    </div>
  );
}
