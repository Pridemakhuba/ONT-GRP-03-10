// src/components/supervisor/SupervisorDashboard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supervisorsApi, proposalsApi, assignmentsApi } from '../../services/api';
import { toast } from 'react-toastify';
import type { Supervisor, Student, Proposal, ProposalStatus, ApiErrorResponse } from '../../types';

function StatusBadge({ status }: { status: ProposalStatus }) {
    const m: Record<ProposalStatus, string> = {
        PENDING_ALLOCATION: 'draft',
        SUPERVISION_STAGE: 'submitted',
        REVISION_REQUIRED: 'revised',
        READY_FOR_EXAMINATION: 'submitted',
        UNDER_EVALUATION: 'underreview',
        APPROVED_GRADUATION: 'accepted',
        REJECTED: 'rejected',
    };
    return <span className={`badge badge-${m[status] || 'draft'}`}>{status}</span>;
}

interface ApiErrorLike {
    response?: { data?: ApiErrorResponse };
}

export default function SupervisorDashboard() {
    const { user } = useAuth();
    const [supervisor, setSupervisor] = useState<Supervisor | undefined>(undefined);
    const [students, setStudents] = useState<Student[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<Record<number, string>>({});
    const [showModal, setShowModal] = useState<number | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const allSup = await supervisorsApi.getAll();
                const me = allSup.data.find(s => s.user?.aDUsername === user?.username || s.userID === user?.userID);
                setSupervisor(me);
                if (me) {
                    const [studRes, propRes] = await Promise.all([
                        assignmentsApi.getBySupervisor(me.supervisorID),
                        proposalsApi.getAll()
                    ]);
                    setStudents(studRes.data);
                    setProposals(propRes.data);
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        }
        load();
    }, [user]);

    async function handleSignoff(proposalId: number) {
        if (!window.confirm('Sign off this proposal for examination?')) return;
        try {
            await proposalsApi.supervisorSignoff(proposalId);
            toast.success('Proposal signed off and sent for evaluation!');
            window.location.reload();
        } catch (err) {
            const apiErr = err as ApiErrorLike;
            toast.error(apiErr.response?.data?.message || 'Signoff failed');
        }
    }

    async function handleRequestChanges(proposalId: number) {
        const comment = comments[proposalId];
        if (!comment || comment.trim() === '') {
            toast.warning('Please enter comments for the student');
            return;
        }
        try {
            await proposalsApi.requestChanges(proposalId, { comments: comment });
            toast.success('Changes requested. Student notified.');
            setShowModal(null);
            setComments({ ...comments, [proposalId]: '' });
            window.location.reload();
        } catch (err) {
            const apiErr = err as ApiErrorLike;
            toast.error(apiErr.response?.data?.message || 'Failed to request changes');
        }
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    const myStudentIds = students.map(s => s.studentID);
    const myProposals = proposals.filter(p => myStudentIds.includes(p.studentID));

    const supervisionStage = myProposals.filter(p => p.status === 'SUPERVISION_STAGE');
    const revisionRequired = myProposals.filter(p => p.status === 'REVISION_REQUIRED');
    const readyForExam = myProposals.filter(p => p.status === 'READY_FOR_EXAMINATION');
    const underEvaluation = myProposals.filter(p => p.status === 'UNDER_EVALUATION');

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Supervisor Dashboard</h1>
                <p className="page-subtitle">Welcome, {user?.fullName} — {supervisor?.expertise || 'Supervisor'}</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon navy">👥</div><div><div className="stat-value">{students.length}</div><div className="stat-label">My Students</div></div></div>
                <div className="stat-card"><div className="stat-icon gold">✍️</div><div><div className="stat-value">{supervisionStage.length}</div><div className="stat-label">In Supervision</div></div></div>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#dc2626' }}>🔄</div><div><div className="stat-value">{revisionRequired.length}</div><div className="stat-label">Revision Required</div></div></div>
                <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="stat-value">{readyForExam.length}</div><div className="stat-label">Ready for Exam</div></div></div>
            </div>

            {/* Supervision Stage */}
            {supervisionStage.length > 0 && (
                <div className="card mb-2">
                    <div className="card-header"><h3 className="card-title">✍️ Proposals in Supervision</h3></div>
                    {supervisionStage.map(p => (
                        <div key={p.proposalID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Student: {p.student?.user?.firstName} {p.student?.user?.lastName}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Link to={`/supervisor/proposal/${p.proposalID}`} className="btn btn-ghost btn-sm">📄 Review</Link>
                                <button onClick={() => setShowModal(p.proposalID)} className="btn btn-outline-primary btn-sm">📝 Request Changes</button>
                                <button onClick={() => handleSignoff(p.proposalID)} className="btn btn-primary btn-sm">✅ Sign Off</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Revision Required */}
            {revisionRequired.length > 0 && (
                <div className="card mb-2">
                    <div className="card-header"><h3 className="card-title">🔄 Awaiting Student Revision</h3></div>
                    {revisionRequired.map(p => (
                        <div key={p.proposalID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Student: {p.student?.user?.firstName} {p.student?.user?.lastName}</div>
                            </div>
                            <StatusBadge status={p.status} />
                        </div>
                    ))}
                </div>
            )}

            {/* Ready for Exam */}
            {readyForExam.length > 0 && (
                <div className="card mb-2">
                    <div className="card-header"><h3 className="card-title">📋 Ready for Examination</h3></div>
                    {readyForExam.map(p => (
                        <div key={p.proposalID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Student: {p.student?.user?.firstName} {p.student?.user?.lastName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>⏳ Waiting for Admin to assign evaluators</div>
                            </div>
                            <StatusBadge status={p.status} />
                        </div>
                    ))}
                </div>
            )}

            {/* Under Evaluation */}
            {underEvaluation.length > 0 && (
                <div className="card mb-2">
                    <div className="card-header"><h3 className="card-title">⭐ Under Evaluation</h3></div>
                    {underEvaluation.map(p => (
                        <div key={p.proposalID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Student: {p.student?.user?.firstName} {p.student?.user?.lastName}</div>
                            </div>
                            <StatusBadge status={p.status} />
                        </div>
                    ))}
                </div>
            )}

            {/* All Student Proposals */}
            <div className="card">
                <div className="card-header"><h3 className="card-title">All Student Proposals</h3></div>
                {myProposals.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📄</div><div className="empty-title">No proposals yet from your students</div></div>
                    : (
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Title</th><th>Student</th><th>Status</th><th>Signed</th><th>Evaluators</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {myProposals.map(p => (
                                        <tr key={p.proposalID}>
                                            <td style={{ fontWeight: 600, maxWidth: 200 }}>{p.title}</td>
                                            <td style={{ fontSize: 12 }}>{p.student?.user?.firstName} {p.student?.user?.lastName}</td>
                                            <td><StatusBadge status={p.status} /></td>
                                            <td>{p.supervisorSigned ? '✅' : '⏳'}</td>
                                            <td style={{ fontSize: 12 }}>{p.assignedEvaluators?.length || 0}/2</td>
                                            <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                <Link to={`/supervisor/proposal/${p.proposalID}`} className="btn btn-sm btn-ghost">View</Link>
                                                {p.status === 'SUPERVISION_STAGE' && !p.supervisorSigned && (
                                                    <>
                                                        <button onClick={() => setShowModal(p.proposalID)} className="btn btn-sm btn-outline-primary">📝 Changes</button>
                                                        <button onClick={() => handleSignoff(p.proposalID)} className="btn btn-sm btn-primary">✅ Sign Off</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </div>

            {/* Request Changes Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: 500, maxWidth: '90vw' }}>
                        <div className="card-header">
                            <h3 className="card-title">📝 Request Changes</h3>
                            <button onClick={() => setShowModal(null)} className="btn btn-sm btn-ghost">✕</button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Comments for Student *</label>
                            <textarea
                                className="form-control"
                                rows={5}
                                placeholder="Explain what changes are needed..."
                                value={comments[showModal] || ''}
                                onChange={e => setComments({ ...comments, [showModal]: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                            <button onClick={() => handleRequestChanges(showModal)} className="btn btn-primary">Submit</button>
                            <button onClick={() => setShowModal(null)} className="btn btn-ghost">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}