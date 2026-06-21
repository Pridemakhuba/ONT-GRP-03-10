export default function MySubmission() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">My Final Submission</h3>
          <p className="panel-section-sub">Upload and track your thesis/dissertation examination.</p>
        </div>
      </div>

      <div className="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
          <rect x="6" y="6" width="36" height="36" rx="4"/><path d="M16 32l8-8 6 6 8-10"/>
        </svg>
        <h4>No submission yet</h4>
        <p>You haven't reached your final submission stage. This becomes available once your timeline milestones for fieldwork and drafting are complete.</p>
        <button className="primary-btn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>Upload Final Thesis</button>
      </div>
    </div>
  );
}
