import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/dashboard.css";
import "../../styles/sidebar.css";
import "../../styles/topbar.css";
import "../../styles/panels.css";

/**
 * Generic shell used by every role dashboard.
 * navItems: [{ key, label, icon }]
 * panels: { [key]: Component }
 * moduleLabels: { [key]: { title, desc } }
 * accentColor: sidebar logo tag color per role (optional)
 */
export default function DashboardShell({
  navItems,
  panels,
  moduleLabels,
  defaultModule,
  roleTag,
  roleBadgeColor = "#0066CC",
}) {
  const [activeModule, setActiveModule] = useState(defaultModule);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, isDev } = useAuth();

  const ActivePanel = panels[activeModule] || panels[defaultModule];
  const info = moduleLabels[activeModule] || moduleLabels[defaultModule];
  const today = new Date().toLocaleDateString("en-ZA", { dateStyle: "long" });

  return (
    <div className={`dashboard-root ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <rect width="18" height="18" rx="2" fill="#0066CC"/>
              <rect x="22" width="18" height="18" rx="2" fill="#0066CC" opacity="0.7"/>
              <rect y="22" width="18" height="18" rx="2" fill="#0066CC" opacity="0.7"/>
              <rect x="22" y="22" width="18" height="18" rx="2" fill="#0066CC" opacity="0.4"/>
            </svg>
          </div>
          {sidebarOpen && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="logo-text">PGRS</span>
              <span className="logo-role-tag" style={{ color: roleBadgeColor, borderColor: `${roleBadgeColor}55`, background: `${roleBadgeColor}1A` }}>
                {roleTag}{isDev ? " · DEV" : ""}
              </span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">{sidebarOpen && "Menu"}</span>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeModule === item.key ? "active" : ""}`}
              onClick={() => setActiveModule(item.key)}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user?.initials || "U"}</div>
            {sidebarOpen && (
              <div className="user-info">
                <span className="user-name">{user?.name || "User"}</span>
                <span className="user-email">{user?.username || ""}</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button className="logout-btn" onClick={logout}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6"/>
              </svg>
              Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 4h14M2 9h14M2 14h14"/>
              </svg>
            </button>
            <div className="topbar-heading">
              <h2 className="topbar-title">{info?.title}</h2>
              <p className="topbar-desc">{info?.desc}</p>
            </div>
          </div>
          <div className="topbar-right">
            {isDev && <span className="topbar-dev-chip">DEV · {user?.role}</span>}
            <span className="topbar-date">{today}</span>
            <button className="notif-btn" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M9 2a5 5 0 0 1 5 5v3l1.5 2H2.5L4 10V7a5 5 0 0 1 5-5z"/>
                <path d="M7 14a2 2 0 0 0 4 0"/>
              </svg>
              <span className="notif-badge">3</span>
            </button>
          </div>
        </header>
        <div className="dashboard-content">
          <ActivePanel user={user} />
        </div>
      </div>
    </div>
  );
}
