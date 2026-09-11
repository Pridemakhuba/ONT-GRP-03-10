// src/components/admin/ManageDeadlines.tsx
import { useEffect, useState } from 'react';
import { deadlinesApi } from '../../services/api';
import { toast } from 'react-toastify';
import type { Deadline } from '../../types';

export default function ManageDeadlines() {
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', deadlineType: 'Proposal', dueDate: '', isActive: true });
    const [editId, setEditId] = useState<number | null>(null);

    useEffect(() => { loadDeadlines(); }, []);

    async function loadDeadlines() {
        try {
            const res = await deadlinesApi.getAll();
            setDeadlines(res.data);
        } catch {
            toast.error('Failed to load deadlines');
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setForm({ name: '', deadlineType: 'Proposal', dueDate: '', isActive: true });
        setEditId(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || !form.dueDate) { toast.warning('Name and Due Date are required'); return; }

        try {
            if (editId) {
                await deadlinesApi.update(editId, form as any);
                toast.success('Deadline updated!');
            } else {
                await deadlinesApi.create(form as any);
                toast.success('Deadline created!');
            }
            resetForm();
            loadDeadlines();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save deadline');
        }
    }

    async function handleDelete(id: number) {
        if (!window.confirm('Delete this deadline?')) return;
        try {
            await deadlinesApi.delete(id);
            toast.success('Deadline deleted');
            loadDeadlines();
        } catch {
            toast.error('Failed to delete');
        }
    }

    async function handleEdit(d: Deadline) {
        setForm({
            name: d.name,
            deadlineType: d.deadlineType || 'Proposal',
            dueDate: d.dueDate?.split('T')[0] || '',
            isActive: d.isActive
        });
        setEditId(d.deadlineID);
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Manage Deadlines</h1>
                <p className="page-subtitle">Set submission deadlines for proposals and evaluations</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">{editId ? 'Edit Deadline' : 'Add New Deadline'}</h3>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Name *</label>
                            <input className="form-control" placeholder="e.g. Q1 Proposal Submission"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-control" value={form.deadlineType}
                                onChange={e => setForm({ ...form, deadlineType: e.target.value })}>
                                <option value="Proposal">Proposal</option>
                                <option value="Ethics">Ethics</option>
                                <option value="Evaluation">Evaluation</option>
                                <option value="Revision">Revision</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Due Date *</label>
                            <input type="date" className="form-control" value={form.dueDate}
                                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.isActive}
                                    onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                Active
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="submit" className="btn btn-primary">
                                {editId ? 'Update' : 'Create'} Deadline
                            </button>
                            {editId && <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>}
                        </div>
                    </form>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Current Deadlines ({deadlines.length})</h3>
                    </div>
                    {deadlines.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">No deadlines yet</div></div>
                    ) : (
                        deadlines.map(d => {
                            const isPast = new Date(d.dueDate) < new Date();
                            return (
                                <div key={d.deadlineID} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {d.deadlineType} · Due: {new Date(d.dueDate).toLocaleDateString('en-ZA')}
                                                {' '}
                                                <span style={{ color: isPast ? 'red' : 'green' }}>
                                                    {isPast ? '(Past)' : '(Upcoming)'}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => handleEdit(d)} className="btn btn-sm btn-ghost">✏️</button>
                                            <button onClick={() => handleDelete(d.deadlineID)} className="btn btn-sm btn-ghost" style={{ color: 'red' }}>🗑</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}