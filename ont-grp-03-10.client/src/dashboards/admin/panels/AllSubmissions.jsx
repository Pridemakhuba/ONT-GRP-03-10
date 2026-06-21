const submissions = [
  { id: "SUB-2025-004", student: "N. van der Berg", degree: "Masters", title: "Supply Chain Resilience Post-COVID",   submitted: "17 Jun 2025", examiner: "Prof. Hendricks", status: "Received" },
  { id: "SUB-2025-003", student: "T. Khumalo",       degree: "PhD",     title: "Urban Water Security in SA Metros",    submitted: "10 Jun 2025", examiner: "Dr. Pretorius",   status: "Under Examination" },
  { id: "SUB-2025-001", student: "A. Mostert",       degree: "PhD",     title: "Quantum Key Distribution Protocols",   submitted: "15 May 2025", examiner: "Prof. Grobler",   status: "Corrections Required" },
];

const statusColor = { Received: "#0066CC", "Under Examination": "#F59E0B", "Corrections Required": "#EF4444", Passed: "#10B981" };

export default function AllSubmissions() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Final Submissions</h3>
          <p className="panel-section-sub">Thesis and dissertation examination tracking.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Reference</th><th>Student</th><th>Degree</th><th>Title</th><th>Submitted</th><th>Examiner</th><th>Status</th></tr></thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.id}</td><td className="bold">{s.student}</td><td><span className="type-badge">{s.degree}</span></td>
                <td className="truncate">{s.title}</td><td>{s.submitted}</td><td>{s.examiner}</td>
                <td><span className="status-chip" style={{ "--c": statusColor[s.status] }}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
