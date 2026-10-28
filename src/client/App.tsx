import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { AplikasiPage } from './pages/Aplikasi';
import { BantuanPage } from './pages/Bantuan';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { AdminPanel } from './pages/AdminPanel';

// Protected Route Guard untuk SSO Dashboard
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem('one_unusu_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
  const currentPath = window.location.pathname;
  const isBaseSubpath = BASE_PATH && currentPath.startsWith(BASE_PATH);
  const routerBasename = isBaseSubpath ? BASE_PATH : '';

  return (
    <Router basename={routerBasename}>
      <Routes>
        {/* Landing Page & Dedicated Subpages */}
        <Route path="/" element={<Home />} />
        <Route path="/aplikasi" element={<AplikasiPage />} />
        <Route path="/bantuan" element={<BantuanPage />} />

        {/* SSO Authentication & Portal Routes */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
