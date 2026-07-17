import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supervisorsApi, proposalsApi, evaluationsApi } from '../../services/api';

export default function EvaluatorDashboard() {
  const { user } = useAuth();
  const [supervisor, setSupervisor] = useState(null);
  const [assigned, setAssigned]     = useState([]);
  const [completed, setCompleted]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allSup = await supervisorsApi.getAll();
        const me = allSup.data.find(s => s.user.aDUsername === user?.username || s.userID === user?.userID);
        setSupervisor(me);
        if (me) {
          const evalRes = await evaluationsApi.getByEvaluator(me.supervisorID);
          const completedIds = evalRes.data.map(e => e.proposalID);
          setCompleted(evalRes.data);

          const propRes = await proposalsApi.getPendingEval();
          const myAssigned = propRes.data.filter(p =>
            p.assignedEvaluators?.some(e => e.evaluatorID === me.supervisorID)
          );
          setAssigned(myAssigned.filter(p => !completedIds.includes(p.proposalID)));
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Evaluator Dashboard</h1>
        <p className="page-subtitle">Manage your assigned proposal evaluations</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon gold">⏳</div><div><div className="stat-value">{assigned.length}</div><div className="stat-label">Pending Evaluations</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="stat-value">{completed.length}</div><div className="stat-label">Completed</div></div></div>
      </div>

      {/* Pending */}
      <div className="card mb-2">
        <div className="card-header"><h3 className="card-title">⏳ Pending Evaluations</h3></div>
        {assigned.length === 0
          ? <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">All caught up!</div><div className="empty-text">No pending evaluations</div></div>
          : assigned.map(p => (
            <div key={p.proposalID} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{p.title}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3}}>
                  Student: {p.student?.user?.firstName} {p.student?.user?.lastName} · {p.student?.program}
                </div>
              </div>
              <Link to={`/evaluator/evaluate/${p.proposalID}`} className="btn btn-gold">📝 Evaluate</Link>
            </div>
          ))
        }
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">✅ Completed Evaluations</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Proposal</th><th>Score</th><th>Recommendation</th><th>Date</th></tr></thead>
              <tbody>
                {completed.map(e => (
                  <tr key={e.rubricID}>
                    <td style={{fontWeight:600}}>Proposal #{e.proposalID}</td>
                    <td><strong style={{color:'var(--gold)'}}>{e.totalScore}/100</strong></td>
                    <td><span className={`badge badge-${e.recommendation==='Accept'?'accepted':e.recommendation==='Reject'?'rejected':'submitted'}`}>{e.recommendation}</span></td>
                    <td style={{fontSize:12,color:'var(--text-muted)'}}>{new Date(e.submittedDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
