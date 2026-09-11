// ============================================================
// src/App.tsx
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/common/Sidebar';
import Login from './components/auth/Login';

// Student
import StudentDashboard from './components/student/StudentDashboard';
import SubmitProposal from './components/student/SubmitProposal';
import ProposalDetail from './components/student/ProposalDetail';
import EthicsUpload from './components/student/EthicsUpload';
import ResubmitProposal from './components/student/ResubmitProposal';

// Supervisor
import SupervisorDashboard from './components/supervisor/SupervisorDashboard';
import AssignEvaluators from './components/supervisor/AssignEvaluators';
import SupervisorStudents from './components/supervisor/SupervisorStudents';
import ProposalView from './components/supervisor/ProposalView';

// Evaluator
import EvaluatorDashboard from './components/evaluator/EvaluatorDashboard';
import EvaluationForm from './components/evaluator/EvaluationForm';

// Admin
import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import ImportFromAD from './components/admin/ImportFromAD';
import ReadyForExam from './components/admin/ReadyForExam';
import FinaliseEvaluations from './components/admin/FinaliseEvaluations';
import ManageDeadlines from './components/admin/ManageDeadlines';
import ReportsDashboard from './components/admin/ReportsDashboard';

export type UserRole = 'Student' | 'Supervisor' | 'Evaluator' | 'Admin';

interface ProtectedRouteProps {
    children: ReactNode;
    roles?: UserRole[];
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
    return <>{children}</>;
}

function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="app-shell">
            <Sidebar />
            <main className="app-main">{children}</main>
        </div>
    );
}

function HomeRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    const routes: Record<UserRole, string> = {
        Student: '/student/dashboard',
        Supervisor: '/supervisor/dashboard',
        Evaluator: '/evaluator/dashboard',
        Admin: '/admin/dashboard',
    };
    return <Navigate to={routes[user.role as UserRole] || '/login'} replace />;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={
                <div className="error-page">
                    <h2>Access Denied</h2>
                    <p>You don't have permission to view this page.</p>
                </div>
            } />

            <Route path="/" element={<HomeRedirect />} />

            {/* ---- Student ---- */}
            <Route path="/student/*" element={
                <ProtectedRoute roles={['Student']}>
                    <AppShell>
                        <Routes>
                            <Route path="dashboard" element={<StudentDashboard />} />
                            <Route path="submit-proposal" element={<SubmitProposal />} />
                            <Route path="proposals/:id" element={<ProposalDetail />} />
                            <Route path="resubmit/:id" element={<ResubmitProposal />} />
                            <Route path="ethics-upload/:proposalId" element={<EthicsUpload />} />
                        </Routes>
                    </AppShell>
                </ProtectedRoute>
            } />

            {/* ---- Supervisor ---- */}
            <Route path="/supervisor/*" element={
                <ProtectedRoute roles={['Supervisor', 'Admin']}>
                    <AppShell>
                        <Routes>
                            <Route path="dashboard" element={<SupervisorDashboard />} />
                            <Route path="students" element={<SupervisorStudents />} />
                            <Route path="proposal/:proposalId" element={<ProposalView />} />
                            <Route path="assign-evaluators/:proposalId" element={<AssignEvaluators />} />
                        </Routes>
                    </AppShell>
                </ProtectedRoute>
            } />

            {/* ---- Evaluator ---- */}
            <Route path="/evaluator/*" element={
                <ProtectedRoute roles={['Evaluator', 'Supervisor', 'Admin']}>
                    <AppShell>
                        <Routes>
                            <Route path="dashboard" element={<EvaluatorDashboard />} />
                            <Route path="evaluate/:proposalId" element={<EvaluationForm />} />
                        </Routes>
                    </AppShell>
                </ProtectedRoute>
            } />

            {/* ---- Admin ---- */}
            <Route path="/admin/*" element={
                <ProtectedRoute roles={['Admin']}>
                    <AppShell>
                        <Routes>
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="users" element={<UserManagement />} />
                            <Route path="import-ad" element={<ImportFromAD />} />
                            <Route path="ready-for-exam" element={<ReadyForExam />} />
                            <Route path="finalise" element={<FinaliseEvaluations />} />
                            <Route path="deadlines" element={<ManageDeadlines />} />
                            <Route path="reports" element={<ReportsDashboard />} />
                        </Routes>
                    </AppShell>
                </ProtectedRoute>
            } />

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