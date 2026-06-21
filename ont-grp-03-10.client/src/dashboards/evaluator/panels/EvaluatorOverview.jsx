export default function EvaluatorOverview({ user }) {
  return (
    <div className="panel">
      <div className="panel-welcome">
        <div>
          <h3 className="panel-welcome-title">Welcome, {user?.name}</h3>
          <p className="panel-welcome-sub">{user?.meta?.title} · {user?.meta?.institution}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#F59E0B" }} />
          <span className="stat-card-value" style={{ color: "#F59E0B" }}>{user?.meta?.pendingReviews}</span>
          <span className="stat-card-label">Pending Reviews</span>
          <span className="stat-card-delta">Awaiting your feedback</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#10B981" }} />
          <span className="stat-card-value" style={{ color: "#10B981" }}>14</span>
          <span className="stat-card-label">Completed This Year</span>
          <span className="stat-card-delta">Avg turnaround 6 days</span>
        </div>
      </div>

      <div className="info-callout">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#0066CC" strokeWidth="1.3"/>
          <rect x="7.4" y="7" width="1.2" height="4.5" fill="#0066CC"/><rect x="7.4" y="4" width="1.2" height="1.5" fill="#0066CC"/>
        </svg>
        You'll receive an automated notification whenever a new proposal is assigned to you for review.
      </div>

      <div className="panel-section">
        <h4 className="section-title">Your Review Queue</h4>
        <div className="activity-list">
          <div className="activity-row">
            <div className="activity-dot" style={{ background: "#F59E0B" }} />
            <div className="activity-body">
              <span className="activity-student">K. Mthembu</span>
              <span className="activity-action">ESG Reporting in SA Corporates — awaiting your review</span>
            </div>
            <span className="activity-time">Assigned 3d ago</span>
          </div>
          <div className="activity-row">
            <div className="activity-dot" style={{ background: "#F59E0B" }} />
            <div className="activity-body">
              <span className="activity-student">J. Adams</span>
              <span className="activity-action">Renewable Energy Policy Frameworks — awaiting your review</span>
            </div>
            <span className="activity-time">Assigned 6d ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
