// src/components/admin/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi, studentsApi, supervisorsApi, proposalsApi } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, students: 0, supervisors: 0, proposals: 0, accepted: 0, pending: 0 });
  const [recentUsers, setRecentUsers]     = useState([]);
  const [recentProposals, setRecentProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [uRes, sRes, supRes, pRes] = await Promise.all([
          usersApi.getAll(),
          studentsApi.getAll(),
          supervisorsApi.getAll(),
          proposalsApi.getAll()
        ]);
        setStats({
          users: uRes.data.length,
          students: sRes.data.length,
          supervisors: supRes.data.length,
          proposals: pRes.data.length,
          accepted: pRes.data.filter(p => p.status === 'Accepted').length,
          pending: pRes.data.filter(p => p.status === 'UnderReview').length,
        });
        setRecentUsers(uRes.data.slice(0, 5));
        setRecentProposals(pRes.data.slice(0, 5));
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">SOIT Postgraduate Record System — System Overview</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/admin/import-ad" className="btn btn-gold">📥 Import from AD</Link>
          <Link to="/admin/users" className="btn btn-primary">👥 Manage Users</Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon navy">👤</div>
          <div><div className="stat-value">{stats.users}</div><div className="stat-label">Total Users</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon navy">🎓</div>
          <div><div className="stat-value">{stats.students}</div><div className="stat-label">Students</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold">👨‍🏫</div>
          <div><div className="stat-value">{stats.supervisors}</div><div className="stat-label">Supervisors</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon navy">📄</div>
          <div><div className="stat-value">{stats.proposals}</div><div className="stat-label">Proposals</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value">{stats.accepted}</div><div className="stat-label">Accepted</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold">⏳</div>
          <div><div className="stat-value">{stats.pending}</div><div className="stat-label">Under Review</div></div>
        </div>
      </div>

      <div className="grid-2">
        {/* Recent Users */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Users</h3>
            <Link to="/admin/users" className="btn btn-sm btn-ghost">View All</Link>
          </div>
          {recentUsers.length === 0
            ? <div className="empty-state"><div className="empty-icon">👤</div><div className="empty-title">No users yet</div></div>
            : recentUsers.map(u => (
              <div key={u.userID} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                  {u.firstName[0]}{u.lastName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.firstName} {u.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.aDUsername} · {u.email}</div>
                </div>
                <span className={`badge badge-${u.role === 'Admin' ? 'accepted' : u.role === 'Supervisor' ? 'submitted' : 'draft'}`}>
                  {u.role}
                </span>
              </div>
            ))
          }
        </div>

        {/* Recent Proposals */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Proposals</h3>
          </div>
          {recentProposals.length === 0
            ? <div className="empty-state"><div className="empty-icon">📄</div><div className="empty-title">No proposals yet</div></div>
            : recentProposals.map(p => (
              <div key={p.proposalID} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {p.student?.user?.firstName} {p.student?.user?.lastName}
                  </span>
                  <span className={`badge badge-${
                    p.status === 'Accepted' ? 'accepted' :
                    p.status === 'Rejected' ? 'rejected' :
                    p.status === 'UnderReview' ? 'underreview' :
                    p.status === 'Submitted' ? 'submitted' : 'draft'
                  }`}>{p.status}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Quick links */}
      <div className="card mt-2">
        <div className="card-header"><h3 className="card-title">Quick Actions</h3></div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/admin/import-ad" className="btn btn-outline">📥 Import Users from AD</Link>
          <Link to="/admin/users" className="btn btn-outline">✏️ Manage Roles</Link>
          <Link to="/supervisor/dashboard" className="btn btn-outline">📋 View Proposals</Link>
          <Link to="/evaluator/dashboard" className="btn btn-outline">⭐ View Evaluations</Link>
        </div>
      </div>
    </div>
  );
}
