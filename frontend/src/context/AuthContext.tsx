// ============================================================
// src/context/AuthContext.tsx
// Global authentication state using React Context API
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../services/api';
import type { LoginResponse } from '../types';

interface AuthContextValue {
  user: LoginResponse | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  loading: boolean;
  isStudent: boolean;
  isSupervisor: boolean;
  isEvaluator: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser]       = useState<LoginResponse | null>(null);
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
  const login = useCallback(async (username: string, password: string): Promise<LoginResponse> => {
    const res = await authApi.login({ username, password });
    const data = res.data;

    localStorage.setItem('prs_token', data.token);
    localStorage.setItem('prs_user',  JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  /** Clear session and redirect to login */
  const logout = useCallback(async (): Promise<void> => {
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
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
