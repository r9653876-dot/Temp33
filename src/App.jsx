import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Discover } from './pages/Discover';
import { Matches } from './pages/Matches';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { VerifyEmail } from './pages/VerifyEmail';
import { VerifyMobile } from './pages/VerifyMobile';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Semi-Protected Routes (Needs auth, but not verification) */}
      <Route element={<ProtectedRoute requireVerification={false} />}>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-mobile" element={<VerifyMobile />} />
      </Route>

      {/* Protected User Routes (Needs verification) */}
      <Route element={<ProtectedRoute requireVerification={true} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/matches" element={<Matches />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute requireAdmin={true} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        {/* /admin/users and others will be nested here later */}
      </Route>
    </Routes>
  );
}

export default App;
