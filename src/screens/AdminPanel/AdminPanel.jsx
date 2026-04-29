import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TABS = ['users', 'storage', 'analytics', 'reports'];
const TAB_LABELS = { users: '👥 Users', storage: '💾 Storage', analytics: '📈 Analytics', reports: '📋 Reports' };

export default function AdminPanel() {
  const [tab, setTab] = useState('users');
  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>🛡️ Admin Panel</h2>
        <span className="badge badge-red">Principal Only</span>
      </div>
      <div className="tabs" style={{ marginBottom: 'var(--space-5)' }}>
        {TABS.map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      {tab === 'users'     && <UsersTab />}
      {tab === 'storage'   && <StorageTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'reports'   && <ReportsTab />}
    </div>
  );
}

/* ──────── Users Tab ──────── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ role: 'all', status: 'all', search: '' });
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('*').order('createdAt', { ascending: false }).range(0, 199);
      if (mounted && data) {
        setUsers(data);
        setPage(1);
        setLoading(false);
      }
    };
    fetchUsers();
    return () => { mounted = false; };
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const from = page * 200;
      const to = from + 199;
      const { data } = await supabase.from('users').select('*').order('createdAt', { ascending: false }).range(from, to);
      if (data && data.length > 0) {
        setUsers(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const approveUser = async (userId, approvalData) => {
    if (!approvalData.role || !approvalData.department || !approvalData.year || !approvalData.section) {
      return toast.error('Fill all assignment fields');
    }
    setProcessing(p => ({ ...p, [userId]: true }));
    
    try {
      const { error } = await supabase.from('users').update({
        role: approvalData.role,
        department: approvalData.department,
        year: approvalData.year,
        section: approvalData.section,
        approvalStatus: 'approved',
        updatedAt: new Date().toISOString(),
      }).eq('id', userId);
      
      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, ...approvalData, approvalStatus: 'approved' } : u));
      toast.success('User approved!');
    } catch (e) {
      toast.error(e?.message || 'Approval failed');
    } finally {
      setProcessing(p => ({ ...p, [userId]: false }));
    }
  };

  const suspendUser = async (userId) => {
    setProcessing(p => ({ ...p, [userId]: true }));
    try {
      const { error } = await supabase.from('users').update({
        approvalStatus: 'suspended',
        updatedAt: new Date().toISOString(),
      }).eq('id', userId);
      
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, approvalStatus: 'suspended' } : u));
      toast.success('User suspended');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(p => ({ ...p, [userId]: false }));
    }
  };

  const filtered = users.filter(u => {
    if (filter.role !== 'all' && u.role !== filter.role) return false;
    if (filter.status !== 'all' && u.approvalStatus !== filter.status) return false;
    if (filter.search && !u.name?.toLowerCase().includes(filter.search.toLowerCase()) && !u.email?.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const pending = users.filter(u => u.approvalStatus === 'pending');

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ background: 'var(--color-warning-muted)', border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)' }}>
          ⚠️ <strong>{pending.length}</strong> pending signup approval{pending.length > 1 ? 's' : ''}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ flex: 1, minWidth: 160 }} placeholder="🔍 Search name or email…" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <select className="form-select" style={{ width: 130 }} value={filter.role} onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}>
          <option value="all">All Roles</option>
          {['student','teacher','hod','principal'].map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
        </select>
        <select className="form-select" style={{ width: 140 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {loading && <div className="text-sm text-muted">Loading users…</div>}
        {filtered.length === 0 && <div className="empty-state"><div className="empty-state-icon">👥</div><p>No users found</p></div>}
        {filtered.map(u => <UserCard key={u.id} u={u} onApprove={approveUser} onSuspend={suspendUser} processing={processing[u.id]} />)}
      </div>
      {users.length >= page * 200 && (
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load More Users'}</button>
        </div>
      )}
    </div>
  );
}

function UserCard({ u, onApprove, onSuspend, processing }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ role: u.role || 'student', department: u.department || '', year: u.year || '1', section: u.section || 'A' });
  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const STATUS = { pending: 'badge-gold', approved: 'badge-green', suspended: 'badge-red' };

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div className="flex items-center justify-between gap-3" style={{ marginBottom: editing ? 'var(--space-4)' : 0 }}>
        <div className="flex items-center gap-3">
          <div className="avatar avatar-sm">{u.name?.[0] || '?'}</div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{u.name}</div>
            <div className="text-xs text-muted truncate">{u.email}</div>
            <div className="flex gap-2" style={{ marginTop: 3 }}>
              <span className={`badge ${STATUS[u.approvalStatus]}`}>{u.approvalStatus}</span>
              <span className="badge badge-grey" style={{ textTransform: 'capitalize' }}>{u.role}</span>
              {u.department && <span className="text-xs text-muted">{u.department} · Yr{u.year} · {u.section}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {u.approvalStatus === 'pending' && (
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : '✅ Approve'}
            </button>
          )}
          {u.approvalStatus === 'approved' && (
            <button className="btn btn-danger btn-sm" onClick={() => onSuspend(u.id)} disabled={processing}>
              {processing ? <span className="spinner" /> : 'Suspend'}
            </button>
          )}
          {u.approvalStatus === 'suspended' && (
            <button className="btn btn-primary btn-sm" onClick={() => onApprove(u.id, form)} disabled={processing}>
              {processing ? <span className="spinner" /> : 'Restore'}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={setF('role')}>
              {['student','teacher','hod','principal'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dept</label>
            <input className="form-input" placeholder="CSE" value={form.department} onChange={setF('department')} />
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-select" value={form.year} onChange={setF('year')}>
              {['1','2','3','4'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-select" value={form.section} onChange={setF('section')}>
              {['A','B','C','D'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" style={{ gridColumn: '1/-1' }} onClick={() => onApprove(u.id, form)} disabled={processing}>
            {processing ? <span className="spinner" /> : '✅ Confirm & Approve'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────── Storage Tab ──────── */
function StorageTab() {
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStorage = async () => {
      const { data } = await supabase.from('system').select('*').eq('id', 'storage').single();
      if (!cancelled && data) setStorageInfo(data);
    };
    
    fetchStorage();
    
    const channel = supabase.channel('system_storage_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system', filter: 'id=eq.storage' }, payload => {
        setStorageInfo(payload.new);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const usedGB = storageInfo?.usedMB ? (storageInfo.usedMB / 1024).toFixed(2) : 0;
  const pct = Math.min(100, Math.round((storageInfo?.usedMB || 0) / (5 * 1024) * 100));

  const runCleanup = async () => {
    try {
      await supabase.functions.invoke('storageMonitor', { body: { manual: true } });
      toast.success('Cleanup triggered!');
    } catch (e) { toast.error('Cleanup failed: ' + e.message); }
  };

  return (
    <div>
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-md)' }}>Supabase Storage Monitor</h3>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span className="text-sm font-semibold">{usedGB} GB / 5 GB</span>
            <span className="text-sm text-muted">{pct}% used</span>
          </div>
          <div style={{ height: 12, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`, borderRadius: 'var(--radius-full)',
              background: pct > 80 ? 'var(--color-danger)' : pct > 60 ? 'var(--color-warning)' : 'var(--color-success)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', margin: 'var(--space-4) 0' }}>
          {[
            ['💾', 'Used', `${storageInfo?.usedMB || 0} MB`],
            ['📁', 'Files', storageInfo?.fileCount || 0],
            ['🧹', 'Last Cleanup', storageInfo?.lastCleanupAt ? formatDistanceToNow(new Date(storageInfo.lastCleanupAt), { addSuffix: true }) : 'Never'],
          ].map(([icon, label, val]) => (
            <div key={label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
              <div className="font-semibold text-sm">{val}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={runCleanup}>🗑️ Run Cleanup Now</button>
      </div>
    </div>
  );
}

/* ──────── Analytics Tab ──────── */
function AnalyticsTab() {
  const [stats, setStats] = useState({ total: 0, students: 0, teachers: 0, hods: 0, pending: 0 });
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      // Just fetching all user basic info to calculate stats
      const { data } = await supabase.from('users').select('role, approvalStatus');
      if (cancelled || !data) return;
      
      setStats({
        total: data.length,
        students: data.filter(u => u.role === 'student').length,
        teachers: data.filter(u => u.role === 'teacher').length,
        hods: data.filter(u => u.role === 'hod').length,
        pending: data.filter(u => u.approvalStatus === 'pending').length,
      });
    };
    
    fetchUsers();
    
    const fetchStorage = async () => {
      const { data } = await supabase.from('system').select('*').eq('id', 'storage').single();
      if (!cancelled && data) setStorageInfo(data);
    };
    fetchStorage();
    
    return () => { cancelled = true; };
  }, []);

  const cards = [
    ['👥', 'Total Users', stats.total, 'var(--color-primary-muted)', 'var(--color-primary)'],
    ['🎓', 'Students', stats.students, 'var(--color-success-muted)', 'var(--color-success)'],
    ['👨‍🏫', 'Teachers', stats.teachers, 'var(--color-info-muted)', 'var(--color-info)'],
    ['👔', 'HODs', stats.hods, 'var(--color-warning-muted)', 'var(--color-warning)'],
    ['⏳', 'Pending', stats.pending, 'var(--color-danger-muted)', 'var(--color-danger)'],
  ];

  const health = [
    ['Supabase Auth', stats.total > 0 ? 'Operational' : 'No data', stats.total > 0 ? 'badge-green' : 'badge-grey'],
    ['PostgreSQL DB', stats.total > 0 ? 'Operational' : 'No data', stats.total > 0 ? 'badge-green' : 'badge-grey'],
    ['Storage', storageInfo?.lastCheckedAt ? 'Operational' : 'Unknown', storageInfo?.lastCheckedAt ? 'badge-green' : 'badge-gold'],
    ['Edge Functions', storageInfo?.lastCleanupAt || storageInfo?.lastCheckedAt ? 'Operational' : 'Unknown', storageInfo?.lastCleanupAt || storageInfo?.lastCheckedAt ? 'badge-green' : 'badge-gold'],
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {cards.map(([icon, label, val, bg, color]) => (
          <div key={label} className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto var(--space-2)' }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-4)' }}>System Health</h3>
        {health.map(([s, st, b]) => (
          <div key={s} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-sm">{s}</span>
            <span className={`badge ${b}`}>{st}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────── Reports Tab ──────── */
function ReportsTab() {
  const downloadCsv = (filename, rows) => {
    if (!rows.length) return toast.error('No data to export');
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLeave = async () => {
    try {
      const { data, error } = await supabase.from('leaveApplications').select('*');
      if (error) throw error;
      downloadCsv('leave-report.csv', data || []);
      toast.success('Report exported!');
    } catch (e) { toast.error('Export failed: ' + e.message); }
  };

  const exportEventHeadcount = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
      if (error) throw error;
      const rows = data.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        venue: e.venue,
        category: e.category,
        status: e.status,
        registrations: e.registrations?.length || 0,
        maxCapacity: e.maxCapacity || '',
      }));
      downloadCsv('event-headcount-report.csv', rows);
      toast.success('Event report exported');
    } catch (e) { toast.error(e.message); }
  };

  const exportAttendanceSummary = async () => {
    try {
      const byClass = {};
      let page = 0;
      while (true) {
        const from = page * 2000;
        const to = from + 1999;
        const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false }).range(from, to);
        if (error || !data || data.length === 0) break;
        
        data.forEach((r) => {
          const key = r.classId || 'unknown';
          if (!byClass[key]) byClass[key] = { classId: key, total: 0, present: 0, absent: 0, leave: 0 };
          byClass[key].total += 1;
          if (r.status === 'present') byClass[key].present += 1;
          if (r.status === 'absent') byClass[key].absent += 1;
          if (r.status === 'leave') byClass[key].leave += 1;
        });
        
        if (data.length < 2000) break;
        page++;
      }
      const rows = Object.values(byClass).map((r) => ({
        ...r,
        attendancePct: r.total ? Math.round(((r.present + r.leave) / r.total) * 100) : 0,
      }));
      downloadCsv('attendance-summary.csv', rows);
      toast.success('Attendance summary exported');
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={{ padding: 'var(--space-5)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Leave Report</div>
            <div className="text-xs text-muted">Export all leave applications as JSON/CSV</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={exportLeave}>📥 Export</button>
        </div>
      </div>
      <div className="card" style={{ padding: 'var(--space-5)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Event Headcount Report</div>
            <div className="text-xs text-muted">All events with registration counts</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={exportEventHeadcount}>📥 Export</button>
        </div>
      </div>
      <div className="card" style={{ padding: 'var(--space-5)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Attendance Summary</div>
            <div className="text-xs text-muted">College-wide attendance report</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={exportAttendanceSummary}>📥 Export</button>
        </div>
      </div>
    </div>
  );
}
