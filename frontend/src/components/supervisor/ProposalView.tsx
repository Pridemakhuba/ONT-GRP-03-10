// src/components/supervisor/ProposalView.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { proposalsApi, resolveFileUrl } from '../../services/api';
import { toast } from 'react-toastify';
import type { Proposal } from '../../types';

export default function ProposalView() {
    const { proposalId } = useParams();
    const navigate = useNavigate();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await proposalsApi.getById(proposalId!);
                setProposal(res.data);
            } catch {
                toast.error('Failed to load proposal');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [proposalId]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
    if (!proposal) return <div style={{ padding: 40, textAlign: 'center' }}>Proposal not found</div>;

    const fileUrl = resolveFileUrl(proposal.documentPath);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">{proposal.title}</h1>
                <p className="page-subtitle">
                    Student: {proposal.student?.user?.firstName} {proposal.student?.user?.lastName} · Status: {proposal.status}
                </p>
            </div>

            <div className="card">
                <div className="card-header"><h3 className="card-title">Proposal Details</h3></div>
                <div style={{ padding: 20 }}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>Title</label>
                        <p style={{ margin: 0 }}>{proposal.title}</p>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>Abstract</label>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{proposal.abstract}</p>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>Keywords</label>
                        <p style={{ margin: 0 }}>{proposal.keywords || '-'}</p>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>Document</label>
                        <p style={{ margin: 0 }}>
                            {fileUrl ? (
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                                    📄 Download Document
                                </a>
                            ) : (
                                <span style={{ color: 'var(--text-muted)' }}>No document uploaded</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <button onClick={() => navigate(-1)} className="btn btn-ghost mt-2">← Back</button>
        </div>
    );
}