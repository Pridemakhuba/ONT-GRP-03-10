export default function SubmitFeedback() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Submit Feedback</h3>
          <p className="panel-section-sub">Provide your evaluation for PROP-0043.</p>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-card-header">
          <span className="mono">PROP-0043</span>
          <span className="status-chip" style={{ "--c": "#F59E0B" }}>Under Review</span>
        </div>
        <h4 className="detail-card-title">ESG Reporting in SA Corporates</h4>
        <div className="detail-grid">
          <div><span className="detail-label">Student</span><span className="detail-value">K. Mthembu</span></div>
          <div><span className="detail-label">Faculty</span><span className="detail-value">Commerce</span></div>
          <div><span className="detail-label">Submitted</span><span className="detail-value">18 May 2025</span></div>
          <div><span className="detail-label">Degree</span><span className="detail-value">Masters</span></div>
        </div>
      </div>

      <div className="feedback-form">
        <label className="form-label">Decision</label>
        <div className="decision-options">
          <button className="decision-btn approve">Approve</button>
          <button className="decision-btn revise">Request Revision</button>
          <button className="decision-btn reject">Reject</button>
        </div>

        <label className="form-label" style={{ marginTop: 16 }}>Feedback / Comments</label>
        <textarea className="feedback-textarea" rows={6} placeholder="Provide detailed feedback for the candidate and supervisor..." />

        <button className="primary-btn" style={{ marginTop: 14 }}>Submit Evaluation</button>
      </div>
    </div>
  );
}
