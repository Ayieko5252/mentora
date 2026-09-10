import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, getToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from a stored token on first load.
  useEffect(() => {
    async function load() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await api.get("/auth/me");
        setUser(user);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const login = useCallback(async (email, password) => {
    const { user, token } = await api.post("/auth/login", { email, password }, { auth: false });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { user, token } = await api.post(
      "/auth/register",
      { name, email, password },
      { auth: false }
    );
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
