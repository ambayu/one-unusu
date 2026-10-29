import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { AplikasiPage } from './pages/Aplikasi';
import { BantuanPage } from './pages/Bantuan';
import { FakultasPage } from './pages/Fakultas';
import { ProdiPage } from './pages/Prodi';
import { LayananPage } from './pages/Layanan';
import { KeamananPage } from './pages/Keamanan';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { RegistrasiSso } from './pages/admin/RegistrasiSso';
import { ManajemenPengguna } from './pages/admin/ManajemenPengguna';
import { Izin } from './pages/admin/Izin';
import { Peran } from './pages/admin/Peran';
import { DirektoriPublik } from './pages/admin/DirektoriPublik';
import { PERMISSIONS } from './lib/permissions';
import type { UserProfile } from './services/api';

const TOKEN_STORAGE_KEY = 'one_unusu_token';
const USER_STORAGE_KEY = 'one_unusu_user';

function readCachedUser(): UserProfile | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

// Protected Route Guard untuk SSO Dashboard
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

interface PermissionRouteProps {
  permission: string;
  children: React.ReactElement;
}

/**
 * Penjaga rute berbasis izin. Cache pengguna tanpa daftar izin dibiarkan lewat
 * karena server tetap menolak request yang tidak berizin.
 */
const PermissionRoute = ({ permission, children }: PermissionRouteProps) => {
  const cachedUser = readCachedUser();
  const permissions = cachedUser?.permissions;

  if (permissions && !permissions.includes(permission)) {
    return <Navigate to="/dashboard" replace />;
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
        <Route path="/fakultas" element={<FakultasPage />} />
        <Route path="/prodi" element={<ProdiPage />} />
        <Route path="/layanan" element={<LayananPage />} />
        <Route path="/keamanan" element={<KeamananPage />} />

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

        {/* Tata Kelola SSO */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <PermissionRoute permission={PERMISSIONS.applicationMenu}>
                <RegistrasiSso />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pengguna"
          element={
            <ProtectedRoute>
              <PermissionRoute permission={PERMISSIONS.userMenu}>
                <ManajemenPengguna />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/izin"
          element={
            <ProtectedRoute>
              <PermissionRoute permission={PERMISSIONS.permissionMenu}>
                <Izin />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/peran"
          element={
            <ProtectedRoute>
              <PermissionRoute permission={PERMISSIONS.roleMenu}>
                <Peran />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/direktori"
          element={
            <ProtectedRoute>
              <PermissionRoute permission={PERMISSIONS.directoryMenu}>
                <DirektoriPublik />
              </PermissionRoute>
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
