import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { proposalsApi, evaluationsApi } from '../../services/api';
import { toast } from 'react-toastify';

const RUBRIC = {
  section1: {
    label: 'Research Quality',
    weight: 40,
    criteria: [
      { key: 'clarityScore',      label: 'Clarity of research question' },
      { key: 'literatureScore',   label: 'Literature review quality' },
      { key: 'methodologyScore',  label: 'Methodology appropriateness' },
      { key: 'feasibilityScore',  label: 'Feasibility of timeline' },
    ]
  },
  section2: {
    label: 'Originality & Contribution',
    weight: 30,
    criteria: [
      { key: 'noveltyScore',      label: 'Novelty of approach' },
      { key: 'contributionScore', label: 'Potential contribution to field' },
      { key: 'innovationScore',   label: 'Innovation in methodology' },
    ]
  },
  section3: {
    label: 'Presentation & Structure',
    weight: 20,
    criteria: [
      { key: 'writingScore',      label: 'Writing quality and clarity' },
      { key: 'logicScore',        label: 'Logical flow and organization' },
      { key: 'citationScore',     label: 'Citation quality and relevance' },
    ]
  },
  section4: {
    label: 'Ethics Consideration',
    weight: 10,
    criteria: [
      { key: 'ethicsScore',       label: 'Ethics addressed appropriately' },
      { key: 'riskScore',         label: 'Risk assessment included' },
    ]
  }
};

const RECOMMENDATIONS = ['Accept', 'Minor Revisions', 'Major Revisions', 'Resubmit', 'Reject'];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={`star ${n <= (hover || value) ? 'filled' : ''}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}>
          ★
        </span>
      ))}
      {value > 0 && <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:4}}>{value}/5</span>}
    </div>
  );
}

// Weighted score calculation (mirrors the backend RubricCalculatorService)
function calcScore(scores) {
  const s1 = (scores.clarityScore + scores.literatureScore + scores.methodologyScore + scores.feasibilityScore);
  const s2 = (scores.noveltyScore + scores.contributionScore + scores.innovationScore);
  const s3 = (scores.writingScore + scores.logicScore + scores.citationScore);
  const s4 = (scores.ethicsScore + scores.riskScore);
  const total = (s1/20)*40 + (s2/15)*30 + (s3/15)*20 + (s4/10)*10;
  const sections = {
    s1Pct: (s1/20)*100, s2Pct: (s2/15)*100, s3Pct: (s3/15)*100, s4Pct: (s4/10)*100,
  };
  return { total: Math.round(total * 10) / 10, sections };
}

function autoRecommend(score) {
  if (score >= 80) return 'Accept';
  if (score >= 70) return 'Minor Revisions';
  if (score >= 60) return 'Major Revisions';
  if (score >= 50) return 'Resubmit';
  return 'Reject';
}

export default function EvaluationForm() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const initScores = { clarityScore:0, literatureScore:0, methodologyScore:0, feasibilityScore:0,
    noveltyScore:0, contributionScore:0, innovationScore:0, writingScore:0, logicScore:0,
    citationScore:0, ethicsScore:0, riskScore:0 };

  const [scores, setScores]           = useState(initScores);
  const [recommendation, setRecommendation] = useState('');
  const [feedbackNotes, setFeedback]  = useState('');
  const [confidentialNotes, setConf]  = useState('');

  useEffect(() => {
    async function load() {
      try { const r = await proposalsApi.getById(proposalId); setProposal(r.data); }
      catch { toast.error('Failed to load proposal'); }
      finally { setLoading(false); }
    }
    load();
  }, [proposalId]);

  const { total, sections } = calcScore(scores);
  const allScored = Object.values(scores).every(v => v > 0);

  // Auto-suggest recommendation based on score
  useEffect(() => {
    if (allScored) setRecommendation(autoRecommend(total));
  }, [total, allScored]);

  function setScore(key, val) { setScores(p => ({ ...p, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allScored) { toast.warning('Please rate all criteria before submitting'); return; }
    if (!feedbackNotes.trim()) { toast.warning('Feedback notes are required'); return; }
    if (!recommendation) { toast.warning('Please select a recommendation'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('proposalID', proposalId);
      Object.entries(scores).forEach(([k, v]) => fd.append(k, v));
      fd.append('recommendation', recommendation);
      fd.append('feedbackNotes', feedbackNotes);
      if (confidentialNotes) fd.append('confidentialNotes', confidentialNotes);
      if (file) fd.append('evaluationDocument', file);
      await evaluationsApi.submit(fd);
      toast.success('Evaluation submitted successfully!');
      navigate('/evaluator/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setSaving(false); }
  }

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;
  if (!proposal) return <div className="alert alert-danger">Proposal not found</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Evaluate Proposal</h1>
        <p className="page-subtitle">{proposal.title}</p>
      </div>

      <div className="grid-2 mb-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Proposal Summary</h3></div>
          <p style={{fontSize:13,lineHeight:1.7,color:'var(--text-muted)'}}>{proposal.abstract?.substring(0, 400)}...</p>
          {proposal.keywords && <div style={{marginTop:10,fontSize:12,color:'var(--text-muted)'}}>Keywords: {proposal.keywords}</div>}
        </div>
        {/* Live score display */}
        <div className="total-score-display" style={{display:'flex',flexDirection:'column',justifyContent:'center'}}>
          <div className="total-score-num">{allScored ? total : '—'}</div>
          <div className="total-score-label">Live Score / 100</div>
          {allScored && (
            <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {l:'Research Quality (40%)',p:sections.s1Pct},
                {l:'Originality (30%)',p:sections.s2Pct},
                {l:'Presentation (20%)',p:sections.s3Pct},
                {l:'Ethics (10%)',p:sections.s4Pct},
              ].map(s => (
                <div key={s.l} style={{fontSize:11,textAlign:'left'}}>
                  <div style={{color:'rgba(255,255,255,0.7)',marginBottom:3}}>{s.l}</div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${s.p}%`}} /></div>
                  <div style={{color:'var(--gold)',fontWeight:700,marginTop:2}}>{s.p.toFixed(0)}%</div>
                </div>
              ))}
            </div>
          )}
          {allScored && <div style={{marginTop:12,fontSize:13,fontWeight:700,color:'var(--gold)'}}>Suggested: {autoRecommend(total)}</div>}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Rubric sections */}
        {Object.values(RUBRIC).map(section => (
          <div key={section.label} className="rubric-section">
            <div className="rubric-section-hdr">
              <div className="rubric-section-name">{section.label}</div>
              <span className="rubric-weight-badge">Weight: {section.weight}%</span>
            </div>
            {section.criteria.map(c => (
              <div key={c.key} className="rubric-criterion">
                <span className="criterion-label">{c.label}</span>
                <StarRating value={scores[c.key]} onChange={v => setScore(c.key, v)} />
              </div>
            ))}
            <div className="live-score">
              <span>Section score</span>
              <span style={{color:'var(--gold)'}}>
                {section.criteria.reduce((a,c) => a + scores[c.key], 0)}/{section.criteria.length * 5}
              </span>
            </div>
          </div>
        ))}

        {/* Overall recommendation */}
        <div className="card mb-2">
          <div className="card-header"><h3 className="card-title">Overall Recommendation</h3></div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20}}>
            {RECOMMENDATIONS.map(r => (
              <button key={r} type="button" onClick={() => setRecommendation(r)}
                className={`btn ${recommendation===r ? 'btn-primary' : 'btn-ghost'}`} style={{fontSize:13}}>
                {r === 'Accept' ? '✅' : r === 'Reject' ? '❌' : '📝'} {r}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Written Feedback * <span style={{fontWeight:400,color:'var(--text-muted)'}}>(visible to student)</span></label>
            <textarea className="form-control" rows={5} placeholder="Provide detailed, constructive feedback on the proposal..."
              value={feedbackNotes} onChange={e => setFeedback(e.target.value)} required style={{minHeight:120}} />
          </div>

          <div className="form-group">
            <label className="form-label">Confidential Notes <span style={{fontWeight:400,color:'var(--text-muted)'}}>(supervisor only, not shown to student)</span></label>
            <textarea className="form-control" rows={3} placeholder="Optional notes for the supervisor..."
              value={confidentialNotes} onChange={e => setConf(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Evaluation Document (optional)</label>
            <div className="file-upload-zone" onClick={() => document.getElementById('evalDoc').click()}>
              <div className="file-upload-icon">📎</div>
              <div className="file-upload-text">Attach supporting document (PDF/DOCX)</div>
              <input id="evalDoc" type="file" accept=".pdf,.docx" style={{display:'none'}} onChange={e => setFile(e.target.files[0])} />
            </div>
            {file && <div className="file-selected">✅ {file.name}</div>}
          </div>
        </div>

        <div style={{display:'flex',gap:12}}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving || !allScored}>
            {saving ? 'Submitting...' : '📤 Submit Evaluation'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>
        {!allScored && <div className="form-error mt-1">⚠️ All criteria must be rated before you can submit</div>}
      </form>
    </div>
  );
}
