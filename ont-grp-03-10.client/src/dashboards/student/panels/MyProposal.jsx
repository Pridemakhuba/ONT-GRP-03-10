export default function MyProposal() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">My Research Proposal</h3>
          <p className="panel-section-sub">Track your proposal through the evaluation process.</p>
        </div>
        <button className="primary-btn">+ Submit New Version</button>
      </div>

      <div className="detail-card">
        <div className="detail-card-header">
          <span className="mono">PROP-0042</span>
          <span className="status-chip" style={{ "--c": "#10B981" }}>Approved</span>
        </div>
        <h4 className="detail-card-title">Machine Learning in Protein Folding</h4>
        <div className="detail-grid">
          <div><span className="detail-label">Submitted</span><span className="detail-value">12 May 2025</span></div>
          <div><span className="detail-label">Evaluator</span><span className="detail-value">Prof. Jacobs</span></div>
          <div><span className="detail-label">Decision Date</span><span className="detail-value">26 May 2025</span></div>
          <div><span className="detail-label">Decision</span><span className="detail-value" style={{ color: "#10B981", fontWeight: 700 }}>Approved</span></div>
        </div>
        <div className="feedback-box">
          <span className="detail-label">Evaluator Feedback</span>
          <p>Well-structured proposal with a clear methodology. The literature review is comprehensive.
            Proceed to ethics application. Minor revision to the data collection timeline suggested for the final report.</p>
        </div>
      </div>

      <div className="panel-section">
        <h4 className="section-title">Submission History</h4>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Version</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td className="bold">v1.0</td><td>12 May 2025</td><td><span className="status-chip" style={{ "--c": "#10B981" }}>Approved</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
