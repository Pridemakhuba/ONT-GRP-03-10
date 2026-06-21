const stats = [
  { label: "Active Candidates",      value: "148", delta: "+12 this term",       color: "#0066CC" },
  { label: "Pending Proposals",      value: "23",  delta: "8 awaiting review",   color: "#F59E0B" },
  { label: "Ethics Applications",    value: "17",  delta: "5 approved this month", color: "#10B981" },
  { label: "Final Submissions",      value: "9",   delta: "Due within 30 days",  color: "#EF4444" },
];

const activity = [
  { student: "M. Dlamini",          action: "Proposal approved by evaluator",        time: "2h ago",      status: "success" },
  { student: "K. Mthembu",          action: "Ethics application submitted",          time: "4h ago",      status: "pending" },
  { student: "L. Botha",            action: "6-month milestone reminder sent",       time: "Yesterday",   status: "info" },
  { student: "N. van der Berg",     action: "Final thesis uploaded",                 time: "Yesterday",   status: "success" },
  { student: "P. Nkosi",            action: "New PhD candidate registered",          time: "2 days ago",  status: "info" },
];

const statusColors = { success: "#10B981", pending: "#F59E0B", info: "#0066CC" };

export default function AdminOverview({ user }) {
  return (
    <div className="panel">
      <div className="panel-welcome">
        <div>
          <h3 className="panel-welcome-title">Welcome, {user?.name}</h3>
          <p className="panel-welcome-sub">{user?.meta?.title} · System-wide snapshot across all faculties.</p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-accent" style={{ background: s.color }} />
            <span className="stat-card-value" style={{ color: s.color }}>{s.value}</span>
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-delta">{s.delta}</span>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <h4 className="section-title">System-Wide Activity</h4>
        <div className="activity-list">
          {activity.map((item, i) => (
            <div key={i} className="activity-row">
              <div className="activity-dot" style={{ background: statusColors[item.status] }} />
              <div className="activity-body">
                <span className="activity-student">{item.student}</span>
                <span className="activity-action">{item.action}</span>
              </div>
              <span className="activity-time">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
