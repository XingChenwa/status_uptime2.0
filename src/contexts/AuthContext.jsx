import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

const TOKEN_KEY = 'admin_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) verifyToken(stored);
  }, []);

  const verifyToken = useCallback(async (t) => {
    const tok = t ?? token;
    if (!tok) { setIsAdmin(false); return false; }
    setChecking(true);
    try {
      const res = await fetch('/api/sadmin/verify-session', {
        headers: { 'x-admin-token': tok }
      });
      const data = await res.json();
      setIsAdmin(!!data.valid);
      if (!data.valid) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
      return !!data.valid;
    } catch {
      setIsAdmin(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, [token]);

  const login = (tok) => {
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    setIsAdmin(true);
  };

  const logout = async () => {
    if (token) {
      await fetch('/api/sadmin/logout', {
        method: 'POST',
        headers: { 'x-admin-token': token }
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setIsAdmin(false);
  };

  const authHeader = () => (token ? { 'x-admin-token': token } : {});

  return (
    <AuthContext.Provider value={{ token, isAdmin, checking, login, logout, verifyToken, authHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
