import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function ProtectedRoute({ requireAdmin = false, requireVerification = true }) {
  const { user, admin, loading } = useAuth();
  const location = window.location.pathname;

  if (loading) {
    return <div>Loading...</div>;
  }

  if (requireAdmin) {
    return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerification) {
    if (!user.email_verified && location !== '/verify-email') {
      return <Navigate to="/verify-email" replace />;
    }

    if (user.email_verified && !user.mobile_verified && location !== '/verify-mobile') {
      return <Navigate to="/verify-mobile" replace />;
    }
  }

  return <Outlet />;
}
