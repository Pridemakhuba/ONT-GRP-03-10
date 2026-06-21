const students = [
  { id: "PG2024001", name: "M. Dlamini",        type: "PhD",     faculty: "Science",     supervisor: "Prof. Adams",   status: "Active",     year: 2 },
  { id: "PG2024002", name: "K. Mthembu",        type: "Masters", faculty: "Commerce",    supervisor: "Dr. Naidoo",    status: "Active",     year: 1 },
  { id: "PG2023015", name: "L. Botha",          type: "PhD",     faculty: "Humanities",  supervisor: "Prof. van Wyk", status: "Active",     year: 3 },
  { id: "PG2024008", name: "N. van der Berg",   type: "Masters", faculty: "Engineering", supervisor: "Dr. Mokoena",   status: "Final Year", year: 2 },
  { id: "PG2024003", name: "P. Nkosi",          type: "PhD",     faculty: "Law",         supervisor: "Prof. Sithole", status: "Pending",    year: 1 },
];

const statusColor = { Active: "#10B981", "Final Year": "#0066CC", Pending: "#F59E0B" };

export default function AllStudents() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Student Register</h3>
          <p className="panel-section-sub">All enrolled postgraduate candidates across faculties.</p>
        </div>
        <button className="primary-btn">+ Register Student</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Student ID</th><th>Name</th><th>Degree</th><th>Faculty</th><th>Supervisor</th><th>Year</th><th>Status</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.id}</td><td className="bold">{s.name}</td>
                <td><span className="type-badge">{s.type}</span></td><td>{s.faculty}</td><td>{s.supervisor}</td><td>{s.year}</td>
                <td><span className="status-chip" style={{ "--c": statusColor[s.status] }}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
