import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicClientApplication } from '@azure/msal-browser';
import { useAuth } from '../../context/AuthContext';
import type { UserRole, ApiErrorResponse } from '../../types';
import loginBg from '../../assets/login-bg.jpg';
import loginBg2 from '../../assets/22.jpg';
import loginBg3 from '../../assets/South.jpg';
import logo from '../../assets/logo.png';

interface LoginForm {
  username: string;
  password: string;
}

interface ApiErrorLike {
  response?: { data?: ApiErrorResponse };
}

const backgrounds = [loginBg, loginBg2, loginBg3];

const msalInstance = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MS_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
});

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState<LoginForm>({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [logoZooming, setLogoZooming] = useState(true);
  const roleHome: Record<UserRole, string> = {
    Student: '/student/dashboard',
    Supervisor: '/supervisor/dashboard',
    Evaluator: '/evaluator/dashboard',
    Admin: '/admin/dashboard',
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % backgrounds.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setLogoZooming(false), 2000);
    return () => clearTimeout(timeout);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) { setError('Please enter your username and password.'); return; }
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      navigate(roleHome[user.role] || '/', { replace: true });
    } catch (err) {
      const apiErr = err as ApiErrorLike;
      setError(apiErr.response?.data?.message || 'Invalid university credentials. Please try again.');
    } finally { setLoading(false); }
  }

  async function handleMicrosoftLogin() {
    setError('');
    setMsLoading(true);
    try {
      await msalInstance.initialize();
      const result = await msalInstance.loginPopup({ scopes: ['openid', 'profile', 'email'] });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/microsoft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: result.idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Microsoft login failed.');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      navigate(roleHome[data.role as UserRole] || '/', { replace: true });
    } catch (err) {
      console.error('Microsoft login error:', err);
      setError('Microsoft sign-in failed. Please try again.');
    } finally {
      setMsLoading(false);
    }
  }

  return (
    <div className="login-page">
      {backgrounds.map((bg, i) => (
        <div
          key={bg}
          className="login-bg-layer"
          style={{
            backgroundImage: `linear-gradient(rgba(10,15,30,0.65), rgba(10,15,30,0.65)), url(${bg})`,
            opacity: i === bgIndex ? 1 : 0,
          }}
        />
      ))}

      <div className="login-card fade-in-up">
        <div className="login-logo">
          <img
            src={logo}
            alt="Nelson Mandela University"
            className={logoZooming ? 'logo-image logo-zoom' : 'logo-image logo-settled'}
          />
          <h1 className={logoZooming ? 'text-hidden' : 'fade-in-up'}>Postgraduate Record System</h1>
          <p className={logoZooming ? 'text-hidden' : 'fade-in-up delay-1'}>School of Information Technology</p>
        </div>

        <form onSubmit={handleSubmit} className={logoZooming ? 'text-hidden' : 'fade-in-up delay-2'}>
          {error && <div className="alert alert-danger">⚠️ {error}</div>}
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-hint">Nelson Mandela University Username</div>
            <input type="text" className="form-control" placeholder="username" value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" placeholder="password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Authenticating...' : 'Login '}
          </button>
        </form>

        <div className={logoZooming ? 'text-hidden' : 'login-divider fade-in-up delay-3'}>
          <span>or</span>
        </div>

        
        <div className={logoZooming ? 'text-hidden' : 'login-footer fade-in-up delay-4'}>
          Use your existing university credentials — no separate account needed.<br/>
          <span style={{marginTop:8,display:'block'}}>Trouble logging in? Contact the <strong><a href="https://ict.mandela.ac.za/ict-helpdesk">Help Desk</a></strong></span>
          <span style={{marginTop:12,display:'block',color:'#bbb',fontSize:10}}>Powered by DoIT Development Team · For Nelson Mandela University Students</span>
        </div>
      </div>
    </div>
  );
}