// Microsoft Azure Active Directory Configuration
export const msalConfig = {
  auth: {
    clientId: "372b0ade-a875-43da-a523-af5b6d8e03bf",
    authority: "https://login.microsoftonline.com/bd70eeb3-a537-435a-937c-7cd330dc74d8",
    redirectUri: "http://localhost:5173",
    postLogoutRedirectUri: "http://localhost:5173",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

// ─── ROLES ──────────────────────────────────────────────────────────────────
// Matches the four roles defined in the system spec:
// Students | Administrative (SPGS Chair / Faculty Secretaries) | Supervisors | Evaluators
export const ROLES = {
  STUDENT: "Student",
  ADMIN: "Administrative",
  SUPERVISOR: "Supervisor",
  EVALUATOR: "Evaluator",
};

// ─── DEV MODE ───────────────────────────────────────────────────────────────
// Set VITE_DEV_MODE=true to bypass Azure AD and use local mock login
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === "true";

export const DEV_USERS = [
  {
    id: "dev-001",
    name: "Nomvula Khumalo",
    username: "s225011432@mandela.ac.za",
    role: ROLES.STUDENT,
    initials: "NK",
    meta: { degreeType: "PhD", faculty: "Science", studentNumber: "PG2024001" },
  },
  {
    id: "dev-002",
    name: "Sandra Petersen",
    username: "petersens@mandela.ac.za",
    role: ROLES.ADMIN,
    initials: "SP",
    meta: { title: "SPGS Chair", office: "School of Postgraduate Studies" },
  },
  {
    id: "dev-003",
    name: "Prof. David Adams",
    username: "adamsd@mandela.ac.za",
    role: ROLES.SUPERVISOR,
    initials: "DA",
    meta: { title: "Prof", faculty: "Science", studentCount: 5 },
  },
  {
    id: "dev-004",
    name: "Dr. Lindiwe Ferreira",
    username: "ferreiral@mandela.ac.za",
    role: ROLES.EVALUATOR,
    initials: "LF",
    meta: { title: "Dr", institution: "NMU", pendingReviews: 3 },
  },
];
