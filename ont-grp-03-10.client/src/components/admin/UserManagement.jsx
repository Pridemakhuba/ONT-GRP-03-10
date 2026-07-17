// src/components/admin/UserManagement.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi, studentsApi, supervisorsApi } from '../../services/api';
import { toast } from 'react-toastify';

const ROLES = ['Student', 'Supervisor', 'Evaluator', 'Admin'];
const ROLE_COLORS = {
  Student: 'draft',
  Supervisor: 'submitted',
  Evaluator: 'underreview',
  Admin: 'accepted',
};

export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null); // userId being edited
  const [newRole, setNewRole]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [filterRole, setFilterRole] = useState('');

  // For creating student/supervisor profiles
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showCreateSupervisor, setShowCreateSupervisor] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [studentForm, setStudentForm] = useState({ studentNumber: '', program: '' });
  const [supervisorForm, setSupervisorForm] = useState({ expertise: '' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await usersApi.getAll(search || undefined);
      setUsers(res.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }

  async function handleSearch(e) {
    e.preventDefault();
    loadUsers();
  }

  function startEdit(user) {
    setEditing(user.userID);
    setNewRole(user.role);
  }

  async function saveRole(userId) {
    setSaving(true);
    try {
      await usersApi.updateRole(userId, newRole);
      setUsers(prev => prev.map(u => u.userID === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  }

  async function createStudentProfile() {
    if (!studentForm.studentNumber || !studentForm.program) {
      toast.warning('Student number and program are required');
      return;
    }
    try {
      await studentsApi.create({ userID: selectedUserId, ...studentForm });
      toast.success('Student profile created');
      setShowCreateStudent(false);
      setStudentForm({ studentNumber: '', program: '' });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student profile');
    }
  }

  async function createSupervisorProfile() {
    try {
      await supervisorsApi.create({ userID: selectedUserId, expertise: supervisorForm.expertise });
      toast.success('Supervisor profile created');
      setShowCreateSupervisor(false);
      setSupervisorForm({ expertise: '' });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create supervisor profile');
    }
  }

  const displayed = filterRole
    ? users.filter(u => u.role === filterRole)
    : users;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} users in the system</p>
        </div>
        <Link to="/admin/import-ad" className="btn btn-gold">📥 Import from AD</Link>
      </div>

      {/* Search & Filter bar */}
      <div className="card mb-2">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label className="form-label">Search</label>
            <input
              className="form-control"
              placeholder="Search by name, email or AD username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ minWidth: 160, marginBottom: 0 }}>
            <label className="form-label">Filter by Role</label>
            <select className="form-control" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">🔍 Search</button>
        </form>
      </div>

      {/* Users table */}
      <div className="card">
        {loading
          ? <div style={{ padding: 40, textAlign: 'center' }}>Loading users...</div>
          : displayed.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <div className="empty-title">No users found</div>
                <div className="empty-text">Try importing users from Active Directory</div>
              </div>
            )
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>AD Username</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(u => (
                      <tr key={u.userID}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="user-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <span style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {u.aDUsername}
                        </td>
                        <td style={{ fontSize: 12 }}>{u.email}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                        <td>
                          {editing === u.userID ? (
                            <select
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                              value={newRole}
                              onChange={e => setNewRole(e.target.value)}
                            >
                              {ROLES.map(r => <option key={r}>{r}</option>)}
                            </select>
                          ) : (
                            <span className={`badge badge-${ROLE_COLORS[u.role] || 'draft'}`}>{u.role}</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: u.isActive ? 'var(--success)' : 'var(--danger)' }}>
                            {u.isActive ? '● Active' : '● Inactive'}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {u.lastLoginDate ? new Date(u.lastLoginDate).toLocaleDateString() : 'Never'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {editing === u.userID ? (
                              <>
                                <button
                                  onClick={() => saveRole(u.userID)}
                                  className="btn btn-sm btn-primary"
                                  disabled={saving}
                                >
                                  {saving ? '...' : '✅'}
                                </button>
                                <button onClick={() => setEditing(null)} className="btn btn-sm btn-ghost">✕</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(u)} className="btn btn-sm btn-ghost" title="Edit Role">
                                  ✏️
                                </button>
                                {u.role === 'Student' && (
                                  <button
                                    onClick={() => { setSelectedUserId(u.userID); setShowCreateStudent(true); }}
                                    className="btn btn-sm btn-outline"
                                    title="Create Student Profile"
                                  >
                                    🎓
                                  </button>
                                )}
                                {(u.role === 'Supervisor' || u.role === 'Evaluator') && (
                                  <button
                                    onClick={() => { setSelectedUserId(u.userID); setShowCreateSupervisor(true); }}
                                    className="btn btn-sm btn-outline"
                                    title="Create Supervisor Profile"
                                  >
                                    👨‍🏫
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Create Student Profile Modal */}
      {showCreateStudent && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div className="card" style={{ width: 460, maxWidth: '95vw' }}>
            <div className="card-header">
              <h3 className="card-title">Create Student Profile</h3>
              <button onClick={() => setShowCreateStudent(false)} className="btn btn-sm btn-ghost">✕</button>
            </div>
            <div className="alert alert-info">
              This creates a student profile for UserID: <strong>{selectedUserId}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Student Number *</label>
              <input
                className="form-control"
                placeholder="e.g. 220012345"
                value={studentForm.studentNumber}
                onChange={e => setStudentForm(p => ({ ...p, studentNumber: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Program *</label>
              <input
                className="form-control"
                placeholder="e.g. MTech Computer Science"
                value={studentForm.program}
                onChange={e => setStudentForm(p => ({ ...p, program: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={createStudentProfile} className="btn btn-primary">Create Profile</button>
              <button onClick={() => setShowCreateStudent(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Supervisor Profile Modal */}
      {showCreateSupervisor && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div className="card" style={{ width: 460, maxWidth: '95vw' }}>
            <div className="card-header">
              <h3 className="card-title">Create Supervisor Profile</h3>
              <button onClick={() => setShowCreateSupervisor(false)} className="btn btn-sm btn-ghost">✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Area of Expertise</label>
              <input
                className="form-control"
                placeholder="e.g. Machine Learning, Software Engineering"
                value={supervisorForm.expertise}
                onChange={e => setSupervisorForm(p => ({ ...p, expertise: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={createSupervisorProfile} className="btn btn-primary">Create Profile</button>
              <button onClick={() => setShowCreateSupervisor(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
