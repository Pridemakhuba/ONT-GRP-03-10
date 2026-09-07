import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethicsApi, proposalsApi } from '../../services/api';
import { toast } from 'react-toastify';
import type { Proposal, EthicsCertificate } from '../../types';

interface EthicsFormState {
  certificateNumber: string;
  issuedDate: string;
  expiryDate: string;
}

export default function EthicsUpload() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [existing, setExisting] = useState<EthicsCertificate[]>([]);
  const [form, setForm] = useState<EthicsFormState>({ certificateNumber: '', issuedDate: '', expiryDate: '' });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, eRes] = await Promise.all([
          proposalsApi.getById(proposalId as string),
          ethicsApi.getByProposal(proposalId as string),
        ]);
        setProposal(pRes.data);
        setExisting(eRes.data);
      } catch {
        toast.error('Failed to load');
      }
    }
    load();
  }, [proposalId]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a certificate file');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('proposalId', proposalId as string);
      fd.append('certificateNumber', form.certificateNumber);
      fd.append('issuedDate', form.issuedDate);
      if (form.expiryDate) fd.append('expiryDate', form.expiryDate);
      fd.append('certificate', file);
      await ethicsApi.upload(fd);
      toast.success('Ethics certificate uploaded successfully!');
      navigate(`/student/proposals/${proposalId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files ? e.target.files[0] : null);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload Ethics Certificate</h1>
        <p className="page-subtitle">{proposal?.title}</p>
      </div>

      <div className="alert alert-info">
        ℹ️ Ethics clearance is processed through the external ethics committee. Upload your certificate here once obtained.
      </div>

      {existing.length > 0 && (
        <div className="card mb-2">
          <div className="card-header"><h3 className="card-title">Uploaded Certificates</h3></div>
          {existing.map(e => (
            <div key={e.ethicsID} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Certificate #{e.certificateNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Issued: {new Date(e.issuedDate).toLocaleDateString()}</div>
              </div>
              <span className="badge badge-accepted">✅ Uploaded</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Certificate Number *</label>
            <input
              className="form-control"
              placeholder="e.g. ETH-2024-001"
              value={form.certificateNumber}
              onChange={e => setForm(p => ({ ...p, certificateNumber: e.target.value }))}
              required
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Issue Date *</label>
              <input
                type="date"
                className="form-control"
                value={form.issuedDate}
                onChange={e => setForm(p => ({ ...p, issuedDate: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input
                type="date"
                className="form-control"
                value={form.expiryDate}
                onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Certificate File (PDF) *</label>
            <div className="file-upload-zone" onClick={() => document.getElementById('certFile')?.click()}>
              <div className="file-upload-icon">📋</div>
              <div className="file-upload-text">Click to select ethics certificate</div>
              <div className="file-upload-hint">PDF only</div>
              <input id="certFile" type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
            {file && <div className="file-selected">✅ {file.name}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Uploading...' : '📤 Upload Certificate'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}