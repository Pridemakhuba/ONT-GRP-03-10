const reportTypes = [
  { name: "Proposal Outcomes Report",  desc: "Approval rates, turnaround times, evaluator workload",   icon: "📄" },
  { name: "Ethics Applications Report", desc: "Committee throughput, outcomes by review type",          icon: "🛡️" },
  { name: "Student Performance Report", desc: "Progress against milestones, at-risk candidates",        icon: "📊" },
  { name: "Faculty Summary Report",     desc: "Candidate counts, completion rates per faculty",          icon: "🏛️" },
];

export default function Reports() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Integrated Reporting Tool</h3>
          <p className="panel-section-sub">Generate status reports on proposal outcomes, ethics applications, and student performance.</p>
        </div>
      </div>

      <div className="report-grid">
        {reportTypes.map((r) => (
          <div key={r.name} className="report-card">
            <span className="report-icon">{r.icon}</span>
            <h4 className="report-name">{r.name}</h4>
            <p className="report-desc">{r.desc}</p>
            <button className="report-btn">Generate Report</button>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <h4 className="section-title">Recently Generated</h4>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Report</th><th>Generated</th><th>By</th><th>Format</th><th></th></tr></thead>
            <tbody>
              <tr><td className="bold">Q2 2025 Faculty Summary</td><td>15 Jun 2025</td><td>S. Petersen</td><td><span className="type-badge">PDF</span></td><td><a href="#" className="table-link">Download</a></td></tr>
              <tr><td className="bold">Proposal Outcomes — May</td><td>02 Jun 2025</td><td>S. Petersen</td><td><span className="type-badge">XLSX</span></td><td><a href="#" className="table-link">Download</a></td></tr>
              <tr><td className="bold">Ethics Throughput — Q1</td><td>10 Apr 2025</td><td>SPGS Office</td><td><span className="type-badge">PDF</span></td><td><a href="#" className="table-link">Download</a></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
