const queue = [
  { ref: "PROP-0043", student: "K. Mthembu", title: "ESG Reporting in SA Corporates",          assigned: "18 Jun 2025", priority: "High"   },
  { ref: "PROP-0046", student: "J. Adams",   title: "Renewable Energy Policy Frameworks",       assigned: "15 Jun 2025", priority: "Medium" },
  { ref: "PROP-0048", student: "S. Reddy",   title: "Digital Banking Adoption in Rural Areas",  assigned: "20 Jun 2025", priority: "Low"    },
];

const priorityColor = { High: "#EF4444", Medium: "#F59E0B", Low: "#94A3B8" };

export default function ReviewQueue() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Review Queue</h3>
          <p className="panel-section-sub">Proposals assigned to you for evaluation.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Ref</th><th>Student</th><th>Title</th><th>Assigned</th><th>Priority</th><th></th></tr></thead>
          <tbody>
            {queue.map((q) => (
              <tr key={q.ref}>
                <td className="mono">{q.ref}</td><td className="bold">{q.student}</td><td className="truncate">{q.title}</td>
                <td>{q.assigned}</td>
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
