// ============================================================
// src/App.jsx
// Root component: routing, layout, and role-based protection
// ============================================================
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/common/Sidebar';
import Login from './components/auth/Login';
import ManageDeadlines from './components/admin/ManageDeadlines';
// Lazy imports for code splitting
import StudentDashboard from './components/student/StudentDashboard';
import SubmitProposal from './components/student/SubmitProposal';
import ProposalDetail from './components/student/ProposalDetail';
import EthicsUpload from './components/student/EthicsUpload';

import SupervisorDashboard from './components/supervisor/SupervisorDashboard';
import AssignEvaluators from './components/supervisor/AssignEvaluators';
import SupervisorStudents from './components/supervisor/SupervisorStudents';

import EvaluatorDashboard from './components/evaluator/EvaluatorDashboard';
import EvaluationForm from './components/evaluator/EvaluationForm';

import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import ImportFromAD from './components/admin/ImportFromAD';
import AssignSupervisor from './components/admin/AssignSupervisor';

// ---- Route guard: redirect to login if not authenticated ----
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

// ---- App shell: sidebar + main content ----
function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}

// ---- Role-based home redirect after login ----
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const routes = {
    Student:    '/student/dashboard',
    Supervisor: '/supervisor/dashboard',
    Evaluator:  '/evaluator/dashboard',
    Admin:      '/admin/dashboard',
  };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={
        <div className="error-page">
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      } />

      {/* Home redirect */}
      <Route path="/" element={<HomeRedirect />} />

      {/* ---- Student routes ---- */}
      <Route path="/student/*" element={
        <ProtectedRoute roles={['Student']}>
          <AppShell>
            <Routes>
              <Route path="dashboard"           element={<StudentDashboard />} />
              <Route path="submit-proposal"     element={<SubmitProposal />} />
              <Route path="proposals/:id"       element={<ProposalDetail />} />
              <Route path="ethics-upload/:proposalId" element={<EthicsUpload />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />

      {/* ---- Supervisor routes ---- */}
      <Route path="/supervisor/*" element={
        <ProtectedRoute roles={['Supervisor', 'Admin']}>
          <AppShell>
            <Routes>
              <Route path="dashboard"         element={<SupervisorDashboard />} />
              <Route path="students"          element={<SupervisorStudents />} />
              <Route path="assign-evaluators/:proposalId" element={<AssignEvaluators />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />

      {/* ---- Evaluator routes ---- */}
      <Route path="/evaluator/*" element={
        <ProtectedRoute roles={['Evaluator', 'Supervisor', 'Admin']}>
          <AppShell>
            <Routes>
              <Route path="dashboard"           element={<EvaluatorDashboard />} />
              <Route path="evaluate/:proposalId" element={<EvaluationForm />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />

      {/* ---- Admin routes ---- */}
      <Route path="/admin/*" element={
        <ProtectedRoute roles={['Admin']}>
          <AppShell>
            <Routes>
              <Route path="dashboard"          element={<AdminDashboard />} />
              <Route path="users"              element={<UserManagement />} />
              <Route path="import-ad"          element={<ImportFromAD />} />
              <Route path="assign-supervisor"  element={<AssignSupervisor />} />
              <Route path="deadlines" element={<ManageDeadlines />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} theme="light" />
      </BrowserRouter>
    </AuthProvider>
  );
}