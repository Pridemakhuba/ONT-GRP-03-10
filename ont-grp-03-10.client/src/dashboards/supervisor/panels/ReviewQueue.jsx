// Supervisors also act as evaluators for OTHER supervisors' students —
// never for their own supervisees (conflict of interest).
const queue = [
  { ref: "PROP-0048", student: "S. Reddy",   faculty: "Engineering", title: "Digital Banking Adoption in Rural Areas", assigned: "20 Jun 2025", priority: "Medium" },
  { ref: "PROP-0051", student: "J. Naidoo",  faculty: "Science",     title: "Coastal Erosion Modelling in Algoa Bay",   assigned: "17 Jun 2025", priority: "High"   },
];

const priorityColor = { High: "#EF4444", Medium: "#F59E0B", Low: "#94A3B8" };

export default function ReviewQueue() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Review Queue</h3>
          <p className="panel-section-sub">Proposals from other supervisors' students, assigned to you for evaluation.</p>
        </div>
      </div>

      <div className="info-callout">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#0066CC" strokeWidth="1.3"/>
          <rect x="7.4" y="7" width="1.2" height="4.5" fill="#0066CC"/><rect x="7.4" y="4" width="1.2" height="1.5" fill="#0066CC"/>
        </svg>
        You are never assigned to review your own supervisees' proposals — this queue only shows candidates supervised by colleagues.
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Ref</th><th>Student</th><th>Faculty</th><th>Title</th><th>Assigned</th><th>Priority</th><th></th></tr></thead>
          <tbody>
            {queue.map((q) => (
              <tr key={q.ref}>
                <td className="mono">{q.ref}</td><td className="bold">{q.student}</td><td>{q.faculty}</td>
                <td className="truncate">{q.title}</td><td>{q.assigned}</td>
                <td><span className="status-chip" style={{ "--c": priorityColor[q.priority] }}>{q.priority}</span></td>
                <td><button className="table-link-btn">Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
