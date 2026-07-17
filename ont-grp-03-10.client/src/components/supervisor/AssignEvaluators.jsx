import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { proposalsApi, supervisorsApi, assignmentsApi } from '../../services/api';
import { toast } from 'react-toastify';

export default function AssignEvaluators() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal]   = useState(null);
  const [allSups, setAllSups]     = useState([]);
  const [selected, setSelected]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, sRes] = await Promise.all([proposalsApi.getById(proposalId), supervisorsApi.getAll()]);
        setProposal(pRes.data);
        setAllSups(sRes.data);
        setSelected(pRes.data.assignedEvaluators?.map(e => e.evaluatorID) || []);
      } catch { toast.error('Failed to load'); }
      finally { setLoading(false); }
    }
    load();
  }, [proposalId]);

  // Exclude student's own supervisors from evaluator selection (conflict of interest)
  const studentSupervisorIds = proposal?.student?.supervisors?.map(s => s.supervisorID) || [];
  const eligible = allSups.filter(s => !studentSupervisorIds.includes(s.supervisorID));

  function toggle(id) {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  async function handleAssign() {
    if (selected.length < 2) { toast.warning('Select at least 2 evaluators'); return; }
    setSaving(true);
    try {
      await proposalsApi.assignEvaluators(proposalId, { proposalID: parseInt(proposalId), evaluatorIDs: selected });
      toast.success('Evaluators assigned! They have been notified by email.');
      navigate('/supervisor/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally { setSaving(false); }
  }

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Assign Evaluators</h1>
        <p className="page-subtitle">{proposal?.title}</p>
      </div>

      <div className="alert alert-info">
        ℹ️ Evaluators must be selected from the supervisor pool. A student's own supervisor(s) <strong>cannot</strong> evaluate their proposal (conflict of interest). Minimum <strong>2 evaluators</strong> required.
      </div>

      {studentSupervisorIds.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ The following supervisors are excluded (student's supervisors): {' '}
          {allSups.filter(s => studentSupervisorIds.includes(s.supervisorID)).map(s => `${s.user.firstName} ${s.user.lastName}`).join(', ')}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Eligible Evaluators ({eligible.length})</h3>
          <span className="text-muted" style={{fontSize:12}}>{selected.length} selected (min. 2)</span>
        </div>

        {eligible.length === 0
          ? <div className="alert alert-danger">No eligible evaluators available. Ensure other supervisors are registered.</div>
          : eligible.map(s => (
            <label key={s.supervisorID} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}}>
              <input type="checkbox" checked={selected.includes(s.supervisorID)} onChange={() => toggle(s.supervisorID)}
                style={{width:18,height:18,accentColor:'var(--navy)',cursor:'pointer'}} />
              <div className="user-avatar" style={{width:36,height:36,fontSize:13}}>{s.user.firstName[0]}{s.user.lastName[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{s.user.firstName} {s.user.lastName}</div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>{s.user.email}{s.expertise ? ` · ${s.expertise}` : ''}</div>
              </div>
              {selected.includes(s.supervisorID) && <span className="badge badge-accepted">Selected</span>}
            </label>
          ))
        }

        <div style={{marginTop:20,display:'flex',gap:12}}>
          <button onClick={handleAssign} className="btn btn-primary" disabled={saving || selected.length < 2}>
            {saving ? 'Assigning...' : `Assign ${selected.length} Evaluator(s)`}
          </button>
          <button onClick={() => navigate(-1)} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}
