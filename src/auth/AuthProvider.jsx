import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    const checkSession = async () => {
      try {
        const [userRes, adminRes] = await Promise.all([
          fetch('/api/auth/me').catch(() => null),
          fetch('/api/admin/me').catch(() => null)
        ]);

        if (userRes && userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }

        if (adminRes && adminRes.ok) {
          const adminData = await adminRes.json();
          setAdmin(adminData);
        }
      } catch (e) {
        console.error("Session check failed");
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const loginUser = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const userData = await fetch('/api/auth/me').then(r => r.json());
      setUser(userData);
      return { success: true };
    }
    const data = await res.json();
    return { success: false, error: data.error };
  };

  const logoutUser = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const loginAdmin = async (email, password) => {
    console.log("Trace: Executing loginAdmin, calling /api/admin/login...");
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const adminData = await fetch('/api/admin/me').then(r => r.json());
      setAdmin(adminData);
      return { success: true };
    }
    const data = await res.json();
    if (data.diag) console.error("Admin Login Diagnostic:", data.diag);
    return { success: false, error: data.error };
  };

  const logoutAdmin = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{
      user, admin, loading, loginUser, logoutUser, loginAdmin, logoutAdmin, setUser
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
