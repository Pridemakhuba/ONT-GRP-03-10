const journey = [
  { step: "Registration", status: "done" },
  { step: "Proposal", status: "done" },
  { step: "Ethics Approval", status: "active" },
  { step: "Fieldwork / Data Collection", status: "pending" },
  { step: "Final Submission", status: "pending" },
];

export default function MyOverview({ user }) {
  const meta = user?.meta || {};
  return (
    <div className="panel">
      <div className="panel-welcome">
        <div>
          <h3 className="panel-welcome-title">Welcome back, {user?.name?.split(" ")[0]}</h3>
          <p className="panel-welcome-sub">
            {meta.degreeType} Candidate · {meta.faculty} · Student No. {meta.studentNumber}
          </p>
        </div>
      </div>

      <div className="panel-section">
        <h4 className="section-title">My Journey</h4>
        <div className="journey-track">
          {journey.map((j, i) => (
            <div key={j.step} className={`journey-step ${j.status}`}>
              <div className="journey-dot">
                {j.status === "done" ? "✓" : i + 1}
              </div>
              <span className="journey-label">{j.step}</span>
              {i < journey.length - 1 && <div className={`journey-line ${j.status === "done" ? "done" : ""}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#10B981" }} />
          <span className="stat-card-value" style={{ color: "#10B981" }}>Approved</span>
          <span className="stat-card-label">Proposal Status</span>
          <span className="stat-card-delta">Decided 12 May 2025</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#F59E0B" }} />
          <span className="stat-card-value" style={{ color: "#F59E0B" }}>Pending</span>
          <span className="stat-card-label">Ethics Application</span>
          <span className="stat-card-delta">Submitted 10 May 2025</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#EF4444" }} />
          <span className="stat-card-value" style={{ color: "#EF4444" }}>12 days</span>
          <span className="stat-card-label">Next Deadline</span>
          <span className="stat-card-delta">Annual Progress Report</span>
        </div>
      </div>

      <div className="panel-section">
        <h4 className="section-title">Recent Notifications</h4>
        <div className="activity-list">
          <div className="activity-row">
            <div className="activity-dot" style={{ background: "#0066CC" }} />
            <div className="activity-body">
              <span className="activity-student">Reminder</span>
              <span className="activity-action">Your Annual Progress Report is due in 12 days</span>
            </div>
            <span className="activity-time">Today</span>
          </div>
          <div className="activity-row">
            <div className="activity-dot" style={{ background: "#10B981" }} />
            <div className="activity-body">
              <span className="activity-student">Proposal Update</span>
              <span className="activity-action">Your proposal "Machine Learning in Protein Folding" was approved</span>
            </div>
            <span className="activity-time">2 days ago</span>
          </div>
          <div className="activity-row">
            <div className="activity-dot" style={{ background: "#F59E0B" }} />
            <div className="activity-body">
              <span className="activity-student">Ethics</span>
              <span className="activity-action">Your ethics application was received by Science Ethics committee</span>
            </div>
            <span className="activity-time">6 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
