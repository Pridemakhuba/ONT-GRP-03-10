const myStudents = [
  { name: "M. Dlamini",  degree: "PhD",     status: "On Track", lastContact: "3 days ago" },
  { name: "T. Khumalo",  degree: "PhD",     status: "On Track", lastContact: "1 week ago" },
  { name: "R. Smith",    degree: "Masters", status: "Needs Attention", lastContact: "1 month ago" },
];

const statusColor = { "On Track": "#10B981", "Needs Attention": "#EF4444" };

export default function SupervisorOverview({ user }) {
  return (
    <div className="panel">
      <div className="panel-welcome">
        <div>
          <h3 className="panel-welcome-title">Welcome, {user?.name}</h3>
          <p className="panel-welcome-sub">{user?.meta?.title} · {user?.meta?.faculty} · Supervising {user?.meta?.studentCount} candidates</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#0066CC" }} />
          <span className="stat-card-value" style={{ color: "#0066CC" }}>{user?.meta?.studentCount}</span>
          <span className="stat-card-label">Total Students</span>
          <span className="stat-card-delta">Across all years</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#EF4444" }} />
          <span className="stat-card-value" style={{ color: "#EF4444" }}>1</span>
          <span className="stat-card-label">Needs Attention</span>
          <span className="stat-card-delta">No contact in 30+ days</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#F59E0B" }} />
          <span className="stat-card-value" style={{ color: "#F59E0B" }}>2</span>
          <span className="stat-card-label">Reports Due</span>
          <span className="stat-card-delta">This month</span>
        </div>
      </div>

      <div className="panel-section">
        <h4 className="section-title">My Students</h4>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Degree</th><th>Status</th><th>Last Contact</th></tr></thead>
            <tbody>
              {myStudents.map((s) => (
                <tr key={s.name}>
                  <td className="bold">{s.name}</td><td><span className="type-badge">{s.degree}</span></td>
                  <td><span className="status-chip" style={{ "--c": statusColor[s.status] }}>{s.status}</span></td>
                  <td>{s.lastContact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
