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
import { Register } from './pages/Register';
import { SsoAuthorize } from './pages/SsoAuthorize';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { RegistrasiSso } from './pages/admin/RegistrasiSso';
import { ManajemenPengguna } from './pages/admin/ManajemenPengguna';
import { Izin } from './pages/admin/Izin';
import { Peran } from './pages/admin/Peran';
import { DirektoriPublik } from './pages/admin/DirektoriPublik';
import { ManajemenSlider } from './pages/admin/ManajemenSlider';
import { KunciAplikasi } from './pages/admin/KunciAplikasi';
import { PERMISSIONS } from './lib/permissions';
import { AksesDitolak } from './pages/AksesDitolak';
import {
  ACCESS_DENIED_PATH,
  ADMIN_PANEL_PATH,
  accessDeniedUrl,
  canOpenAdminPanel,
  resolveLandingPath,
} from './lib/landing';
import type { UserProfile } from './services/api';

// Kunci localStorage untuk menyimpan data profil pengguna yang terautentikasi
const USER_STORAGE_KEY = 'one_unusu_user';

/**
 * Membaca data pengguna dari cache lokal (localStorage).
 *
 * @returns Data profil pengguna yang tersimpan di cache atau null jika tidak ada / tidak valid
 */
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

/**
 * Penjaga rute panel. Validasi sesi sebenarnya dilakukan server melalui cookie
 * HttpOnly, jadi cache pengguna di sini hanya penanda agar pengunjung anonim
 * langsung diarahkan ke halaman login.
 */
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  if (!readCachedUser()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

/**
 * Route guard untuk root ('/'):
 * Memastikan rute root selalu merender tampilan landing page publik (<Home />) untuk semua pengunjung,
 * baik pengunjung anonim maupun pengguna yang sudah login (admin, dosen, mahasiswa).
 * Landing page publik tidak boleh memicu redirection otomatis ke /admin atau /dashboard.
 */
const RootRoute = () => {
  return <Home />;
};

/**
 * Route guard untuk autentikasi/registrasi ('/register' atau '/auth/register'):
 * Hanya dapat dibuka jika berstatus guest. Jika user sudah memiliki session,
 * dialihkan langsung ke dashboard/panel.
 */
const GuestOnlyRoute = ({ children }: { children: React.ReactElement }) => {
  const cachedUser = readCachedUser();
  if (cachedUser) {
    // Pengelola panel (SUPERADMIN / ADMIN_SSO / pemegang izin panel) masuk ke
    // /admin, sedangkan admin aplikasi cabang & civitas ke /dashboard.
    return <Navigate to={resolveLandingPath(cachedUser)} replace />;
  }
  return children;
};

interface PermissionRouteProps {
  permission: string;
  children: React.ReactElement;
}

/**
 * Penjaga rute berbasis izin.
 *
 * Fail-closed: bila daftar izin tersedia di cache dan tidak memuat izin yang
 * diminta, pengguna diarahkan ke halaman 403 yang menjelaskan alasan penolakan
 * (bukan dibuang diam-diam ke /dashboard). Server tetap memvalidasi ulang
 * setiap request API.
 */
const PermissionRoute = ({ permission, children }: PermissionRouteProps) => {
  const cachedUser = readCachedUser();
  const permissions = cachedUser?.permissions;

  if (Array.isArray(permissions) && !permissions.includes(permission)) {
    return (
      <Navigate
        to={accessDeniedUrl({
          from: window.location.pathname,
          need: permission,
        })}
        replace
      />
    );
  }

  return children;
};

/**
 * Penjaga khusus panel administrasi ONE UNUSU.
 *
 * Memastikan admin aplikasi cabang (ADMIN_LPM, ADMIN_LPPM, dst.) tidak pernah
 * merender panel SSO: peran mereka hanya memiliki izin dashboard/profil.
 */
const AdminPanelRoute = ({ children }: { children: React.ReactElement }) => {
  const cachedUser = readCachedUser();

  if (!canOpenAdminPanel(cachedUser)) {
    return (
      <Navigate
        to={accessDeniedUrl({
          from: ADMIN_PANEL_PATH,
          reason: 'panel-admin',
        })}
        replace
      />
    );
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
        <Route path="/" element={<RootRoute />} />
        <Route path="/aplikasi" element={<AplikasiPage />} />
        <Route path="/bantuan" element={<BantuanPage />} />
        <Route path="/fakultas" element={<FakultasPage />} />
        <Route path="/prodi" element={<ProdiPage />} />
        <Route path="/layanan" element={<LayananPage />} />
        <Route path="/keamanan" element={<KeamananPage />} />

        {/* SSO Authentication & Portal Routes */}
        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <Login />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnlyRoute>
              <Register />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/auth/register"
          element={
            <GuestOnlyRoute>
              <Register />
            </GuestOnlyRoute>
          }
        />
        {/* Titik masuk SSO dari aplikasi cabang (LMS, E-Surat, Akreditasi, dll.) */}
        <Route path="/authorize" element={<SsoAuthorize />} />
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

        {/* Halaman penolakan akses terpusat (403) */}
        <Route
          path={ACCESS_DENIED_PATH}
          element={
            <ProtectedRoute>
              <AksesDitolak />
            </ProtectedRoute>
          }
        />

        {/* Tata Kelola SSO — hanya untuk pengelola panel */}
        <Route
          path={ADMIN_PANEL_PATH}
          element={
            <ProtectedRoute>
              <AdminPanelRoute>
                <PermissionRoute permission={PERMISSIONS.applicationMenu}>
                  <RegistrasiSso />
                </PermissionRoute>
              </AdminPanelRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pengguna"
          element={
            <ProtectedRoute>
              <AdminPanelRoute>
                <PermissionRoute permission={PERMISSIONS.userMenu}>
                  <ManajemenPengguna />
                </PermissionRoute>
              </AdminPanelRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/izin"
          element={
            <ProtectedRoute>
              <AdminPanelRoute>
                <PermissionRoute permission={PERMISSIONS.permissionMenu}>
                  <Izin />
                </PermissionRoute>
              </AdminPanelRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/peran"
          element={
            <ProtectedRoute>
              <AdminPanelRoute>
                <PermissionRoute permission={PERMISSIONS.roleMenu}>
                  <Peran />
                </PermissionRoute>
              </AdminPanelRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/slider"
          element={
            <ProtectedRoute>
              <AdminPanelRoute>
                <PermissionRoute permission={PERMISSIONS.sliderMenu}>
                  <ManajemenSlider />
                </PermissionRoute>
              </AdminPanelRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/direktori"
          element={
            <ProtectedRoute>
              <AdminPanelRoute>
                <PermissionRoute permission={PERMISSIONS.nonSsoMenu}>
                  <DirektoriPublik />
                </PermissionRoute>
              </AdminPanelRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/akses-aplikasi"
          element={
            <ProtectedRoute>
              <AdminPanelRoute>
                <PermissionRoute permission={PERMISSIONS.applicationMenu}>
                  <KunciAplikasi />
                </PermissionRoute>
              </AdminPanelRoute>
            </ProtectedRoute>
          }
        />

        {/* Sub-rute panel yang tidak dikenal tetap diarahkan ke beranda panel */}
        <Route path="/admin/*" element={<Navigate to={ADMIN_PANEL_PATH} replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
