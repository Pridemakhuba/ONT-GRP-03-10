const milestones = [
  { name: "Registration Confirmed",        date: "15 Feb 2024", status: "done" },
  { name: "Proposal Submitted & Approved", date: "12 May 2025", status: "done" },
  { name: "Ethics Clearance",              date: "22 May 2025", status: "done" },
  { name: "Annual Progress Report",        date: "30 Jun 2025", status: "due-soon", daysLeft: 12 },
  { name: "Fieldwork Completion",          date: "31 Dec 2025", status: "upcoming" },
  { name: "Draft Thesis Submission",       date: "30 Jun 2026", status: "upcoming" },
  { name: "Final Submission",              date: "31 Dec 2026", status: "upcoming" },
];

const statusColor = { done: "#10B981", "due-soon": "#F59E0B", upcoming: "#94A3B8" };
const statusLabel = { done: "Completed", "due-soon": "Due Soon", upcoming: "Upcoming" };

export default function MyTimeline({ user }) {
  const isPhD = user?.meta?.degreeType === "PhD";
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">My Timeline</h3>
          <p className="panel-section-sub">
            {isPhD ? "PhD candidates report annually." : "Masters candidates report every 6 months."} Automated reminders are sent ahead of each deadline.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Milestone</th><th>Target Date</th><th>Status</th></tr></thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.name}>
                <td className="bold">{m.name}</td>
                <td>{m.date}</td>
                <td>
                  <span className="status-chip" style={{ "--c": statusColor[m.status] }}>
                    {statusLabel[m.status]}{m.daysLeft ? ` · ${m.daysLeft}d left` : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
