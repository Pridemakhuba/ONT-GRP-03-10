import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { proposalsApi } from '../../services/api';
import { toast } from 'react-toastify';

export default function SubmitProposal() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', abstract: '', keywords: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  function handleFile(f) {
    if (!f) return;
    const allowed = ['.pdf', '.docx'];
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) { toast.error('Only PDF or DOCX files allowed'); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error('File must be under 20MB'); return; }
    setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { toast.error('Please upload a proposal document'); return; }
    if (!form.title || !form.abstract) { toast.error('Title and abstract are required'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('abstract', form.abstract);
      fd.append('keywords', form.keywords);
      fd.append('document', file);
      const res = await proposalsApi.create(fd);
      toast.success('Proposal submitted! Your supervisor has been notified.');
      navigate(`/student/proposals/${res.data.proposalID}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Submit Research Proposal</h1>
        <p className="page-subtitle">Fill in your proposal details and upload your document</p>
      </div>

      <div className="card" style={{maxWidth:800}}>
        <div className="alert alert-info">
          ℹ️ Your primary supervisor will be notified to sign off once submitted. Proposals must be in <strong>PDF or DOCX</strong> format (max 20MB).
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Proposal Title *</label>
            <input className="form-control" placeholder="A clear, descriptive title for your research" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>

          <div className="form-group">
            <label className="form-label">Abstract *</label>
            <div className="form-hint">Summarise your research problem, methodology, and expected contributions (150–500 words)</div>
            <textarea className="form-control" rows={8} placeholder="Write your abstract here..." value={form.abstract}
              onChange={e => setForm(p => ({ ...p, abstract: e.target.value }))} required style={{minHeight:200}} />
          </div>

          <div className="form-group">
            <label className="form-label">Keywords</label>
            <input className="form-control" placeholder="e.g. machine learning, healthcare, NLP (comma-separated)" value={form.keywords}
              onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Proposal Document *</label>
            <div
              className={`file-upload-zone ${dragging ? 'dragging' : ''}`}
              onClick={() => document.getElementById('docUpload').click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <div className="file-upload-icon">📁</div>
              <div className="file-upload-text">Click or drag and drop your document here</div>
              <div className="file-upload-hint">PDF or DOCX · Max 20MB</div>
              <input id="docUpload" type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
            {file && (
              <div className="file-selected">
                ✅ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                <button type="button" onClick={() => setFile(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>✕</button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Submitting...' : '📤 Submit Proposal'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
