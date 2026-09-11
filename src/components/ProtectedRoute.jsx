import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function ProtectedRoute({ requireAdmin = false }) {
  const { user, admin, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (requireAdmin) {
    return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
