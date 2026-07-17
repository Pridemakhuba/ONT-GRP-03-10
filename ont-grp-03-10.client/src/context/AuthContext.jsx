// ============================================================
// src/context/AuthContext.jsx
// Global authentication state using React Context API
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while checking stored session

  // On mount: restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('prs_user');
    const token  = localStorage.getItem('prs_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  /** Login with AD credentials. Returns the logged-in user on success. */
  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password });
    const data = res.data;

    localStorage.setItem('prs_token', data.token);
    localStorage.setItem('prs_user',  JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  /** Clear session and redirect to login */
  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('prs_token');
    localStorage.removeItem('prs_user');
    setUser(null);
  }, []);

  /** Convenience role checks */
  const isStudent    = user?.role === 'Student';
  const isSupervisor = user?.role === 'Supervisor';
  const isEvaluator  = user?.role === 'Evaluator';
  const isAdmin      = user?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isStudent, isSupervisor, isEvaluator, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access auth state anywhere in the app */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
