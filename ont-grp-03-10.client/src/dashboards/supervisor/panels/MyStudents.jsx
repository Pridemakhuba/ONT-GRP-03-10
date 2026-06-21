const students = [
  { id: "PG2024001", name: "M. Dlamini",  degree: "PhD",     year: 2, proposalStatus: "Approved",   ethicsStatus: "Approved",  nextMilestone: "Annual Progress Report — 30 Jun 2025" },
  { id: "PG2025002", name: "T. Khumalo",  degree: "PhD",     year: 1, proposalStatus: "Approved",   ethicsStatus: "Pending",   nextMilestone: "Ethics Decision — Awaiting" },
  { id: "PG2024010", name: "R. Smith",    degree: "Masters", year: 2, proposalStatus: "Approved",   ethicsStatus: "Approved",  nextMilestone: "Final Submission — 31 Aug 2025" },
];

export default function MyStudents() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">My Students</h3>
          <p className="panel-section-sub">Candidates under your supervision.</p>
        </div>
      </div>

      <div className="student-cards">
        {students.map((s) => (
          <div key={s.id} className="student-detail-card">
            <div className="student-detail-header">
              <div>
                <h4>{s.name}</h4>
                <span className="mono" style={{ fontSize: "0.72rem", color: "#94A3B8" }}>{s.id}</span>
              </div>
              <span className="type-badge">{s.degree} · Year {s.year}</span>
            </div>
            <div className="student-detail-row">
              <span className="detail-label">Proposal</span>
              <span className="status-chip" style={{ "--c": s.proposalStatus === "Approved" ? "#10B981" : "#F59E0B" }}>{s.proposalStatus}</span>
            </div>
            <div className="student-detail-row">
              <span className="detail-label">Ethics</span>
              <span className="status-chip" style={{ "--c": s.ethicsStatus === "Approved" ? "#10B981" : "#F59E0B" }}>{s.ethicsStatus}</span>
            </div>
            <div className="student-detail-footer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64748B" strokeWidth="1.4"><circle cx="7" cy="7" r="6"/><path d="M7 4v3l2 2"/></svg>
              {s.nextMilestone}
            </div>
            <button className="report-btn" style={{ marginTop: 10 }}>Submit Progress Report</button>
          </div>
        ))}
      </div>
    </div>
  );
}
