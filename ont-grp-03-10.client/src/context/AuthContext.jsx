import { createContext, useContext, useState } from "react";
import { DEV_MODE } from "../authConfig";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";

const AuthContext = createContext(null);

function DevAuthProvider({ children }) {
  const [devUser, setDevUser] = useState(
    () => JSON.parse(sessionStorage.getItem("pgrs_dev_user") || "null")
  );

  const login = (user) => {
    sessionStorage.setItem("pgrs_dev_user", JSON.stringify(user));
    setDevUser(user);
  };

  const logout = () => {
    sessionStorage.removeItem("pgrs_dev_user");
    setDevUser(null);
  };

  return (
    <AuthContext.Provider value={{ user: devUser, login, logout, isAuthenticated: !!devUser, isDev: true }}>
      {children}
    </AuthContext.Provider>
  );
}

function MsalAuthProvider({ children }) {
  const { accounts, instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = accounts[0];

  const user = account
    ? {
        id: account.localAccountId,
        name: account.name,
        username: account.username,
        role: "User",
        initials: account.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U",
      }
    : null;

  const logout = () => instance.logoutRedirect();

  return (
    <AuthContext.Provider value={{ user, logout, isAuthenticated, isDev: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  if (DEV_MODE) return <DevAuthProvider>{children}</DevAuthProvider>;
  return <MsalAuthProvider>{children}</MsalAuthProvider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
