// src/components/student/ResubmitProposal.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { proposalsApi, resolveFileUrl } from '../../services/api';
import { toast } from 'react-toastify';
import type { Proposal } from '../../types';

export default function ResubmitProposal() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [form, setForm] = useState({ title: '', abstract: '', keywords: '' });
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await proposalsApi.getById(id!);
                setProposal(res.data);
                setForm({
                    title: res.data.title,
                    abstract: res.data.abstract,
                    keywords: res.data.keywords || ''
                });
            } catch {
                toast.error('Failed to load proposal');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    function handleFile(f: File | null) {
        if (!f) return;
        const allowed = ['.pdf', '.docx'];
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (!allowed.includes(ext)) {
            toast.error('Only PDF or DOCX files allowed');
            return;
        }
        if (f.size > 20 * 1024 * 1024) {
            toast.error('File must be under 20MB');
            return;
        }
        setFile(f);
    }

    async function handleResubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title || !form.abstract) {
            toast.warning('Title and abstract are required');
            return;
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('Title', form.title);
            fd.append('Abstract', form.abstract);
            fd.append('Keywords', form.keywords);
            if (file) fd.append('document', file);

            await proposalsApi.resubmit(id!, fd);
            toast.success('Proposal resubmitted! Your supervisor has been notified.');
            setTimeout(() => navigate('/student/dashboard'), 1000);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Resubmit failed');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
    if (!proposal) return <div style={{ padding: 40, textAlign: 'center' }}>Proposal not found</div>;

    if (proposal.status !== 'REVISION_REQUIRED') {
        return (
            <div>
                <div className="page-header">
                    <h1 className="page-title">Resubmit Proposal</h1>
                </div>
                <div className="card">
                    <div className="alert alert-warning">
                        ⚠️ This proposal is not in "Revision Required" status. Current status: <strong>{proposal.status}</strong>
                    </div>
                    <button onClick={() => navigate('/student/dashboard')} className="btn btn-ghost">← Back to Dashboard</button>
                </div>
            </div>
        );
    }

    const currentFileUrl = resolveFileUrl(proposal.documentPath);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Revise & Resubmit Proposal</h1>
                <p className="page-subtitle">Your supervisor requested changes. Update and resubmit.</p>
            </div>

            <div className="card" style={{ maxWidth: 800 }}>
                <div className="alert alert-warning">
                    ⚠️ Your supervisor has requested changes. Please review their feedback and revise your proposal.
                </div>

                {currentFileUrl && (
                    <div className="alert alert-info">
                        📄 <strong>Current document:</strong>{' '}
                        <a href={currentFileUrl} target="_blank" rel="noopener noreferrer">Download current version</a>
                    </div>
                )}

                <form onSubmit={handleResubmit}>
                    <div className="form-group">
                        <label className="form-label">Proposal Title *</label>
                        <input
                            className="form-control"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Abstract *</label>
                        <textarea
                            className="form-control"
                            rows={8}
                            style={{ minHeight: 200 }}
                            value={form.abstract}
                            onChange={e => setForm({ ...form, abstract: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Keywords</label>
                        <input
                            className="form-control"
                            value={form.keywords}
                            onChange={e => setForm({ ...form, keywords: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Upload New Document (optional)</label>
                        <div className="form-hint" style={{ marginBottom: 8 }}>
                            Leave blank to keep the current document, or upload a new PDF/DOCX.
                        </div>
                        <input
                            type="file"
                            className="form-control"
                            accept=".pdf,.docx"
                            onChange={e => handleFile(e.target.files?.[0] || null)}
                        />
                        {file && (
                            <div style={{ marginTop: 8, fontSize: 13 }}>
                                ✅ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                            {saving ? 'Resubmitting...' : '📤 Resubmit Proposal'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => navigate('/student/dashboard')}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}