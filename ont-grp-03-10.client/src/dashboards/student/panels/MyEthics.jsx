export default function MyEthics() {
  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h3 className="panel-section-heading">My Ethics Application</h3>
          <p className="panel-section-sub">Status of your research ethics clearance.</p>
        </div>
        <button className="primary-btn">+ New Application</button>
      </div>

      <div className="detail-card">
        <div className="detail-card-header">
          <span className="mono">ETH-2025-009</span>
          <span className="status-chip" style={{ "--c": "#10B981" }}>Approved</span>
        </div>
        <h4 className="detail-card-title">Expedited Review</h4>
        <div className="detail-grid">
          <div><span className="detail-label">Submitted</span><span className="detail-value">10 May 2025</span></div>
          <div><span className="detail-label">Committee</span><span className="detail-value">Science Ethics</span></div>
          <div><span className="detail-label">Decision Date</span><span className="detail-value">22 May 2025</span></div>
          <div><span className="detail-label">Clearance No.</span><span className="detail-value mono">SCI-ETH-2025-009</span></div>
        </div>
      </div>

      <div className="info-callout">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#0066CC" strokeWidth="1.3"/>
          <rect x="7.4" y="7" width="1.2" height="4.5" fill="#0066CC"/><rect x="7.4" y="4" width="1.2" height="1.5" fill="#0066CC"/>
        </svg>
        Your ethics clearance is valid for the duration of your study. Renew if your methodology changes significantly.
      </div>
    </div>
  );
}
