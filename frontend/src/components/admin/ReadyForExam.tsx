// src/components/admin/ReadyForExam.tsx
import { useEffect, useState } from 'react';
import { proposalsApi, supervisorsApi } from '../../services/api';
import { toast } from 'react-toastify';
import type { Proposal, Supervisor } from '../../types';

export default function ReadyForExam() {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [selectedEval1, setSelectedEval1] = useState<Record<number, string>>({});
    const [selectedEval2, setSelectedEval2] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            const [pRes, sRes] = await Promise.all([
                proposalsApi.getReadyForExamination(),
                supervisorsApi.getAll()
            ]);
            setProposals(pRes.data);
            setSupervisors(sRes.data);
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function assignEvaluators(proposalID: number) {
        const e1 = selectedEval1[proposalID];
        const e2 = selectedEval2[proposalID];

        if (!e1 || !e2) { toast.warning('Select 2 evaluators'); return; }
        if (e1 === e2) { toast.warning('Select 2 different evaluators'); return; }

        try {
            await proposalsApi.assignEvaluators(proposalID, {
                proposalID,
                evaluatorIDs: [parseInt(e1), parseInt(e2)]
            });
            toast.success('Evaluators assigned!');
            loadData();
            setSelectedEval1(p => ({ ...p, [proposalID]: '' }));
            setSelectedEval2(p => ({ ...p, [proposalID]: '' }));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Assignment failed');
        }
    }

    function getStudentSupervisorIDs(proposal: Proposal): number[] {
        return proposal.student?.supervisors?.map((s: any) => s.supervisorID) || [];
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Assign Evaluators</h1>
                <p className="page-subtitle">
                    Select 2 evaluators from the supervisor pool.
                    Student's own supervisor(s) are excluded from the dropdown.
                </p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon gold">📋</div>
                    <div>
                        <div className="stat-value">{proposals.length}</div>
                        <div className="stat-label">Awaiting Evaluator Assignment</div>
                    </div>
                </div>
            </div>

            {proposals.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">✅</div>
                        <div className="empty-title">No proposals waiting for evaluator assignment</div>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Proposals Ready for Evaluation</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Excluded supervisors are shown as greyed-out options
                        </span>
                    </div>

                    {proposals.map(p => {
                        const studentSupervisorIDs = getStudentSupervisorIDs(p);
                        const studentSupervisorNames = p.student?.supervisors?.map(
                            (s: any) => `${s.user?.firstName} ${s.user?.lastName}`
                        ).join(', ') || 'None';

                        return (
                            <div key={p.proposalID} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                                        Student: {p.student?.user?.firstName} {p.student?.user?.lastName} · {p.student?.studentNumber}
                                    </div>
                                    {studentSupervisorIDs.length > 0 && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            <strong>⚠️ Excluded (student's supervisor):</strong> {studentSupervisorNames}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <select
                                        className="form-control"
                                        style={{ width: 240, padding: '6px 10px' }}
                                        value={selectedEval1[p.proposalID] || ''}
                                        onChange={e => setSelectedEval1(prev => ({ ...prev, [p.proposalID]: e.target.value }))}
                                    >
                                        <option value="">-- Evaluator 1 --</option>
                                        {supervisors.map(s => {
                                            const isExcluded = studentSupervisorIDs.includes(s.supervisorID);
                                            return (
                                                <option
                                                    key={s.supervisorID}
                                                    value={s.supervisorID}
                                                    disabled={isExcluded}
                                                    style={{ color: isExcluded ? '#aaa' : 'inherit' }}
                                                >
                                                    {s.user?.firstName} {s.user?.lastName}
                                                    {isExcluded ? " (Student's supervisor — excluded)" : ''}
                                                </option>
                                            );
                                        })}
                                    </select>

                                    <select
                                        className="form-control"
                                        style={{ width: 240, padding: '6px 10px' }}
                                        value={selectedEval2[p.proposalID] || ''}
                                        onChange={e => setSelectedEval2(prev => ({ ...prev, [p.proposalID]: e.target.value }))}
                                    >
                                        <option value="">-- Evaluator 2 --</option>
                                        {supervisors.map(s => {
                                            const isExcluded = studentSupervisorIDs.includes(s.supervisorID);
                                            return (
                                                <option
                                                    key={s.supervisorID}
                                                    value={s.supervisorID}
                                                    disabled={isExcluded}
                                                    style={{ color: isExcluded ? '#aaa' : 'inherit' }}
                                                >
                                                    {s.user?.firstName} {s.user?.lastName}
                                                    {isExcluded ? " (Student's supervisor — excluded)" : ''}
                                                </option>
                                            );
                                        })}
                                    </select>

                                    <button
                                        onClick={() => assignEvaluators(p.proposalID)}
                                        className="btn btn-gold btn-sm"
                                    >
                                        ✅ Assign Evaluators
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}