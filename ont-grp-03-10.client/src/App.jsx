import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { DEV_MODE, ROLES } from "./authConfig";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./dashboards/student/StudentDashboard";
import AdminDashboard from "./dashboards/admin/AdminDashboard";
import SupervisorDashboard from "./dashboards/supervisor/SupervisorDashboard";
import EvaluatorDashboard from "./dashboards/evaluator/EvaluatorDashboard";

function RoleDashboard() {
  const { user } = useAuth();
  switch (user?.role) {
    case ROLES.STUDENT:
      return <StudentDashboard />;
    case ROLES.ADMIN:
      return <AdminDashboard />;
    case ROLES.SUPERVISOR:
      return <SupervisorDashboard />;
    case ROLES.EVALUATOR:
      return <EvaluatorDashboard />;
    default:
      return <StudentDashboard />;
  }
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard/*" element={isAuthenticated ? <RoleDashboard /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function AppWithMsalGuard() {
  const { inProgress } = useMsal();
  if (inProgress === InteractionStatus.Startup) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Initializing…</p>
      </div>
    );
  }
  return <AppRoutes />;
}

export default function App() {
  if (DEV_MODE) return <AppRoutes />;
  return <AppWithMsalGuard />;
}
