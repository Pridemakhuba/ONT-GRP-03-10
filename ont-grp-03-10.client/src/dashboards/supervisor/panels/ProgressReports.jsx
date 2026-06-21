export default function ProgressReports() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">Progress Reports</h3>
          <p className="panel-section-sub">Submit and review academic progress reports for your students.</p>
        </div>
        <button className="primary-btn">+ New Report</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Student</th><th>Period</th><th>Submitted</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td className="bold">M. Dlamini</td><td>Jan – Jun 2025</td><td>—</td><td><span className="status-chip" style={{ "--c": "#F59E0B" }}>Due 30 Jun</span></td></tr>
            <tr><td className="bold">M. Dlamini</td><td>Jul – Dec 2024</td><td>05 Jan 2025</td><td><span className="status-chip" style={{ "--c": "#10B981" }}>Submitted</span></td></tr>
            <tr><td className="bold">R. Smith</td><td>6-Month Check-in</td><td>14 Mar 2025</td><td><span className="status-chip" style={{ "--c": "#10B981" }}>Submitted</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
