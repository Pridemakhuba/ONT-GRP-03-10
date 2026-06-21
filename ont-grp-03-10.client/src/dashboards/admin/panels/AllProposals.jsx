const proposals = [
  { id: "PROP-0042", student: "M. Dlamini",  title: "Machine Learning in Protein Folding",                 submitted: "12 May 2025", evaluator: "Prof. Jacobs",   status: "Approved" },
  { id: "PROP-0043", student: "K. Mthembu",  title: "ESG Reporting in SA Corporates",                       submitted: "18 May 2025", evaluator: "Dr. Ferreira",   status: "Under Review" },
  { id: "PROP-0044", student: "P. Nkosi",    title: "Constitutional Rights in Digital Spaces",               submitted: "02 Jun 2025", evaluator: "Unassigned",     status: "Pending" },
  { id: "PROP-0040", student: "L. Botha",    title: "Oral Traditions in Contemporary Afrikaans Literature", submitted: "30 Apr 2025", evaluator: "Prof. Swart",    status: "Revision Required" },
];

const statusColor = { Approved: "#10B981", "Under Review": "#0066CC", Pending: "#F59E0B", "Revision Required": "#EF4444" };

export default function AllProposals() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">All Proposals</h3>
          <p className="panel-section-sub">Assign evaluators and track proposal outcomes.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Ref</th><th>Student</th><th>Title</th><th>Submitted</th><th>Evaluator</th><th>Status</th></tr></thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.id}</td><td className="bold">{p.student}</td><td className="truncate">{p.title}</td>
                <td>{p.submitted}</td><td>{p.evaluator}</td>
                <td><span className="status-chip" style={{ "--c": statusColor[p.status] }}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
