import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proposalsApi, evaluationsApi } from '../../services/api';
import { toast } from 'react-toastify';

function StatusBadge({ status }) {
  const m = { Draft:'draft', Submitted:'submitted', UnderReview:'underreview', Accepted:'accepted', Rejected:'rejected', Revised:'revised' };
  return <span className={`badge badge-${m[status]||'draft'}`}>{status}</span>;
}

function Stars({ score }) {
  return (
    <span style={{color:'var(--gold)'}}>
      {'★'.repeat(score)}{'☆'.repeat(5-score)}
      <span style={{color:'var(--text-muted)',fontSize:11,marginLeft:4}}>({score}/5)</span>
    </span>
  );
}

export default function ProposalDetail() {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, rRes] = await Promise.all([
          proposalsApi.getById(id),
          evaluationsApi.getResults(id)
        ]);
        setProposal(pRes.data);
        setResults(rRes.data);
      } catch (err) { toast.error('Failed to load proposal'); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading proposal...</div>;
  if (!proposal) return <div className="alert alert-danger">Proposal not found.</div>;

  const avg = results?.averageScore;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title" style={{fontSize:20}}>{proposal.title}</h1>
          <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
            <StatusBadge status={proposal.status} />
            {proposal.supervisorSigned && <span className="badge badge-accepted">✅ Supervisor Signed</span>}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link to="/student/dashboard" className="btn btn-ghost btn-sm">← Back</Link>
          <Link to={`/student/ethics-upload/${id}`} className="btn btn-outline btn-sm">📋 Ethics Cert</Link>
        </div>
      </div>

      {/* Overall Score */}
      {results && results.evaluatorCount > 0 && (
        <div className="total-score-display mb-2">
          <div className="total-score-num">{avg?.toFixed(1)}</div>
          <div className="total-score-label">Average Score out of 100 · {results.evaluatorCount} evaluator(s)</div>
          <div style={{marginTop:12}}>
            <div className="progress-bar" style={{width:'60%',margin:'0 auto'}}>
              <div className="progress-fill" style={{width:`${avg}%`}} />
            </div>
          </div>
          <div style={{marginTop:10,fontSize:14,fontWeight:700,color:'var(--gold)'}}>
            Overall: {results.overallDecision}
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Proposal info */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Proposal Details</h3></div>
          <div className="form-group">
            <div className="form-label">Abstract</div>
            <p style={{fontSize:13.5,lineHeight:1.7,color:'var(--text)'}}>{proposal.abstract}</p>
          </div>
          {proposal.keywords && (
            <div>
              <div className="form-label">Keywords</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                {proposal.keywords.split(',').map((k,i) => (
                  <span key={i} style={{background:'var(--bg)',border:'1px solid var(--border)',padding:'2px 10px',borderRadius:20,fontSize:12}}>{k.trim()}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{marginTop:16,fontSize:12,color:'var(--text-muted)'}}>
            Submitted: {proposal.submissionDate ? new Date(proposal.submissionDate).toLocaleString() : 'Not yet submitted'}
          </div>
        </div>

        {/* Evaluators */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Assigned Evaluators</h3></div>
          {proposal.assignedEvaluators?.length > 0
            ? proposal.assignedEvaluators.map(e => (
              <div key={e.proposalEvaluatorID} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                <div className="user-avatar" style={{width:32,height:32,fontSize:12}}>E</div>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{e.evaluatorName}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Assigned {new Date(e.assignedDate).toLocaleDateString()}</div>
                </div>
                <span style={{marginLeft:'auto',fontSize:11}} className={e.hasSubmittedEvaluation?'text-success':'text-muted'}>
                  {e.hasSubmittedEvaluation ? '✅ Evaluated' : '⏳ Pending'}
                </span>
              </div>
            ))
            : <div className="empty-state"><div className="empty-icon">👤</div><div className="empty-title">Evaluators not yet assigned</div></div>
          }
        </div>
      </div>

      {/* Evaluation Results */}
      {results?.evaluations?.length > 0 && (
        <div className="card mt-2">
          <div className="card-header"><h3 className="card-title">Evaluation Results</h3></div>
          {results.evaluations.map((ev, idx) => (
            <div key={ev.rubricID} style={{marginBottom:24,paddingBottom:24,borderBottom:idx < results.evaluations.length-1 ? '2px solid var(--border)':'none'}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12,color:'var(--navy)'}}>
                Evaluator {idx+1}: {ev.evaluatorName}
                <span style={{fontSize:13,fontWeight:400,marginLeft:12,color:'var(--gold)'}}>Score: {ev.totalScore}/100</span>
              </div>

              {ev.sectionScores && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:14}}>
                  {[
                    {label:'Research Quality', pct:ev.sectionScores.section1Percentage, w:40},
                    {label:'Originality', pct:ev.sectionScores.section2Percentage, w:30},
                    {label:'Presentation', pct:ev.sectionScores.section3Percentage, w:20},
                    {label:'Ethics', pct:ev.sectionScores.section4Percentage, w:10},
                  ].map(s => (
                    <div key={s.label} style={{background:'var(--bg)',padding:'10px 14px',borderRadius:'var(--radius)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                        <span style={{fontWeight:600}}>{s.label} ({s.w}%)</span>
                        <span style={{color:'var(--gold)',fontWeight:700}}>{s.pct?.toFixed(0)}%</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{width:`${s.pct}%`}} /></div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                {[
                  ['Clarity',ev.clarityScore],['Literature',ev.literatureScore],['Methodology',ev.methodologyScore],
                  ['Feasibility',ev.feasibilityScore],['Novelty',ev.noveltyScore],['Contribution',ev.contributionScore],
                  ['Innovation',ev.innovationScore],['Writing',ev.writingScore],['Logic',ev.logicScore],
                  ['Citations',ev.citationScore],['Ethics',ev.ethicsScore],['Risk',ev.riskScore],
                ].map(([label, score]) => (
                  <div key={label} style={{fontSize:12}}>
                    <span style={{color:'var(--text-muted)'}}>{label}: </span>
                    <span style={{color:'var(--gold)'}}>{'★'.repeat(score)}{'☆'.repeat(5-score)}</span>
                  </div>
                ))}
              </div>

              <div style={{background:'var(--bg)',padding:14,borderRadius:'var(--radius)',marginBottom:10}}>
                <div style={{fontWeight:600,fontSize:12,marginBottom:6,color:'var(--navy)'}}>Feedback</div>
                <p style={{fontSize:13,lineHeight:1.6}}>{ev.feedbackNotes}</p>
              </div>

              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <strong style={{fontSize:12}}>Recommendation:</strong>
                <span className={`badge badge-${ev.recommendation==='Accept'?'accepted':ev.recommendation==='Reject'?'rejected':'submitted'}`}>
                  {ev.recommendation}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resubmit option */}
      {proposal.status === 'Rejected' && (
        <div className="alert alert-warning mt-2">
          ⚠️ Your proposal was not accepted. Review the feedback above, revise your document, and resubmit.
          <div style={{marginTop:10}}>
            <Link to="/student/submit-proposal" className="btn btn-primary btn-sm">📤 Submit Revised Proposal</Link>
          </div>
        </div>
      )}
    </div>
  );
}
