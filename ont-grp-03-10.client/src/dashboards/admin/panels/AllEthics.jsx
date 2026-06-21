const apps = [
  { ref: "ETH-2025-011", student: "K. Mthembu", type: "Full Review", submitted: "20 May 2025", committee: "Commerce Ethics",   outcome: "Pending" },
  { ref: "ETH-2025-009", student: "M. Dlamini", type: "Expedited",   submitted: "10 May 2025", committee: "Science Ethics",    outcome: "Approved" },
  { ref: "ETH-2025-007", student: "L. Botha",   type: "Exemption",   submitted: "01 Apr 2025", committee: "Humanities Ethics", outcome: "Approved" },
  { ref: "ETH-2025-012", student: "P. Nkosi",   type: "Full Review", submitted: "05 Jun 2025", committee: "Law Ethics",        outcome: "Under Review" },
];

const outcomeColor = { Approved: "#10B981", Pending: "#F59E0B", "Under Review": "#0066CC", Rejected: "#EF4444" };

export default function AllEthics() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Ethics Applications</h3>
          <p className="panel-section-sub">All committee submissions across faculties.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Reference</th><th>Student</th><th>Review Type</th><th>Submitted</th><th>Committee</th><th>Outcome</th></tr></thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.ref}>
                <td className="mono">{a.ref}</td><td className="bold">{a.student}</td><td>{a.type}</td><td>{a.submitted}</td><td>{a.committee}</td>
                <td><span className="status-chip" style={{ "--c": outcomeColor[a.outcome] }}>{a.outcome}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
