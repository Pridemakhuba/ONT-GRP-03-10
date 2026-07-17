import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supervisorsApi, proposalsApi, assignmentsApi } from '../../services/api';
import { toast } from 'react-toastify';

function StatusBadge({ status }) {
  const m = { Draft:'draft', Submitted:'submitted', UnderReview:'underreview', Accepted:'accepted', Rejected:'rejected', Revised:'revised' };
  return <span className={`badge badge-${m[status]||'draft'}`}>{status}</span>;
}

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [supervisor, setSupervisor] = useState(null);
  const [students, setStudents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allSup = await supervisorsApi.getAll();
        const me = allSup.data.find(s => s.user.aDUsername === user?.username || s.userID === user?.userID);
        setSupervisor(me);
        if (me) {
          const [studRes, propRes] = await Promise.all([
            assignmentsApi.getBySupervisor(me.supervisorID),
            proposalsApi.getAll()
          ]);
          setStudents(studRes.data);
          setProposals(propRes.data);
        }
      } catch { }
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  async function handleSignoff(proposalId) {
    try {
      await proposalsApi.supervisorSignoff(proposalId);
      toast.success('Proposal signed off!');
      setProposals(p => p.map(pr => pr.proposalID === proposalId ? {...pr, supervisorSigned: true, status: 'Submitted'} : pr));
    } catch (err) { toast.error(err.response?.data?.message || 'Signoff failed'); }
  }

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;

  const myStudentIds = students.map(s => s.studentID);
  const myProposals  = proposals.filter(p => myStudentIds.includes(p.studentID));
  const pendingSignoff = myProposals.filter(p => !p.supervisorSigned && p.status === 'Draft');
  const pendingEval    = myProposals.filter(p => p.supervisorSigned && p.status === 'Submitted');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Supervisor Dashboard</h1>
        <p className="page-subtitle">Welcome, {user?.fullName} — {supervisor?.expertise || 'Supervisor'}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon navy">👥</div><div><div className="stat-value">{students.length}</div><div className="stat-label">My Students</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">✍️</div><div><div className="stat-value">{pendingSignoff.length}</div><div className="stat-label">Pending Sign-Off</div></div></div>
        <div className="stat-card"><div className="stat-icon navy">📋</div><div><div className="stat-value">{pendingEval.length}</div><div className="stat-label">Need Evaluators</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="stat-value">{myProposals.filter(p=>p.status==='Accepted').length}</div><div className="stat-label">Accepted</div></div></div>
      </div>

      {/* Pending sign-off */}
      {pendingSignoff.length > 0 && (
        <div className="card mb-2">
          <div className="card-header"><h3 className="card-title">⚠️ Awaiting Your Sign-Off</h3></div>
          {pendingSignoff.map(p => (
            <div key={p.proposalID} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{p.title}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>Student: {p.student?.user?.firstName} {p.student?.user?.lastName}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <Link to={`/student/proposals/${p.proposalID}`} className="btn btn-ghost btn-sm">Review</Link>
                <button onClick={() => handleSignoff(p.proposalID)} className="btn btn-primary btn-sm">✅ Sign Off</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign evaluators */}
      {pendingEval.length > 0 && (
        <div className="card mb-2">
          <div className="card-header"><h3 className="card-title">📋 Ready for Evaluator Assignment</h3></div>
          {pendingEval.map(p => (
            <div key={p.proposalID} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{p.title}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>Student: {p.student?.user?.firstName} {p.student?.user?.lastName} · <StatusBadge status={p.status}/></div>
              </div>
              <Link to={`/supervisor/assign-evaluators/${p.proposalID}`} className="btn btn-gold btn-sm">Assign Evaluators</Link>
            </div>
          ))}
        </div>
      )}

      {/* All my proposals */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">All Student Proposals</h3></div>
        {myProposals.length === 0
          ? <div className="empty-state"><div className="empty-icon">📄</div><div className="empty-title">No proposals yet from your students</div></div>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Student</th><th>Status</th><th>Signed</th><th>Evaluators</th><th></th></tr></thead>
                <tbody>
                  {myProposals.map(p => (
                    <tr key={p.proposalID}>
                      <td style={{fontWeight:600,maxWidth:200}}>{p.title}</td>
                      <td style={{fontSize:12}}>{p.student?.user?.firstName} {p.student?.user?.lastName}</td>
                      <td><StatusBadge status={p.status}/></td>
                      <td>{p.supervisorSigned?'✅':'⏳'}</td>
                      <td style={{fontSize:12}}>{p.assignedEvaluators?.length||0}/2</td>
                      <td style={{display:'flex',gap:6}}>
                        <Link to={`/student/proposals/${p.proposalID}`} className="btn btn-sm btn-ghost">View</Link>
                        {p.supervisorSigned && p.status==='Submitted' && (
                          <Link to={`/supervisor/assign-evaluators/${p.proposalID}`} className="btn btn-sm btn-gold">Assign</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
