import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proposalsApi, evaluationsApi } from '../../services/api';
import { toast } from 'react-toastify';
import type { Proposal, ProposalStatus, EvaluationResults } from '../../types';

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

export default function ProposalDetail() {
    const { id } = useParams<{ id: string }>();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [results, setResults] = useState<EvaluationResults | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const pRes = await proposalsApi.getById(id as string);
                setProposal(pRes.data);
            } catch (err) {
                toast.error('Failed to load proposal');
                setLoading(false);
                return;
            }

            try {
                const rRes = await evaluationsApi.getResults(id as string);
                setResults(rRes.data);
            } catch (err) {
                setResults(null);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading proposal...</div>;
    if (!proposal) return <div className="alert alert-danger">Proposal not found.</div>;

    const avg = results?.averageScore;

    // Per-criterion comment fields to display alongside each score
    const criterionFields: Array<{
        label: string;
        scoreKey: string;
        commentKey: string;
    }> = [
            { label: 'Clarity of research question', scoreKey: 'clarityScore', commentKey: 'clarityComment' },
            { label: 'Literature review quality', scoreKey: 'literatureScore', commentKey: 'literatureComment' },
            { label: 'Methodology appropriateness', scoreKey: 'methodologyScore', commentKey: 'methodologyComment' },
            { label: 'Feasibility of timeline', scoreKey: 'feasibilityScore', commentKey: 'feasibilityComment' },
            { label: 'Novelty of approach', scoreKey: 'noveltyScore', commentKey: 'noveltyComment' },
            { label: 'Potential contribution to field', scoreKey: 'contributionScore', commentKey: 'contributionComment' },
            { label: 'Innovation in methodology', scoreKey: 'innovationScore', commentKey: 'innovationComment' },
            { label: 'Writing quality and clarity', scoreKey: 'writingScore', commentKey: 'writingComment' },
            { label: 'Logical flow and organization', scoreKey: 'logicScore', commentKey: 'logicComment' },
            { label: 'Citation quality and relevance', scoreKey: 'citationScore', commentKey: 'citationComment' },
            { label: 'Ethics addressed appropriately', scoreKey: 'ethicsScore', commentKey: 'ethicsComment' },
            { label: 'Risk assessment included', scoreKey: 'riskScore', commentKey: 'riskComment' },
        ];

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h1 className="page-title" style={{ fontSize: 20 }}>{proposal.title}</h1>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <StatusBadge status={proposal.status} />
                        {proposal.supervisorSigned && <span className="badge badge-accepted">✅ Supervisor Signed</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Link to="/student/dashboard" className="btn btn-ghost btn-sm">← Back</Link>
                    <Link to={`/student/ethics-upload/${id}`} className="btn btn-outline btn-sm">📋 Ethics Cert</Link>
                </div>
            </div>

            {/* Overall Score */}
            {results && results.evaluatorCount > 0 && (
                <div className="total-score-display mb-2">
                    <div className="total-score-num">{avg?.toFixed(1)}</div>
                    <div className="total-score-label">
                        Average Score out of 100 · {results.evaluatorCount} evaluator(s)
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div className="progress-bar" style={{ width: '60%', margin: '0 auto' }}>
                            <div className="progress-fill" style={{ width: `${avg}%` }} />
                        </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>
                        Overall: {results.overallDecision}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                        🔒 Evaluator identities are hidden to ensure fair, unbiased review.
                    </div>
                </div>
            )}

            {/* Proposal info (full-width now — evaluator panel removed) */}
            <div className="card">
                <div className="card-header"><h3 className="card-title">Proposal Details</h3></div>
                <div className="form-group">
                    <div className="form-label">Abstract</div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)' }}>{proposal.abstract}</p>
                </div>
                {proposal.keywords && (
                    <div>
                        <div className="form-label">Keywords</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            {proposal.keywords.split(',').map((k, i) => (
                                <span
                                    key={i}
                                    style={{
                                        background: 'var(--bg)',
                                        border: '1px solid var(--border)',
                                        padding: '2px 10px',
                                        borderRadius: 20,
                                        fontSize: 12,
                                    }}
                                >
                                    {k.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                    Submitted: {proposal.submissionDate ? new Date(proposal.submissionDate).toLocaleString() : 'Not yet submitted'}
                </div>
            </div>

            {/* Evaluation Results — anonymised, with per-criterion comments */}
            {results?.evaluations && results.evaluations.length > 0 && (
                <div className="card mt-2">
                    <div className="card-header">
                        <h3 className="card-title">Evaluation Results</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            🔒 Evaluator identities are anonymised
                        </span>
                    </div>

                    {results.evaluations.map((ev: any, idx: number) => (
                        <div
                            key={ev.rubricID}
                            style={{
                                marginBottom: 24,
                                paddingBottom: 24,
                                borderBottom: idx < results.evaluations.length - 1 ? '2px solid var(--border)' : 'none',
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: 15,
                                    marginBottom: 12,
                                    color: 'var(--navy)',
                                }}
                            >
                                Evaluator {idx + 1}
                                <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 12, color: 'var(--gold)' }}>
                                    Score: {ev.totalScore}/100
                                </span>
                            </div>

                            {ev.sectionScores && (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2,1fr)',
                                        gap: 10,
                                        marginBottom: 14,
                                    }}
                                >
                                    {[
                                        { label: 'Research Quality', pct: ev.sectionScores.section1Percentage, w: 40 },
                                        { label: 'Originality', pct: ev.sectionScores.section2Percentage, w: 30 },
                                        { label: 'Presentation', pct: ev.sectionScores.section3Percentage, w: 20 },
                                        { label: 'Ethics', pct: ev.sectionScores.section4Percentage, w: 10 },
                                    ].map(s => (
                                        <div
                                            key={s.label}
                                            style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 'var(--radius)' }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: 12,
                                                    marginBottom: 5,
                                                }}
                                            >
                                                <span style={{ fontWeight: 600 }}>{s.label} ({s.w}%)</span>
                                                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                                                    {s.pct?.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${s.pct}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Per-criterion: score + comment */}
                            <div style={{ marginBottom: 14 }}>
                                {criterionFields.map(cf => {
                                    const score = (ev[cf.scoreKey] as number) || 0;
                                    const comment = ev[cf.commentKey] as string | undefined;

                                    return (
                                        <div
                                            key={cf.label}
                                            style={{
                                                padding: '10px 12px',
                                                marginBottom: 6,
                                                background: 'var(--bg)',
                                                borderRadius: 6,
                                                borderLeft: '3px solid var(--gold)',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: comment ? 6 : 0,
                                                }}
                                            >
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{cf.label}</span>
                                                <span style={{ color: 'var(--gold)', fontSize: 13 }}>
                                                    {'★'.repeat(score)}
                                                    {'☆'.repeat(5 - score)}
                                                    <span style={{ marginLeft: 4, color: 'var(--text-muted)', fontSize: 11 }}>
                                                        {score}/5
                                                    </span>
                                                </span>
                                            </div>
                                            {comment && (
                                                <div
                                                    style={{
                                                        fontSize: 12.5,
                                                        color: 'var(--text-muted)',
                                                        fontStyle: 'italic',
                                                        marginTop: 4,
                                                        paddingLeft: 8,
                                                        borderLeft: '2px solid var(--border)',
                                                    }}
                                                >
                                                    "{comment}"
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div
                                style={{
                                    background: 'var(--bg)',
                                    padding: 14,
                                    borderRadius: 'var(--radius)',
                                    marginBottom: 10,
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        fontSize: 12,
                                        marginBottom: 6,
                                        color: 'var(--navy)',
                                    }}
                                >
                                    Overall Feedback
                                </div>
                                <p style={{ fontSize: 13, lineHeight: 1.6 }}>{ev.feedbackNotes}</p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <strong style={{ fontSize: 12 }}>Recommendation:</strong>
                                <span
                                    className={`badge badge-${ev.recommendation === 'Accept'
                                            ? 'accepted'
                                            : ev.recommendation === 'Reject'
                                                ? 'rejected'
                                                : 'submitted'
                                        }`}
                                >
                                    {ev.recommendation}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Resubmit option */}
            {(proposal.status === 'REJECTED' || proposal.status === 'REVISION_REQUIRED') && (
                <div className="alert alert-warning mt-2">
                    ⚠️ Your proposal needs revision. Review the feedback above and resubmit.
                    <div style={{ marginTop: 10 }}>
                        <Link
                            to={`/student/resubmit/${proposal.proposalID}`}
                            className="btn btn-primary btn-sm"
                        >
                            📤 Revise & Resubmit
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}