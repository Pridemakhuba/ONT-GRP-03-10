import React, { useEffect, useState } from 'react';
import { deadlinesApi } from '../../services/api';
import { toast } from 'react-toastify';

export default function ManageDeadlines() {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', description: '', deadlineType: 'Proposal', dueDate: '', isActive: true
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => { loadDeadlines(); }, []);

  async function loadDeadlines() {
    try {
      const res = await deadlinesApi.getAll();
      setDeadlines(res.data);
    } catch { toast.error('Failed to load deadlines'); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setForm({ name: '', description: '', deadlineType: 'Proposal', dueDate: '', isActive: true });
    setEditId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.dueDate) {
      toast.warning('Name and Due Date are required');
      return;
    }
    try {
      if (editId) {
        await deadlinesApi.update(editId, form);
        toast.success('Deadline updated!');
      } else {
        await deadlinesApi.create(form);
        toast.success('Deadline created!');
      }
      resetForm();
      loadDeadlines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save deadline');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this deadline?')) return;
    try {
      await deadlinesApi.delete(id);
      toast.success('Deadline deleted');
      loadDeadlines();
    } catch { toast.error('Failed to delete'); }
  }

  function handleEdit(deadline) {
    setForm({
      name: deadline.name,
      description: deadline.description || '',
      deadlineType: deadline.deadlineType,
      dueDate: deadline.dueDate?.split('T')[0] || '',
      isActive: deadline.isActive
    });
    setEditId(deadline.deadlineID);
  }

  const types = ['Proposal', 'Ethics', 'Evaluation', 'Revision'];

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manage Deadlines</h1>
        <p className="page-subtitle">Set and manage submission deadlines for proposals, ethics, and evaluations</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        {/* Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{editId ? 'Edit Deadline' : 'Add New Deadline'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-control" placeholder="e.g. Q1 Proposal Submission"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} placeholder="Optional description"
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-control" value={form.deadlineType}
                onChange={e => setForm({...form, deadlineType: e.target.value})}>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input type="date" className="form-control"
                value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            </div>

            <div className="form-group">
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                <input type="checkbox" checked={form.isActive}
                  onChange={e => setForm({...form, isActive: e.target.checked})} />
                Active
              </label>
            </div>

            <div style={{display:'flex',gap:10}}>
              <button type="submit" className="btn btn-primary">
                {editId ? 'Update Deadline' : 'Create Deadline'}
              </button>
              {editId && <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current Deadlines ({deadlines.length})</h3>
          </div>
          {deadlines.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>
              No deadlines set yet
            </div>
          ) : (
            deadlines.map(d => {
              const isPast = new Date(d.dueDate) < new Date();
              return (
                <div key={d.deadlineID} style={{
                  padding:'12px 0', borderBottom:'1px solid var(--border)',
                  opacity: d.isActive ? 1 : 0.5
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{d.name}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                        <span className={`badge badge-${d.deadlineType === 'Proposal' ? 'submitted' : d.deadlineType === 'Ethics' ? 'draft' : 'underreview'}`}>
                          {d.deadlineType}
                        </span>
                        <span style={{marginLeft:8}}>
                          Due: {new Date(d.dueDate).toLocaleDateString('en-ZA')}
                        </span>
                        <span style={{marginLeft:8,color:isPast ? 'red' : 'green'}}>
                          {isPast ? '(Past)' : '(Upcoming)'}
                        </span>
                      </div>
                      {d.description && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{d.description}</div>}
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={() => handleEdit(d)} className="btn btn-sm btn-ghost">✏️</button>
                      <button onClick={() => handleDelete(d.deadlineID)} className="btn btn-sm btn-ghost" style={{color:'red'}}>🗑</button>
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