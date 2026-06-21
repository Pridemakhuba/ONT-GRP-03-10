import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest, DEV_MODE, DEV_USERS } from "../authConfig";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function LoginPage() {
  const auth = useAuth();
  const msalContext = !DEV_MODE ? useMsal() : null;
  const [selectedDev, setSelectedDev] = useState(DEV_USERS[0].id);
  const [devLoading, setDevLoading] = useState(false);

  const handleMsalLogin = () => {
    msalContext.instance.loginRedirect(loginRequest).catch(console.error);
  };

  const handleDevLogin = () => {
    setDevLoading(true);
    const user = DEV_USERS.find((u) => u.id === selectedDev);
    setTimeout(() => {
      auth.login(user);
      setDevLoading(false);
    }, 600);
  };

  return (
    <div className="login-root">
      <div className="login-left">
        <div className="login-left-content">
          {DEV_MODE && (
            <div className="dev-banner">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 5l3-3 3 3M10 9l-3 3-3-3" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Development Mode
            </div>
          )}
          <div className="institution-badge">
            <span className="badge-dot" />
            Postgraduate Management Platform
          </div>
          <h1 className="login-headline">
            One system.<br />Every milestone.
          </h1>
          <p className="login-subtext">
            Track registration, proposals, ethics approvals, and final
            submissions—across every faculty, every candidate.
          </p>
          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-number">5</span>
              <span className="stat-label">Modules</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">4</span>
              <span className="stat-label">User Roles</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">∞</span>
              <span className="stat-label">Candidates</span>
            </div>
          </div>
        </div>
        <div className="login-modules-preview">
          {["Registration", "Proposals", "Ethics", "Timelines", "Submissions"].map((mod, i) => (
            <div key={mod} className="module-pill" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="module-index">0{i + 1}</span>
              {mod}
            </div>
          ))}
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-card-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="18" height="18" rx="2" fill="#0066CC" />
              <rect x="22" width="18" height="18" rx="2" fill="#0066CC" opacity="0.7" />
              <rect y="22" width="18" height="18" rx="2" fill="#0066CC" opacity="0.7" />
              <rect x="22" y="22" width="18" height="18" rx="2" fill="#0066CC" opacity="0.4" />
            </svg>
            <span className="card-logo-text">PGRS</span>
          </div>

          {DEV_MODE ? (
            <>
              <h2 className="card-title">Developer Login</h2>
              <p className="card-subtitle">
                Select a role to preview the dashboard. Azure AD is bypassed in dev mode.
              </p>

              <div className="dev-role-select">
                {DEV_USERS.map((u) => (
                  <label key={u.id} className={`dev-role-option ${selectedDev === u.id ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="devUser"
                      value={u.id}
                      checked={selectedDev === u.id}
                      onChange={() => setSelectedDev(u.id)}
                    />
                    <div className="dev-role-avatar">{u.initials}</div>
                    <div className="dev-role-info">
                      <span className="dev-role-name">{u.name}</span>
                      <span className="dev-role-email">{u.username}</span>
                    </div>
                    <span className="dev-role-badge">{u.role}</span>
                  </label>
                ))}
              </div>

              <button className="ms-login-btn dev-btn" onClick={handleDevLogin} disabled={devLoading}>
                {devLoading ? (
                  <span className="btn-spinner" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {devLoading ? "Signing in…" : "Enter as " + (DEV_USERS.find(u => u.id === selectedDev)?.role)}
              </button>

              <div className="login-notice dev-notice">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#F59E0B" strokeWidth="1.2"/>
                  <rect x="6.4" y="6" width="1.2" height="4" fill="#F59E0B"/>
                  <rect x="6.4" y="3.5" width="1.2" height="1.5" fill="#F59E0B"/>
                </svg>
                Dev mode is active (<code>VITE_DEV_MODE=true</code>). Set to <code>false</code> in
                production to enforce Microsoft login.
              </div>
            </>
          ) : (
            <>
              <h2 className="card-title">Sign in to continue</h2>
              <p className="card-subtitle">
                Access is restricted to institutional Microsoft accounts.
                Personal accounts are not permitted.
              </p>

              <button className="ms-login-btn" onClick={handleMsalLogin}>
                <svg className="ms-icon" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                Sign in with Microsoft
              </button>

              <div className="login-notice">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#6B7280" strokeWidth="1.2"/>
                  <rect x="6.4" y="6" width="1.2" height="4" fill="#6B7280"/>
                  <rect x="6.4" y="3.5" width="1.2" height="1.5" fill="#6B7280"/>
                </svg>
                Use your <strong>@mandela.ac.za</strong> institutional account only.
              </div>
            </>
          )}

          <div className="login-role-chips">
            <span className="role-chip">Students</span>
            <span className="role-chip">Supervisors</span>
            <span className="role-chip">Evaluators</span>
            <span className="role-chip">Admin</span>
          </div>
        </div>
        <p className="login-footer">
          © {new Date().getFullYear()} School of Postgraduate Studies &nbsp;·&nbsp; Nelson Mandela University
        </p>
      </div>
    </div>
  );
}
