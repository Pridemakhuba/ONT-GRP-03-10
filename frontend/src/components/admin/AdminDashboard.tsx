// src/components/admin/AdminDashboard.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usersApi, studentsApi, supervisorsApi, proposalsApi, assignmentsApi } from '../../services/api';
import { resolveFileUrl } from '../../services/api';
import type { User, Proposal, Student, Supervisor } from '../../types';

interface Stats {
    users: number;
    students: number;
    supervisors: number;
    proposals: number;
    accepted: number;
    pending: number;
}

// Resolves a proposal's uploaded PDF URL.
// ASSUMPTION: Proposal has one of these fields. Tell me the real field name from types.ts to lock this down.
function getProposalFileUrl(p: any): string | null {
    const raw = p.documentUrl || p.filePath || p.fileUrl || p.documentPath || null;
    return resolveFileUrl(raw);
}

// Any account on one of these domains is eligible to be picked as a
// supervisor (or an evaluator, elsewhere in the app) — this is NOT limited
// to users who already have a row in the Supervisor table. If someone
// without one is picked, we create that Supervisor record on the fly
// (see handleAssign) before assigning.
const ELIGIBLE_SUPERVISOR_EVALUATOR_DOMAINS = [
    '@prs.ac.za',
    '@gmail.com',
    '@soit.ac.za',
    '@mandela.ac.za',
];

function isSupervisorEligible(u: User): boolean {
    const email = (u.email || '').toLowerCase();
    return (
        u.role !== 'Student' &&
        ELIGIBLE_SUPERVISOR_EVALUATOR_DOMAINS.some(domain => email.endsWith(domain))
    );
}

// How often to silently re-fetch dashboard data in the background (ms).
const AUTO_REFRESH_INTERVAL = 30_000;

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({ users: 0, students: 0, supervisors: 0, proposals: 0, accepted: 0, pending: 0 });
    const [recentUsers, setRecentUsers] = useState<User[]>([]);
    const [recentProposals, setRecentProposals] = useState<Proposal[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]); // existing Supervisor-table rows, used only to reuse supervisorIDs
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Assign-supervisor UI state: which student row has its dropdown open,
    // and the chosen candidate (by userID, as a string for the <select>) per student
    const [assigning, setAssigning] = useState<number | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<Record<number, string>>({});
    const [savingId, setSavingId] = useState<number | null>(null);
    const [assignError, setAssignError] = useState<string | null>(null);

    // Avoids piling up overlapping requests if a load() is already in flight
    // (e.g. auto-refresh firing while a manual refresh is still pending).
    const loadingRef = useRef(false);

    const load = useCallback(async (opts: { silent?: boolean } = {}) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        if (!opts.silent) setLoading(true);
        else setRefreshing(true);

        try {
            const [uRes, sRes, supRes, pRes] = await Promise.all([
                usersApi.getAll(),
                studentsApi.getAll(),
                supervisorsApi.getAll(),
                proposalsApi.getAll()
            ]);
            setStats({
                users: uRes.data.length,
                students: sRes.data.length,
                supervisors: supRes.data.length,
                proposals: pRes.data.length,
                accepted: pRes.data.filter(p => p.status === 'Accepted').length,
                pending: pRes.data.filter(p => p.status === 'UnderReview').length,
            });
            setRecentUsers(uRes.data.slice(0, 5));
            setRecentProposals(pRes.data.slice(0, 5));
            setStudents(sRes.data);
            setAllUsers(uRes.data);
            setSupervisors(supRes.data);
        } catch {
            /* silent refreshes fail quietly; an initial load failure just leaves
               the empty states showing rather than throwing up an error screen */
        } finally {
            loadingRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load, background polling, and refresh-on-focus/tab-visible so
    // an admin who's been sitting on this page sees new activity without
    // needing to hit F5 — e.g. another admin importing users from AD, or a
    // student submitting a proposal, shows up here automatically.
    useEffect(() => {
        load();

        const interval = setInterval(() => load({ silent: true }), AUTO_REFRESH_INTERVAL);

        const onVisible = () => {
            if (document.visibilityState === 'visible') load({ silent: true });
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [load]);

    // Students with no supervisor assigned yet.
    const unassignedStudents = students.filter((s: any) => !s.supervisors || s.supervisors.length === 0);

    // Anyone with an @mandela.ac.za address (and not flagged as a Student)
    // can be picked, regardless of whether they already have a Supervisor
    // record — that's what makes this "from the database" rather than the
    // narrower, pre-registered system-supervisors list.
    const supervisorCandidates = allUsers
        .filter(isSupervisorEligible)
        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

    // Map userID -> existing supervisorID, so we reuse a Supervisor row
    // instead of creating a duplicate one for someone who's already in
    // that table.
    const supervisorIdByUserId = new Map<number, number>(
        supervisors.map((sup: any) => [sup.userID ?? sup.user?.userID, sup.supervisorID])
    );

    async function handleAssign(studentId: number) {
        const userIdStr = selectedCandidate[studentId];
        if (!userIdStr) return;
        const userId = Number(userIdStr);
        const candidate = supervisorCandidates.find(u => u.userID === userId);
        if (!candidate) return;

        setSavingId(studentId);
        setAssignError(null);

        // Optimistic update: reflect the assignment immediately in the UI
        // instead of waiting on the round-trip + full reload, then reconcile
        // with the server in the background. If the request fails, roll back.
        const previousStudents = students;
        setStudents(prev => prev.map((s: any) =>
            s.studentID === studentId
                ? { ...s, supervisors: [...(s.supervisors || []), { user: candidate }].filter(Boolean) }
                : s
        ));
        setAssigning(null);

        try {
            // Reuse an existing Supervisor row for this user if there is one;
            // otherwise create one first (this is what lets any @mandela.ac.za
            // staff member become a supervisor, not just pre-registered ones).
            let supervisorId = supervisorIdByUserId.get(userId);
            if (!supervisorId) {
                const created = await supervisorsApi.create({ userID: userId });
                supervisorId = created.data.supervisorID;
            }

            await assignmentsApi.assign({
                studentID: studentId,
                supervisorID: supervisorId,
                isPrimary: true,
            });
            // Reconcile with the server in the background (silent — no loading flash)
            load({ silent: true });
        } catch (err: any) {
            setStudents(previousStudents); // roll back the optimistic change
            const msg = err?.response?.data?.message || 'Failed to assign supervisor. Please try again.';
            setAssignError(msg);
        } finally {
            setSavingId(null);
        }
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-subtitle">
                        SOIT Postgraduate Record System — System Overview
                        {refreshing && <span className="text-muted" style={{ marginLeft: 8, fontSize: 11 }}>· refreshing…</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => load()}
                        disabled={refreshing}
                        title="Refresh now"
                    >
                        🔄 Refresh
                    </button>
                    <Link to="/admin/import-ad" className="btn btn-secondary">📥 Import from AD</Link>
                    <Link to="/admin/users" className="btn btn-primary">👥 Manage Users</Link>
                </div>
            </div>

            {/* Stats grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon navy">👤</div>
                    <div><div className="stat-value">{stats.users}</div><div className="stat-label">Total Users</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon navy">🎓</div>
                    <div><div className="stat-value">{stats.students}</div><div className="stat-label">Students</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon gold">👨‍🏫</div>
                    <div><div className="stat-value">{stats.supervisors}</div><div className="stat-label">Supervisors</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon navy">📄</div>
                    <div><div className="stat-value">{stats.proposals}</div><div className="stat-label">Proposals</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div><div className="stat-value">{stats.accepted}</div><div className="stat-label">Accepted</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon gold">⏳</div>
                    <div><div className="stat-value">{stats.pending}</div><div className="stat-label">Under Review</div></div>
                </div>
            </div>

            {/* Assign Supervisors */}
            <div className="card mt-2">
                <div className="card-header flex-between">
                    <h3 className="card-title">Assign Supervisors</h3>
                    <span className="badge badge-draft">{unassignedStudents.length} unassigned</span>
                </div>
                {assignError && (
                    <div className="alert alert-danger mb-2" style={{ padding: '8px 12px', fontSize: 12.5 }}>
                        ⚠️ {assignError}
                    </div>
                )}
                {unassignedStudents.length === 0
                    ? <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">All students have a supervisor</div></div>
                    : unassignedStudents.map((s: any) => (
                        <div key={s.studentID} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                            <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                                {s.user?.firstName?.[0]}{s.user?.lastName?.[0]}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.user?.firstName} {s.user?.lastName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.user?.email}</div>
                            </div>

                            {assigning === s.studentID ? (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <select
                                        className="form-control"
                                        style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                                        value={selectedCandidate[s.studentID] || ''}
                                        onChange={e => setSelectedCandidate(p => ({ ...p, [s.studentID]: e.target.value }))}
                                    >
                                        <option value="">Select supervisor…</option>
                                        {supervisorCandidates.map((u) => (
                                            <option key={u.userID} value={u.userID}>
                                                {u.firstName} {u.lastName} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        disabled={!selectedCandidate[s.studentID] || savingId === s.studentID}
                                        onClick={() => handleAssign(s.studentID)}
                                    >
                                        {savingId === s.studentID ? 'Saving…' : '✔ Confirm'}
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => { setAssigning(null); setAssignError(null); }}>Cancel</button>
                                </div>
                            ) : (
                                <button className="btn btn-sm btn-outline-primary" onClick={() => { setAssigning(s.studentID); setAssignError(null); }}>
                                    🎓 Assign Supervisor
                                </button>
                            )}
                        </div>
                    ))
                }
            </div>

            <div className="grid-2">
                {/* Recent Users */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Users</h3>
                        <Link to="/admin/users" className="btn btn-sm btn-outline-secondary">View All</Link>
                    </div>
                    {recentUsers.length === 0
                        ? <div className="empty-state"><div className="empty-icon">👤</div><div className="empty-title">No users yet</div></div>
                        : recentUsers.map(u => (
                            <div key={u.userID} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                                    {u.firstName[0]}{u.lastName[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.firstName} {u.lastName}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.aDUsername} · {u.email}</div>
                                </div>
                                <span className={`badge badge-${u.role === 'Admin' ? 'accepted' : u.role === 'Supervisor' ? 'submitted' : 'draft'}`}>
                                    {u.role}
                                </span>
                            </div>
                        ))
                    }
                </div>

                {/* Recent Proposals */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Proposals</h3>
                    </div>
                    {recentProposals.length === 0
                        ? <div className="empty-state"><div className="empty-icon">📄</div><div className="empty-title">No proposals yet</div></div>
                        : recentProposals.map(p => {
                            const fileUrl = getProposalFileUrl(p);
                            return (
                                <div key={p.proposalID} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.title}</div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {p.student?.user?.firstName} {p.student?.user?.lastName}
                                        </span>
                                        <span className={`badge badge-${p.status === 'Accepted' ? 'accepted' :
                                            p.status === 'Rejected' ? 'rejected' :
                                                p.status === 'UnderReview' ? 'underreview' :
                                                    p.status === 'Submitted' ? 'submitted' : 'draft'
                                            }`}>{p.status}</span>
                                        {fileUrl ? (
                                            <a
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-sm btn-outline-primary"
                                                style={{ marginLeft: 'auto' }}
                                            >
                                                📄 View PDF
                                            </a>
                                        ) : (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>No file</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>

            {/* Quick links */}
            <div className="card mt-2">
                <div className="card-header"><h3 className="card-title">Quick Actions</h3></div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Link to="/admin/import-ad" className="btn btn-outline-primary">📥 Import Users from AD</Link>
                    <Link to="/admin/users" className="btn btn-outline-primary">✏️ Manage Roles</Link>
                    <Link to="/admin/proposals" className="btn btn-outline-primary">📋 View All Proposals</Link>
                </div>
            </div>
        </div>
    );
}