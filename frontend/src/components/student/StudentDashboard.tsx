import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentsApi, proposalsApi, resolveFileUrl } from '../../services/api';
import type { Proposal, ProposalStatus, Student } from '../../types';

interface StatusBadgeProps {
    status: ProposalStatus | string;
}

function StatusBadge({ status }: StatusBadgeProps) {
    const m: Record<string, string> = {
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

function getProposalFileUrl(p: any): string | null {
    const raw = p.documentUrl || p.filePath || p.fileUrl || p.documentPath || null;
    return resolveFileUrl(raw);
}

export default function StudentDashboard() {
    const { user } = useAuth();
    const [student, setStudent] = useState<Student | null>(null);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const sRes = await studentsApi.getMe();
                setStudent(sRes.data);
                const pRes = await proposalsApi.getByStudent(sRes.data.studentID);
                setProposals(pRes.data);
            } catch {
                // silently ignore
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    const latest = proposals[0];
    const latestFileUrl = latest ? getProposalFileUrl(latest) : null;

    const revisionRequired = proposals.filter(p => p.status === 'REVISION_REQUIRED');
    const inSupervision = proposals.filter(p => p.status === 'SUPERVISION_STAGE');
    const underEvaluation = proposals.filter(p => p.status === 'UNDER_EVALUATION');
    const approved = proposals.filter(p => p.status === 'APPROVED_GRADUATION');

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title">Welcome, {user?.fullName?.split(' ')[0]} 👋</h1>
                    <p className="page-subtitle">Postgraduate Research Portal</p>
                </div>
                <Link to="/student/submit-proposal" className="btn btn-gold">+ New Proposal</Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon navy">📄</div><div><div className="stat-value">{proposals.length}</div><div className="stat-label">Proposals</div></div></div>
                <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="stat-value">{approved.length}</div><div className="stat-label">Approved</div></div></div>
                <div className="stat-card"><div className="stat-icon gold">⏳</div><div><div className="stat-value">{underEvaluation.length}</div><div className="stat-label">Under Evaluation</div></div></div>
                <div className="stat-card"><div className="stat-icon navy">👥</div><div><div className="stat-value">{student?.supervisors?.length ?? 0}</div><div className="stat-label">Supervisors</div></div></div>
            </div>

            {/* ===== REVISION REQUIRED ===== */}
            {revisionRequired.length > 0 && (
                <div className="card mb-2" style={{ borderLeft: '4px solid #dc2626' }}>
                    <div className="card-header">
                        <h3 className="card-title">🔄 Revision Required</h3>
                    </div>
                    {revisionRequired.map(p => (
                        <div key={p.proposalID} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 0', borderBottom: '1px solid var(--border)', gap: 16
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    ⚠️ Your supervisor has requested changes to this proposal.
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Check your notifications for details.
                                </div>
                            </div>
                            <Link to={`/student/resubmit/${p.proposalID}`} className="btn btn-primary">
                                ✏️ Edit & Resubmit
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid-2">
                <div className="card">
                    <div className="card-header"><h3 className="card-title">My Supervisors</h3></div>
                    {student?.supervisors && student.supervisors.length > 0
                        ? student.supervisors.map(s => (
                            <div key={s.supervisorID} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                                    {s.user?.firstName?.[0]}{s.user?.lastName?.[0]}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.user?.firstName} {s.user?.lastName}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.isPrimary ? '⭐ Primary Supervisor' : 'Co-Supervisor'}</div>
                                </div>
                            </div>
                        ))
                        : <div className="empty-state"><div className="empty-icon">👤</div><div className="empty-title">No supervisors assigned yet</div></div>
                    }
                </div>

                <div className="card">
                    <div className="card-header"><h3 className="card-title">Latest Proposal</h3></div>
                    {latest ? (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{latest.title}</div>
                            <StatusBadge status={latest.status} />
                            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '12px 0' }}>
                                {latest.abstract?.substring(0, 150)}...
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Link to={`/student/proposals/${latest.proposalID}`} className="btn btn-primary btn-sm">View Details & Scores</Link>
                                <Link to={`/student/ethics-upload/${latest.proposalID}`} className="btn btn-outline btn-sm">📋 Ethics Cert</Link>
                                {latestFileUrl && (
                                    <a href={latestFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                        📄 View My PDF
                                    </a>
                                )}
                            </div>
                            {latest.supervisorSigned && <div className="alert alert-success mt-2">✅ Supervisor signed off</div>}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">📝</div>
                            <div className="empty-title">No proposals yet</div>
                            <Link to="/student/submit-proposal" className="btn btn-primary btn-sm mt-1">Submit Your First</Link>
                        </div>
                    )}
                </div>
            </div>

            {proposals.length > 0 && (
                <div className="card mt-2">
                    <div className="card-header"><h3 className="card-title">All Proposals</h3></div>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>Title</th><th>Status</th><th>Submitted</th><th>Signed</th><th>File</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {proposals.map(p => {
                                    const fileUrl = getProposalFileUrl(p);
                                    return (
                                        <tr key={p.proposalID}>
                                            <td style={{ fontWeight: 600 }}>{p.title}</td>
                                            <td><StatusBadge status={p.status} /></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                {p.submissionDate ? new Date(p.submissionDate).toLocaleDateString() : '—'}
                                            </td>
                                            <td>{p.supervisorSigned ? '✅' : '⏳'}</td>
                                            <td>
                                                {fileUrl
                                                    ? <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">📄 PDF</a>
                                                    : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                                                }
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <Link to={`/student/proposals/${p.proposalID}`} className="btn btn-sm btn-ghost">View</Link>
                                                    {p.status === 'REVISION_REQUIRED' && (
                                                        <Link to={`/student/resubmit/${p.proposalID}`} className="btn btn-sm btn-primary">Resubmit</Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}