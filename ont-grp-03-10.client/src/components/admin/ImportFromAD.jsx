// src/components/admin/ImportFromAD.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../services/api';
import { toast } from 'react-toastify';

const ROLES = ['Student', 'Supervisor', 'Evaluator', 'Admin'];

export default function ImportFromAD() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm]   = useState('');
  const [adResults, setAdResults]     = useState([]);
  const [selected, setSelected]       = useState([]);
  const [assignRole, setAssignRole]   = useState('Student');
  const [searching, setSearching]     = useState(false);
  const [importing, setImporting]     = useState(false);
  const [importResults, setImportResults] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchTerm.trim()) { toast.warning('Enter a name or username to search'); return; }
    setSearching(true);
    setAdResults([]);
    setSelected([]);
    setImportResults(null);
    try {
      const res = await usersApi.searchAD(searchTerm);
      setAdResults(res.data);
      if (res.data.length === 0) toast.info('No users found in Active Directory for that search term');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AD search failed. Check LDAP configuration.');
    } finally { setSearching(false); }
  }

  function toggleSelect(username) {
    setSelected(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  }

  function selectAll() {
    const notImported = adResults.filter(u => !u.alreadyInSystem).map(u => u.aDUsername);
    setSelected(notImported);
  }

  async function handleImport() {
    if (selected.length === 0) { toast.warning('Select at least one user to import'); return; }
    setImporting(true);
    try {
      const res = await usersApi.importUsers({ aDUsernames: selected, role: assignRole });
      setImportResults(res.data);
      toast.success(`Import complete: ${res.data.imported} user(s) processed`);
      // Refresh search results to show updated alreadyInSystem flags
      const refreshed = await usersApi.searchAD(searchTerm);
      setAdResults(refreshed.data);
      setSelected([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally { setImporting(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Import Users from Active Directory</h1>
        <p className="page-subtitle">Search AD and import users with their university credentials</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        🔐 Users authenticate with their <strong>existing university credentials</strong>. Importing simply registers
        them in the PRS database so a role can be assigned. No passwords are stored.
      </div>

      {/* Search form */}
      <div className="card mb-2">
        <div className="card-header"><h3 className="card-title">🔍 Search Active Directory</h3></div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 240, marginBottom: 0 }}>
            <label className="form-label">Search by Name or Username</label>
            <input
              className="form-control"
              placeholder="e.g. john or smith or jsmith"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={searching} style={{ marginBottom: 0 }}>
            {searching ? '🔍 Searching...' : '🔍 Search AD'}
          </button>
        </form>
      </div>

      {/* AD Results */}
      {adResults.length > 0 && (
        <div className="card mb-2">
          <div className="card-header">
            <div>
              <h3 className="card-title">AD Results ({adResults.length} found)</h3>
              <p className="card-subtitle">{selected.length} selected for import</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Role assignment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
                  Assign Role:
                </label>
                <select
                  className="form-control"
                  style={{ width: 140, padding: '6px 10px' }}
                  value={assignRole}
                  onChange={e => setAssignRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={selectAll} className="btn btn-sm btn-outline">Select All New</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Name</th>
                  <th>AD Username</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {adResults.map(u => (
                  <tr key={u.aDUsername} style={{ opacity: u.alreadyInSystem ? 0.6 : 1 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(u.aDUsername)}
                        onChange={() => toggleSelect(u.aDUsername)}
                        disabled={u.alreadyInSystem}
                        style={{ width: 16, height: 16, cursor: u.alreadyInSystem ? 'not-allowed' : 'pointer', accentColor: 'var(--navy)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{u.aDUsername}</td>
                    <td style={{ fontSize: 12 }}>{u.email || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.title || '—'}</td>
                    <td>
                      {u.alreadyInSystem
                        ? <span className="badge badge-accepted">✅ In System</span>
                        : <span className="badge badge-draft">New</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={handleImport}
              className="btn btn-gold btn-lg"
              disabled={importing || selected.length === 0}
            >
              {importing ? 'Importing...' : `📥 Import ${selected.length} User(s) as ${assignRole}`}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Already-imported users will have their details updated from AD.
            </span>
          </div>
        </div>
      )}

      {/* Import results summary */}
      {importResults && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Import Results</h3></div>
          <div className="alert alert-success mb-2">
            ✅ Processed {importResults.imported} user(s) successfully.
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>AD Username</th><th>Result</th></tr>
              </thead>
              <tbody>
                {importResults.results?.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace' }}>{r.username}</td>
                    <td>
                      <span className={`badge badge-${
                        r.status === 'Imported' ? 'accepted' :
                        r.status === 'Updated' ? 'submitted' : 'rejected'
                      }`}>
                        {r.status === 'Imported' ? '✅' : r.status === 'Updated' ? '🔄' : '❌'} {r.status}
                      </span>
                      {r.reason && <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 8 }}>{r.reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/admin/users')} className="btn btn-primary">
              👥 Go to User Management
            </button>
            <button onClick={() => setImportResults(null)} className="btn btn-ghost">
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
