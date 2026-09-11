// src/components/admin/FinaliseEvaluations.tsx
import { useEffect, useState } from 'react';
import { proposalsApi, evaluationsApi } from '../../services/api';
import { toast } from 'react-toastify';
import type { Proposal, Evaluation } from '../../types';

interface ProposalWithEvals extends Proposal {
    evaluations?: Evaluation[];
}

function predictOutcome(evals: Evaluation[]): { status: string; color: string; reason: string } {
    if (evals.length < 2) {
        return { status: 'Pending', color: '#888', reason: 'Waiting for both evaluators' };
    }

    const avg = evals.reduce((sum, e) => sum + e.totalScore, 0) / evals.length;
    const recommendations = evals.map(e => (e.recommendation || '').toLowerCase());

    const needsRevision = recommendations.some(r =>
        r.includes('major') || r.includes('resubmit') || r.includes('revision')
    );

    if (needsRevision) {
        return {
            status: 'REVISION_REQUIRED',
            color: '#f59e0b',
            reason: `Avg score: ${avg.toFixed(1)}% — Evaluators requested revisions`
        };
    }
    if (avg >= 50) {
        return {
            status: 'APPROVED_GRADUATION',
            color: '#10b981',
            reason: `Avg score: ${avg.toFixed(1)}% — Passing threshold (≥50%) met`
        };
    }
    return {
        status: 'REJECTED',
        color: '#dc2626',
        reason: `Avg score: ${avg.toFixed(1)}% — Below 50% threshold`
    };
}

export default function FinaliseEvaluations() {
    const [proposals, setProposals] = useState<ProposalWithEvals[]>([]);
    const [loading, setLoading] = useState(true);
    const [finalising, setFinalising] = useState<number | null>(null);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            const res = await proposalsApi.getAll('UNDER_EVALUATION');
            const withEvals: ProposalWithEvals[] = [];

            for (const p of res.data) {
                const evalRes = await evaluationsApi.getByProposal(p.proposalID);
                if (evalRes.data?.length >= 2) {
                    withEvals.push({ ...p, evaluations: evalRes.data });
                }
            }
            setProposals(withEvals);
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function handleFinalise(proposalID: number) {
        if (!window.confirm('Finalise this proposal? The system will automatically decide the outcome based on scores.')) return;

        setFinalising(proposalID);
        try {
            const res = await proposalsApi.finalise(proposalID);
            const data = res.data as any;
            toast.success(data.resultMessage || 'Proposal finalised!');
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Finalise failed');
        } finally {
            setFinalising(null);
        }
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Finalise Evaluations</h1>
                <p className="page-subtitle">
                    Automatic decision: Avg ≥ 50% = Approved · Below 50% = Rejected · "Major Revisions" = Revision Required
                </p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div>
                        <div className="stat-value">{proposals.length}</div>
                        <div className="stat-label">Ready to Finalise</div>
                    </div>
                </div>
            </div>

            {proposals.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">⏳</div>
                        <div className="empty-title">No proposals ready for finalisation</div>
                        <div className="empty-text">Waiting for both evaluators to submit</div>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Proposals Awaiting Final Decision</h3></div>
                    {proposals.map(p => {
                        const prediction = predictOutcome(p.evaluations || []);
                        return (
                            <div
                                key={p.proposalID}
                                style={{
                                    padding: '16px 0',
                                    paddingLeft: 16,
                                    borderBottom: '1px solid var(--border)',
                                    borderLeft: `4px solid ${prediction.color}`,
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                                    Student: {p.student?.user?.firstName} {p.student?.user?.lastName}
                                </div>

                                {/* Evaluations summary */}
                                <div style={{ marginTop: 10 }}>
                                    {p.evaluations?.map((e, i) => (
                                        <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                                            <strong>Evaluator {i + 1}:</strong> Score: <strong>{e.totalScore}%</strong> | Recommendation: {e.recommendation}
                                        </div>
                                    ))}
                                </div>

                                {/* Predicted outcome */}
                                <div
                                    style={{
                                        marginTop: 12,
                                        padding: '10px 14px',
                                        background: '#f9fafb',
                                        borderRadius: 6,
                                        borderLeft: `3px solid ${prediction.color}`,
                                    }}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 600, color: prediction.color }}>
                                        📊 Predicted Outcome: {prediction.status}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                        {prediction.reason}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleFinalise(p.proposalID)}
                                    className="btn btn-primary btn-sm"
                                    style={{ marginTop: 12 }}
                                    disabled={finalising === p.proposalID}
                                >
                                    {finalising === p.proposalID ? 'Finalising...' : '✅ Finalise & Apply Decision'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}