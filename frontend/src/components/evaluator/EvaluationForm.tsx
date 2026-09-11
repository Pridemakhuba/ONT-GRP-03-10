import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { proposalsApi, evaluationsApi } from '../../services/api';
import { toast } from 'react-toastify';
import type { Proposal, EvaluationScores, Recommendation, ApiErrorResponse } from '../../types';

interface RubricCriterion {
    key: keyof EvaluationScores;
    commentKey: string;
    label: string;
}

interface RubricSection {
    label: string;
    weight: number;
    criteria: RubricCriterion[];
}

const RUBRIC: Record<string, RubricSection> = {
    section1: {
        label: 'Research Quality',
        weight: 40,
        criteria: [
            { key: 'clarityScore', commentKey: 'clarityComment', label: 'Clarity of research question' },
            { key: 'literatureScore', commentKey: 'literatureComment', label: 'Literature review quality' },
            { key: 'methodologyScore', commentKey: 'methodologyComment', label: 'Methodology appropriateness' },
            { key: 'feasibilityScore', commentKey: 'feasibilityComment', label: 'Feasibility of timeline' },
        ]
    },
    section2: {
        label: 'Originality & Contribution',
        weight: 30,
        criteria: [
            { key: 'noveltyScore', commentKey: 'noveltyComment', label: 'Novelty of approach' },
            { key: 'contributionScore', commentKey: 'contributionComment', label: 'Potential contribution to field' },
            { key: 'innovationScore', commentKey: 'innovationComment', label: 'Innovation in methodology' },
        ]
    },
    section3: {
        label: 'Presentation & Structure',
        weight: 20,
        criteria: [
            { key: 'writingScore', commentKey: 'writingComment', label: 'Writing quality and clarity' },
            { key: 'logicScore', commentKey: 'logicComment', label: 'Logical flow and organization' },
            { key: 'citationScore', commentKey: 'citationComment', label: 'Citation quality and relevance' },
        ]
    },
    section4: {
        label: 'Ethics Consideration',
        weight: 10,
        criteria: [
            { key: 'ethicsScore', commentKey: 'ethicsComment', label: 'Ethics addressed appropriately' },
            { key: 'riskScore', commentKey: 'riskComment', label: 'Risk assessment included' },
        ]
    }
};

const RECOMMENDATIONS: Recommendation[] = ['Accept', 'Minor Revisions', 'Major Revisions', 'Resubmit', 'Reject'];

interface StarRatingProps {
    value: number;
    onChange: (v: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps) {
    const [hover, setHover] = useState(0);
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map(n => (
                <span key={n} className={`star ${n <= (hover || value) ? 'filled' : ''}`}
                    onClick={() => onChange(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}>
                    ★
                </span>
            ))}
            {value > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{value}/5</span>}
        </div>
    );
}

interface CalcResult {
    total: number;
    sections: {
        s1Pct: number;
        s2Pct: number;
        s3Pct: number;
        s4Pct: number;
    };
    scoredCount: number;
}

// Weighted score calculation - treats missing scores as 0 but reports count
function calcScore(scores: EvaluationScores): CalcResult {
    const s1 = (scores.clarityScore + scores.literatureScore + scores.methodologyScore + scores.feasibilityScore);
    const s2 = (scores.noveltyScore + scores.contributionScore + scores.innovationScore);
    const s3 = (scores.writingScore + scores.logicScore + scores.citationScore);
    const s4 = (scores.ethicsScore + scores.riskScore);
    const total = (s1 / 20) * 40 + (s2 / 15) * 30 + (s3 / 15) * 20 + (s4 / 10) * 10;
    const sections = {
        s1Pct: (s1 / 20) * 100,
        s2Pct: (s2 / 15) * 100,
        s3Pct: (s3 / 15) * 100,
        s4Pct: (s4 / 10) * 100,
    };
    const scoredCount = Object.values(scores).filter(v => v > 0).length;
    return { total: Math.round(total * 10) / 10, sections, scoredCount };
}

function autoRecommend(score: number): Recommendation {
    if (score >= 80) return 'Accept';
    if (score >= 70) return 'Minor Revisions';
    if (score >= 60) return 'Major Revisions';
    if (score >= 50) return 'Resubmit';
    return 'Reject';
}

interface ApiErrorLike {
    response?: { data?: ApiErrorResponse };
}

export default function EvaluationForm() {
    const { proposalId } = useParams<{ proposalId: string }>();
    const navigate = useNavigate();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const initScores: EvaluationScores = {
        clarityScore: 0, literatureScore: 0, methodologyScore: 0, feasibilityScore: 0,
        noveltyScore: 0, contributionScore: 0, innovationScore: 0,
        writingScore: 0, logicScore: 0, citationScore: 0,
        ethicsScore: 0, riskScore: 0
    };

    const [scores, setScores] = useState<EvaluationScores>(initScores);
    const [comments, setComments] = useState<Record<string, string>>({});
    const [recommendation, setRecommendation] = useState<Recommendation | ''>('');
    const [feedbackNotes, setFeedback] = useState('');
    const [confidentialNotes, setConf] = useState('');

    useEffect(() => {
        async function load() {
            if (!proposalId) return;
            try {
                const r = await proposalsApi.getById(proposalId);
                setProposal(r.data);
            } catch {
                toast.error('Failed to load proposal');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [proposalId]);

    const { total, sections, scoredCount } = calcScore(scores);
    const totalCriteria = 12;
    const anyScored = scoredCount > 0;
    const allScored = scoredCount === totalCriteria;

    // Check comments
    const allCriteria = Object.values(RUBRIC).flatMap(s => s.criteria);
    const allCommented = allCriteria.every(c => (comments[c.commentKey] || '').trim().length > 0);

    // Only auto-suggest when ALL scored
    useEffect(() => {
        if (allScored) setRecommendation(autoRecommend(total));
    }, [total, allScored]);

    function setScore(key: keyof EvaluationScores, val: number) {
        setScores(p => ({ ...p, [key]: val }));
    }

    function setComment(key: string, val: string) {
        setComments(p => ({ ...p, [key]: val }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!allScored) { toast.warning('Please rate all criteria before submitting'); return; }
        if (!allCommented) { toast.warning('Please add a comment for each criterion explaining your score'); return; }
        if (!feedbackNotes.trim()) { toast.warning('Overall feedback notes are required'); return; }
        if (!recommendation) { toast.warning('Please select a recommendation'); return; }
        if (!proposalId) return;

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('proposalID', proposalId);
            Object.entries(scores).forEach(([k, v]) => fd.append(k, String(v)));
            Object.entries(comments).forEach(([k, v]) => {
                if (v) fd.append(k, v);
            });
            fd.append('recommendation', recommendation);
            fd.append('feedbackNotes', feedbackNotes);
            if (confidentialNotes) fd.append('confidentialNotes', confidentialNotes);
            if (file) fd.append('evaluationDocument', file);
            await evaluationsApi.submit(fd);
            toast.success('Evaluation submitted successfully!');
            navigate('/evaluator/dashboard');
        } catch (err) {
            const apiErr = err as ApiErrorLike;
            toast.error(apiErr.response?.data?.message || 'Submission failed');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
    if (!proposal) return <div className="alert alert-danger">Proposal not found</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Evaluate Proposal</h1>
                <p className="page-subtitle">{proposal.title}</p>
            </div>

            <div className="alert alert-info" style={{ marginBottom: 16 }}>
                ℹ️ For each criterion, provide a <strong>star rating</strong> and a <strong>written comment</strong> explaining your score.
            </div>

            <div className="grid-2 mb-2">
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Proposal Summary</h3></div>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}>
                        {proposal.abstract?.substring(0, 400)}...
                    </p>
                    {proposal.keywords && (
                        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                            Keywords: {proposal.keywords}
                        </div>
                    )}
                </div>

                {/* Live score display */}
                <div className="total-score-display" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="total-score-num">{anyScored ? total : '—'}</div>
                    <div className="total-score-label">
                        {allScored
                            ? 'Final Score / 100'
                            : anyScored
                                ? `Partial Score (${scoredCount}/${totalCriteria} rated)`
                                : 'Score / 100'}
                    </div>

                    {anyScored && (
                        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { l: 'Research Quality (40%)', p: sections.s1Pct },
                                { l: 'Originality (30%)', p: sections.s2Pct },
                                { l: 'Presentation (20%)', p: sections.s3Pct },
                                { l: 'Ethics (10%)', p: sections.s4Pct },
                            ].map(s => (
                                <div key={s.l} style={{ fontSize: 11, textAlign: 'left' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{s.l}</div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${s.p}%` }} />
                                    </div>
                                    <div style={{ color: 'var(--gold)', fontWeight: 700, marginTop: 2 }}>{s.p.toFixed(0)}%</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {allScored && (
                        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                            Suggested: {autoRecommend(total)}
                        </div>
                    )}

                    {!allScored && anyScored && (
                        <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                            ⚠️ Rate all criteria to see the final score
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {Object.values(RUBRIC).map(section => (
                    <div key={section.label} className="rubric-section">
                        <div className="rubric-section-hdr">
                            <div className="rubric-section-name">{section.label}</div>
                            <span className="rubric-weight-badge">Weight: {section.weight}%</span>
                        </div>

                        {section.criteria.map(c => (
                            <div key={c.key} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                                <div className="rubric-criterion" style={{ marginBottom: 8 }}>
                                    <span className="criterion-label">{c.label}</span>
                                    <StarRating value={scores[c.key]} onChange={v => setScore(c.key, v)} />
                                </div>
                                <textarea
                                    className="form-control"
                                    rows={2}
                                    placeholder={`Comment on "${c.label}" — explain your score...`}
                                    value={comments[c.commentKey] || ''}
                                    onChange={e => setComment(c.commentKey, e.target.value)}
                                    style={{ fontSize: 13 }}
                                />
                                {scores[c.key] > 0 && !(comments[c.commentKey] || '').trim() && (
                                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                                        ⚠️ Comment required for this criterion
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="live-score">
                            <span>Section score</span>
                            <span style={{ color: 'var(--gold)' }}>
                                {section.criteria.reduce((a, c) => a + scores[c.key], 0)}/{section.criteria.length * 5}
                            </span>
                        </div>
                    </div>
                ))}

                <div className="card mb-2">
                    <div className="card-header"><h3 className="card-title">Overall Recommendation</h3></div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                        {RECOMMENDATIONS.map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRecommendation(r)}
                                className={`btn ${recommendation === r ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: 13 }}
                            >
                                {r === 'Accept' ? '✅' : r === 'Reject' ? '❌' : '📝'} {r}
                            </button>
                        ))}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Overall Written Feedback *{' '}
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(visible to student)</span>
                        </label>
                        <textarea
                            className="form-control"
                            rows={5}
                            placeholder="Provide overall feedback on the proposal..."
                            value={feedbackNotes}
                            onChange={e => setFeedback(e.target.value)}
                            required
                            style={{ minHeight: 120 }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Confidential Notes{' '}
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(supervisor only, not shown to student)</span>
                        </label>
                        <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Optional notes for the supervisor..."
                            value={confidentialNotes}
                            onChange={e => setConf(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Evaluation Document (optional)</label>
                        <div className="file-upload-zone" onClick={() => document.getElementById('evalDoc')?.click()}>
                            <div className="file-upload-icon">📎</div>
                            <div className="file-upload-text">Attach supporting document (PDF/DOCX)</div>
                            <input
                                id="evalDoc"
                                type="file"
                                accept=".pdf,.docx"
                                style={{ display: 'none' }}
                                onChange={e => setFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                        {file && <div className="file-selected">✅ {file.name}</div>}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={saving || !allScored || !allCommented}
                    >
                        {saving ? 'Submitting...' : '📤 Submit Evaluation'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
                </div>

                {!allScored && (
                    <div className="form-error mt-1">
                        ⚠️ All {totalCriteria} criteria must be rated ({scoredCount}/{totalCriteria} done)
                    </div>
                )}
                {allScored && !allCommented && (
                    <div className="form-error mt-1">⚠️ A comment is required for every criterion</div>
                )}
            </form>
        </div>
    );
}