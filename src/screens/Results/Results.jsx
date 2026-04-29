import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../hooks/useSupabase';
import toast from 'react-hot-toast';

export default function Results() {
  const { profile, isTeacher, isHod } = useAuth();
  return isTeacher
    ? <TeacherResults profile={profile} />
    : <StudentResults profile={profile} />;
}

/* ────────── Student View ────────── */
function StudentResults({ profile }) {
  const { subscribe } = useSupabase();
  const [results, setResults] = useState([]);
  const [rank, setRank] = useState(null);

  useEffect(() => {
    if (!profile) return;
    return subscribe('results', q => q
      .eq('classId', `${profile.department}-${profile.year}-${profile.section}`)
      .order('createdAt', { ascending: false }), setResults);
  }, [profile, subscribe]);

  useEffect(() => {
    if (!profile || !results.length) {
      setRank(null);
      return;
    }
    const totals = {};
    results.forEach((r) => {
      Object.entries(r.marksMap || {}).forEach(([sid, score]) => {
        totals[sid] = (totals[sid] || 0) + Number(score || 0);
      });
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([sid], i) => ({ sid, rank: i + 1 }));
    setRank(sorted.find((s) => s.sid === profile.id)?.rank || null);
  }, [profile, results]);

  const bySubject = results.reduce((acc, r) => {
    const subj = r.subject;
    if (!acc[subj]) acc[subj] = [];
    acc[subj].push(r);
    return acc;
  }, {});

  return (
    <div className="page animate-fade">
      <div className="page-header"><h2>My Results</h2></div>
      {rank && <div className="badge badge-gold" style={{ marginBottom: 'var(--space-4)' }}>Class Rank: #{rank}</div>}

      {Object.keys(bySubject).length === 0 && (
        <div className="empty-state"><div className="empty-state-icon">🏆</div><p>No results published yet</p></div>
      )}

      {Object.entries(bySubject).map(([subject, tests]) => {
        const avg = Math.round(tests.reduce((s, t) => {
          const score = t.marksMap?.[profile?.id] ?? 0;
          return s + (score / t.maxMarks) * 100;
        }, 0) / tests.length);

        return (
          <div key={subject} style={{ marginBottom: 'var(--space-6)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)' }}>{subject}</h3>
              <span className="badge badge-blue">Avg {avg}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {tests.map(test => {
                const score = test.marksMap?.[profile?.id] ?? null;
                const pct = score !== null ? Math.round((score / test.maxMarks) * 100) : null;
                const grade = pct === null ? '—' : pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
                const gradeColor = pct === null ? 'var(--color-text-muted)' : pct >= 60 ? 'var(--color-success)' : 'var(--color-danger)';

                return (
                  <div key={test.id} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{test.testName}</div>
                        <div className="text-xs text-muted">Max: {test.maxMarks} marks</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: gradeColor }}>
                          {score !== null ? score : '—'}<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>/{test.maxMarks}</span>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: gradeColor }}>{grade}</div>
                      </div>
                    </div>
                    {pct !== null && (
                      <div style={{ marginTop: 8, height: 6, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: gradeColor, borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────── Teacher View ────────── */
function TeacherResults({ profile }) {
  const canLockTests = ['hod', 'principal'].includes(profile?.role);
  const { addDocument, subscribe, fetchCollection, updateDocument } = useSupabase();
  const [tests, setTests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ testName: '', subject: '', maxMarks: '' });
  const [marks, setMarks] = useState({});
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    if (!profile) return;
    return subscribe('results', q => q
      .eq('teacherId', profile.id)
      .order('createdAt', { ascending: false }), setTests);
  }, [profile?.id, subscribe]);

  useEffect(() => {
    if (!profile) return;
    const loadStudents = async () => {
      try {
        const list = await fetchCollection('users', q => q
          .eq('role', 'student')
          .eq('department', profile.department)
          .eq('year', profile.year)
          .eq('section', profile.section)
        );
        setStudents(list);
      } catch (err) {}
    };
    loadStudents();
  }, [profile, fetchCollection]);

  const exportCsv = () => {
    if (!tests.length) return toast.error('No results to export');
    const rows = tests.map((t) => ({
      id: t.id,
      testName: t.testName,
      subject: t.subject,
      classId: t.classId,
      maxMarks: t.maxMarks,
      studentsMarked: Object.keys(t.marksMap || {}).length,
      locked: !!t.lockedBy,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Results exported');
  };

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submitTest = async (e) => {
    e.preventDefault();
    if (!form.testName || !form.subject || !form.maxMarks) return toast.error('Fill all fields');
    setSaving(true);
    try {
      await addDocument('results', {
        testName: form.testName,
        subject: form.subject,
        maxMarks: Number(form.maxMarks),
        teacherId: profile.id,
        classId: `${profile.department}-${profile.year}-${profile.section}`,
        marksMap: marks,
        lockedBy: null,
        lockedAt: null,
      });
      toast.success('Test results saved!');
      setShowForm(false);
      setForm({ testName: '', subject: '', maxMarks: '' });
      setMarks({});
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <h2>Results</h2>
        <div className="flex gap-2">
          {canLockTests && <button className="btn btn-secondary btn-sm" onClick={exportCsv}>Export CSV</button>}
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ New Test'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="card animate-slide-down" style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={submitTest}>
          <h3 style={{ fontSize: 'var(--font-size-md)' }}>Create Test</h3>
          <div className="form-group">
            <label className="form-label">Test Name</label>
            <input className="form-input" placeholder="e.g. Unit Test 1 — May 2026" value={form.testName} onChange={setF('testName')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input className="form-input" placeholder="e.g. Mathematics" value={form.subject} onChange={setF('subject')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Max Marks</label>
              <input className="form-input" type="number" min="1" placeholder="100" value={form.maxMarks} onChange={setF('maxMarks')} required />
            </div>
          </div>
          <p className="text-xs text-muted">💡 Add student marks after creating the test by editing it from the list below.</p>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><span className="spinner"/> Saving…</> : 'Create Test'}
          </button>
        </form>
      )}

      {selectedTest ? (
        <div className="card animate-fade" style={{ padding: 'var(--space-4)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 className="font-semibold">{selectedTest.testName}</h3>
              <p className="text-xs text-muted">{selectedTest.subject} · Max {selectedTest.maxMarks}</p>
            </div>
            <button className="btn btn-ghost" onClick={() => setSelectedTest(null)}>← Back</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {students.map(s => {
              const currentScore = selectedTest.marksMap?.[s.id] ?? '';
              return (
                <div key={s.id} className="flex items-center justify-between p-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-muted">{s.registerNumber}</div>
                  </div>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: 80, padding: 4 }}
                    placeholder="Score"
                    min="0"
                    max={selectedTest.maxMarks}
                    disabled={!!selectedTest.lockedBy}
                    value={marks[s.id] !== undefined ? marks[s.id] : currentScore}
                    onChange={(e) => setMarks(m => ({ ...m, [s.id]: e.target.value ? Number(e.target.value) : '' }))}
                  />
                </div>
              );
            })}
          </div>

          {!selectedTest.lockedBy && (
            <div className="flex gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <button className="btn btn-primary flex-1" onClick={async () => {
                setSaving(true);
                try {
                  const updatedMarks = { ...(selectedTest.marksMap || {}), ...Object.fromEntries(Object.entries(marks).filter(([_, v]) => v !== '')) };
                  await updateDocument('results', selectedTest.id, { marksMap: updatedMarks });
                  toast.success('Marks updated!');
                  setSelectedTest(null);
                  setMarks({});
                } catch (e) {
                  toast.error(e.message);
                } finally {
                  setSaving(false);
                }
              }} disabled={saving}>
                {saving ? 'Saving...' : 'Save Marks'}
              </button>
              {canLockTests && (
                <button className="btn btn-danger" onClick={async () => {
                  if (!window.confirm("Are you sure? Locking prevents further edits.")) return;
                  try {
                    await updateDocument('results', selectedTest.id, { lockedBy: profile.id, lockedAt: new Date().toISOString() });
                    toast.success('Test locked');
                    setSelectedTest(null);
                  } catch (e) { toast.error(e.message); }
                }}>Lock Test</button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {canLockTests && <HodResultsMatrix profile={profile} />}
          {tests.map(t => (
            <div key={t.id} className="card" style={{ padding: 'var(--space-4)', cursor: 'pointer' }} onClick={() => { setSelectedTest(t); setMarks({}); }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t.testName}</div>
                  <div className="text-xs text-muted">{t.subject} · Max {t.maxMarks}</div>
                </div>
                <div className="flex gap-2 items-center">
                  {t.lockedBy && <span className="badge badge-red">🔒 Locked</span>}
                  <span className="badge badge-blue">{Object.keys(t.marksMap || {}).length} students</span>
                </div>
              </div>
            </div>
          ))}
          {tests.length === 0 && !showForm && (
            <div className="empty-state"><div className="empty-state-icon">🏆</div><p>No tests created yet</p></div>
          )}
        </div>
      )}
    </div>
  );
}

function HodResultsMatrix({ profile }) {
  const { subscribe } = useSupabase();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!profile?.department) return;
    return subscribe('results', q => q.order('createdAt', { ascending: false }).limit(500), (all) => {
      const dept = all.filter(r => (r.classId || '').startsWith(`${profile.department}-`));
      const map = {};
      dept.forEach((r) => {
        const key = r.classId || 'unknown';
        if (!map[key]) map[key] = { classId: key, tests: 0, totalPct: 0 };
        const vals = Object.values(r.marksMap || {});
        const avg = vals.length ? vals.reduce((s, v) => s + (Number(v || 0) / Number(r.maxMarks || 1)) * 100, 0) / vals.length : 0;
        map[key].tests += 1;
        map[key].totalPct += avg;
      });
      setRows(Object.values(map).map((r) => ({ ...r, avgPct: r.tests ? Math.round(r.totalPct / r.tests) : 0 })).sort((a, b) => b.avgPct - a.avgPct));
    });
  }, [profile?.department, subscribe]);

  if (!rows.length) return null;

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div className="font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Department Results Matrix</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Class</th><th align="left">Tests</th><th align="left">Avg %</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.classId}><td>{r.classId}</td><td>{r.tests}</td><td>{r.avgPct}%</td></tr>)}</tbody>
      </table>
    </div>
  );
}
