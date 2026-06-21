const milestones = [
  { student: "M. Dlamini",        degree: "PhD",     milestone: "Annual Progress Report", due: "30 Jun 2025", daysLeft: 12,  status: "Due Soon" },
  { student: "K. Mthembu",        degree: "Masters", milestone: "6-Month Check-in",        due: "15 Jul 2025", daysLeft: 27,  status: "On Track" },
  { student: "N. van der Berg",   degree: "Masters", milestone: "Final Submission",        due: "31 Aug 2025", daysLeft: 74,  status: "On Track" },
  { student: "L. Botha",          degree: "PhD",     milestone: "3-Year Review",            due: "01 Jun 2025", daysLeft: -17, status: "Overdue" },
  { student: "P. Nkosi",          degree: "PhD",     milestone: "Proposal Approval",        due: "20 Jul 2025", daysLeft: 32,  status: "On Track" },
];

const statusColor = { "Due Soon": "#F59E0B", "On Track": "#10B981", Overdue: "#EF4444" };

export default function AllTimelines() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Milestones & Timelines</h3>
          <p className="panel-section-sub">Automated deadline tracking for all candidates.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Student</th><th>Degree</th><th>Milestone</th><th>Due Date</th><th>Days Left</th><th>Status</th></tr></thead>
          <tbody>
            {milestones.map((m, i) => (
              <tr key={i}>
                <td className="bold">{m.student}</td><td><span className="type-badge">{m.degree}</span></td><td>{m.milestone}</td><td>{m.due}</td>
                <td className={m.daysLeft < 0 ? "text-danger" : m.daysLeft < 14 ? "text-warn" : ""}>
                  {m.daysLeft < 0 ? `${Math.abs(m.daysLeft)}d overdue` : `${m.daysLeft}d`}
                </td>
                <td><span className="status-chip" style={{ "--c": statusColor[m.status] }}>{m.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
