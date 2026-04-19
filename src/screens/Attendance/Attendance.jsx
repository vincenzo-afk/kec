import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { where, orderBy, limit } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import toast from 'react-hot-toast';

export default function Attendance() {
  const { profile, isTeacher, isHod, isPrincipal } = useAuth();
  if (!isTeacher) return <StudentAttendance profile={profile} />;
  if (isHod || isPrincipal) return <AttendanceOverview profile={profile} isPrincipal={isPrincipal} />;
  return <TeacherAttendance profile={profile} />;
}

function StudentAttendance({ profile }) {
  const { subscribe } = useFirestore();
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    if (!profile?.id) return;
    return subscribe('attendance', [where('studentId', '==', profile.id), orderBy('date', 'desc'), limit(365)], setRecords);
  }, [profile?.id, subscribe]);

  const overall = calcPercent(records);
  const subjects = groupBySubject(records);
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

  const getStatus = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const rec = records.find(r => r.date === dateStr);
    return rec?.status || null;
  };

  return (
    <div className="page animate-fade">
      <div className="page-header"><h2>My Attendance</h2></div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <MetricCard label="Overall Attendance" value={`${overall}%`} color={overall < 75 ? 'var(--color-danger)' : 'var(--color-success)'} />
        <MetricCard label="Days Present" value={records.filter(r => r.status === 'present').length} color="var(--color-success)" />
        <MetricCard label="Days Absent" value={records.filter(r => r.status === 'absent').length} color="var(--color-danger)" />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setMonth(m => subMonths(m, 1))}>←</button>
          <span className="font-semibold">{format(month, 'MMMM yyyy')}</span>
          <button className="btn btn-ghost btn-icon" onClick={() => setMonth(m => addMonths(m, 1))}>→</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
          {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', padding: '4px 0' }}>{d}</div>)}
          {Array.from({ length: daysInMonth[0].getDay() }).map((_,i) => <div key={`e${i}`}/>) }
          {daysInMonth.map(day => {
            const s = getStatus(day);
            const colors = { present:'var(--att-present)', absent:'var(--att-absent)', leave:'var(--att-leave)' };
            return <div key={day.toISOString()} style={{ width:'100%', aspectRatio:'1', borderRadius:'var(--radius-sm)', background:s ? colors[s] : 'var(--color-bg-secondary)', opacity: day > new Date() ? 0.35 : 1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:s ? '#fff' : 'var(--color-text-muted)' }}>{format(day, 'd')}</div>;
          })}
        </div>
      </div>

      <h3 style={{ marginBottom: 'var(--space-4)' }}>Subject-wise Breakdown</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
        {Object.entries(subjects).map(([sub, recs]) => {
          const pct = calcPercent(recs);
          return (
            <div key={sub} className="card" style={{ padding:'var(--space-4)' }}>
              <div className="flex items-center justify-between" style={{ marginBottom:8 }}>
                <span className="font-semibold text-sm">{sub}</span>
                <span style={{ fontWeight:700, color: pct < 75 ? 'var(--color-danger)' : 'var(--color-success)' }}>{pct}%</span>
              </div>
              <div style={{ height:6, borderRadius:'var(--radius-full)', background:'var(--color-bg-secondary)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background: pct < 75 ? 'var(--color-danger)' : 'var(--color-success)', borderRadius:'var(--radius-full)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeacherAttendance({ profile }) {
  const { addDocument, fetchCollection } = useFirestore();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [subject, setSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [marked, setMarked] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchCollection('users', [
      where('role', '==', 'student'),
      where('department', '==', profile.department),
      where('year', '==', profile.year),
      where('section', '==', profile.section),
    ]).then(setStudents).catch(() => {});
  }, [profile, fetchCollection]);

  const toggle = (id) => setMarked(m => ({ ...m, [id]: m[id] === 'present' ? 'absent' : 'present' }));
  const markAll = () => setMarked(Object.fromEntries(students.map(s => [s.id, 'present'])));

  const canMarkDate = (d) => d === format(new Date(), 'yyyy-MM-dd');

  const submit = async () => {
    if (!subject) return toast.error('Select a subject');
    if (!canMarkDate(date)) return toast.error('Retroactive edits are locked after day close. Mark only today.');
    setSubmitting(true);
    try {
      for (const student of students) {
        await addDocument('attendance', {
          studentId: student.id,
          classId: `${profile.department}-${profile.year || student.year}-${student.section}`,
          date,
          subject,
          status: marked[student.id] || 'absent',
          markedBy: profile.id,
          leaveRef: null,
        });
      }
      toast.success('Attendance saved!');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page animate-fade">
      <div className="page-header"><h2>Mark Attendance</h2></div>
      <div className="card" style={{ marginBottom:'var(--space-5)', display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} /></div>
        <div className="form-group"><label className="form-label">Subject</label><input className="form-input" placeholder="e.g. Mathematics" value={subject} onChange={e => setSubject(e.target.value)} /></div>
        {!canMarkDate(date) && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>Retroactive attendance edit is locked.</p>}
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom:'var(--space-3)' }}>
        <span className="font-semibold text-sm">{students.length} students</span>
        <button className="btn btn-secondary btn-sm" onClick={markAll}>✅ Mark All Present</button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
        {students.map(s => (
          <button key={s.id} onClick={() => toggle(s.id)} className="card" style={{ padding:'var(--space-4)', display:'flex', alignItems:'center', justifyContent:'space-between', border:`2px solid ${marked[s.id]==='present'?'var(--color-success)':marked[s.id]==='absent'?'var(--color-danger)':'var(--color-border)'}`, cursor:'pointer', background:'none', width:'100%', textAlign:'left' }}>
            <div className="flex items-center gap-3">
              <div className="avatar avatar-sm">{s.name?.[0]}</div>
              <div><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-muted">{s.registerNumber}</div></div>
            </div>
            <span className={`badge ${marked[s.id]==='present'?'badge-green':marked[s.id]==='absent'?'badge-red':'badge-grey'}`}>{marked[s.id] || 'Not Marked'}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-full btn-lg" style={{ marginTop:'var(--space-5)' }} onClick={submit} disabled={submitting || !canMarkDate(date)}>{submitting ? 'Saving…' : 'Submit Attendance'}</button>
    </div>
  );
}

function AttendanceOverview({ profile, isPrincipal }) {
  const { subscribe } = useFirestore();
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!profile) return;
    return subscribe('attendance', [orderBy('date', 'desc'), limit(5000)], (rows) => {
      const filtered = isPrincipal ? rows : rows.filter(r => (r.classId || '').startsWith(`${profile.department}-`));
      setRecords(filtered);
    });
  }, [profile, isPrincipal, subscribe]);

  const byClass = records.reduce((acc, r) => {
    const key = r.classId || 'unknown';
    if (!acc[key]) acc[key] = { present: 0, absent: 0, leave: 0, total: 0 };
    acc[key].total += 1;
    if (r.status === 'present') acc[key].present += 1;
    if (r.status === 'absent') acc[key].absent += 1;
    if (r.status === 'leave') acc[key].leave += 1;
    return acc;
  }, {});

  const rows = Object.entries(byClass).map(([classId, v]) => ({ classId, ...v, pct: v.total ? Math.round(((v.present + v.leave) / v.total) * 100) : 0 })).sort((a,b) => b.pct - a.pct);

  const exportPdf = () => {
    const html = `
      <html><head><title>Attendance Report</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style></head>
      <body><h2>Attendance Summary</h2><p>Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Class</th><th>Present</th><th>Absent</th><th>Leave</th><th>Total</th><th>%</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.classId}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.leave}</td><td>${r.total}</td><td>${r.pct}%</td></tr>`).join('')}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>{isPrincipal ? 'College Attendance Overview' : 'Department Attendance Overview'}</h2>
        <button className="btn btn-primary btn-sm" onClick={exportPdf}>Download PDF</button>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th align="left">Class</th><th align="left">Present</th><th align="left">Absent</th><th align="left">Leave</th><th align="left">Attendance %</th></tr></thead>
          <tbody>
            {rows.map(r => <tr key={r.classId}><td>{r.classId}</td><td>{r.present}</td><td>{r.absent}</td><td>{r.leave}</td><td>{r.pct}%</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 130, textAlign: 'center', padding: 'var(--space-5)' }}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function calcPercent(records) {
  if (!records.length) return 0;
  const present = records.filter(r => ['present','leave'].includes(r.status)).length;
  return Math.round((present / records.length) * 100);
}

function groupBySubject(records) {
  return records.reduce((acc, r) => {
    acc[r.subject] = acc[r.subject] ? [...acc[r.subject], r] : [r];
    return acc;
  }, {});
}
