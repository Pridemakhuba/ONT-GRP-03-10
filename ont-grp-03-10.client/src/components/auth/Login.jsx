import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const roleHome = { Student: '/student/dashboard', Supervisor: '/supervisor/dashboard', Evaluator: '/evaluator/dashboard', Admin: '/admin/dashboard' };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) { setError('Please enter your username and password.'); return; }
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      navigate(roleHome[user.role] || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid university credentials. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-badge">SOIT</div>
          <h1>Postgraduate Record System</h1>
          <p>School of Information Technology</p>
        </div>
        <div className="ad-badge">
          🔒 University Active Directory Authentication
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">⚠️ {error}</div>}
          <div className="form-group">
            <label className="form-label">University Username</label>
            <div className="form-hint">Format: university\username or just your username</div>
            <input type="text" className="form-control" placeholder="university\username" value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" placeholder="Your university password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Authenticating...' : '🔐 Login with University Credentials'}
          </button>
        </form>
        <div className="login-footer">
          Use your existing university credentials — no separate account needed.<br/>
          <span style={{marginTop:8,display:'block'}}>Trouble logging in? Contact the <strong>DoIT Help Desk</strong></span>
          <span style={{marginTop:12,display:'block',color:'#bbb',fontSize:10}}>Powered by DoIT Development Team · University Active Directory</span>
        </div>
      </div>
    </div>
  );
}
