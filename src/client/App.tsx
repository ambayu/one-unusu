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
import { DaftarAplikasi } from './pages/DaftarAplikasi';
import { AplikasiSsoPage } from './pages/AplikasiSsoPage';
import { AplikasiNonSsoPage } from './pages/AplikasiNonSsoPage';
import { RiwayatSsoPage } from './pages/RiwayatSsoPage';
import { Profile } from './pages/Profile';
import { RegistrasiSso } from './pages/admin/RegistrasiSso';
import { ManajemenPengguna } from './pages/admin/ManajemenPengguna';
import { Izin } from './pages/admin/Izin';
import { Peran } from './pages/admin/Peran';
import { DirektoriPublik } from './pages/admin/DirektoriPublik';
import { ManajemenSlider } from './pages/admin/ManajemenSlider';
import { BerkasDosen } from './pages/admin/BerkasDosen';
import { BerkasDosenSaya } from './pages/BerkasDosenSaya';
import { ApiHub } from './pages/admin/ApiHub';
import { PERMISSIONS } from './lib/permissions';
import { AksesDitolak } from './pages/AksesDitolak';
import { HalamanTidakDitemukan } from './pages/HalamanTidakDitemukan';
import { PanelLayout } from './components/PanelLayout';
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';
import {
  ACCESS_DENIED_PATH,
  ADMIN_PANEL_PATH,
  accessDeniedUrl,
  canOpenAdminPanel,
  resolveLandingPath,
} from './lib/landing';
import api from './services/api';
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
    // Bawa tujuan semula supaya setelah login pengguna kembali ke halaman ini.
    return <Navigate to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`} replace />;
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
    // Tujuan lanjutan (`?next=`) harus dibawa. Tanpa ini, pengguna yang sudah
    // punya sesi lalu masuk lewat halaman login dari aplikasi cabang akan
    // dilempar ke /dashboard dan tidak pernah kembali ke aplikasi asalnya.
    const rawNext = new URLSearchParams(window.location.search).get('next');
    const nextPath =
      rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;

    // Pengelola panel (SUPERADMIN / ADMIN_SSO / pemegang izin panel) masuk ke
    // /admin, sedangkan admin aplikasi cabang & civitas ke /dashboard.
    return <Navigate to={nextPath ?? resolveLandingPath(cachedUser)} replace />;
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
 * Memastikan hanya akun dengan izin panel admin SSO yang dapat merender
 * panel tata kelola.
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

/**
 * Penjaga kata sandi bawaan.
 *
 * Dirender di dalam `Router` tetapi di luar `<Routes>`, sehingga modalnya tetap
 * tampil apa pun halaman yang sedang dibuka — termasuk halaman panel, landing,
 * maupun tujuan SSO. Selama `harusGantiPassword` bernilai `true`, pengguna
 * tidak dapat berpindah halaman tanpa mengganti kata sandinya lebih dulu.
 */
const PenjagaKataSandiBawaan: React.FC = () => {
  const [perluGanti, setPerluGanti] = React.useState(false);
  const [profil, setProfil] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    // Baca penanda dari cache profil. Server mengirim `harusGantiPassword` pada
    // respons login, dan PanelLayout memperbarui cache yang sama saat memuat
    // ulang profil — jadi nilainya selalu mengikuti keadaan terakhir.
    const baca = () => {
      const data = readCachedUser();
      setProfil(data);
      setPerluGanti(Boolean(data?.harusGantiPassword));
    };
    baca();

    // Ikuti perubahan cache dari tab lain serta pembaruan di tab ini.
    const tanganiPenyimpanan = () => baca();
    window.addEventListener('storage', tanganiPenyimpanan);
    window.addEventListener('one-unusu:profil-diperbarui', tanganiPenyimpanan);

    return () => {
      window.removeEventListener('storage', tanganiPenyimpanan);
      window.removeEventListener('one-unusu:profil-diperbarui', tanganiPenyimpanan);
    };
  }, []);

  /** Setelah kata sandi berganti, bersihkan penanda di cache profil. */
  const tanganiBerhasil = () => {
    const data = readCachedUser();
    if (data) {
      const diperbarui: UserProfile = { ...data, harusGantiPassword: false };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(diperbarui));
      setProfil(diperbarui);
    }
    setPerluGanti(false);
    // Beri tahu komponen lain (mis. PanelLayout) bahwa profil berubah.
    window.dispatchEvent(new Event('one-unusu:profil-diperbarui'));
  };

  /** Keluar dari akun: hapus sesi lokal lalu kembali ke halaman login. */
  const tanganiKeluar = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Abaikan kegagalan jaringan: sesi lokal tetap dibersihkan di bawah.
    }
    localStorage.removeItem('one_unusu_token');
    localStorage.removeItem(USER_STORAGE_KEY);
    window.location.href = `${BASE_PATH}/login`;
  };

  if (!perluGanti || !profil) return null;

  return (
    <ForcePasswordChangeModal
      isOpen={perluGanti}
      nama={profil.nama}
      username={profil.username}
      onSuccess={tanganiBerhasil}
      onLogout={tanganiKeluar}
    />
  );
};

export function App() {
  const currentPath = window.location.pathname;
  const isBaseSubpath = BASE_PATH && currentPath.startsWith(BASE_PATH);
  const routerBasename = isBaseSubpath ? BASE_PATH : '';

  return (
    <Router basename={routerBasename}>
      {/* Modal ganti kata sandi bawaan — tampil di atas seluruh rute */}
      <PenjagaKataSandiBawaan />
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
        {/* ── Area panel ONE UNUSU ──────────────────────────────────────────
         *  Semua halaman panel dikelompokkan di bawah SATU route induk yang
         *  merender `PanelLayout` (SidebarLayout + <Outlet />).
         *
         *  Sebelumnya tiap rute merender halaman yang memasang sidebar sendiri
         *  (Dashboard, Profile, dan halaman /admin/* lewat AdminPanelTemplate).
         *  React Router melepas pohon halaman lama saat berpindah rute, jadi
         *  sidebar ikut unmount -> mount ulang dan tampak "kedip / reload".
         *  Dengan nested route ini sidebar dipasang sekali dan status
         *  collapse-nya awet antar-halaman.
         *
         *  Penjagaan akses tetap per-rute (ProtectedRoute / AdminPanelRoute /
         *  PermissionRoute) agar sesi divalidasi di setiap halaman.
         */}
        <Route element={<PanelLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aplikasi-sso"
            element={
              <ProtectedRoute>
                <AplikasiSsoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aplikasi-non-sso"
            element={
              <ProtectedRoute>
                <AplikasiNonSsoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/riwayat-sso"
            element={
              <ProtectedRoute>
                <RiwayatSsoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/riwayat-login"
            element={
              <ProtectedRoute>
                <RiwayatSsoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/daftar-aplikasi"
            element={
              <ProtectedRoute>
                <DaftarAplikasi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/aplikasi"
            element={
              <ProtectedRoute>
                <DaftarAplikasi />
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
          {/* Berkas dosen — dosen mengunggah dokumennya sendiri */}
          <Route
            path="/berkas-dosen"
            element={
              <ProtectedRoute>
                <PermissionRoute permission={PERMISSIONS.berkasBerkaMenu}>
                  <BerkasDosenSaya />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          {/* Halaman penolakan akses terpusat (403).
              Ditempatkan DI DALAM PanelLayout agar sidebar, header, dan padding
              utama (p-4 sm:p-6 lg:p-7) sama persis dengan halaman panel lain.
              Sebelumnya rute ini berdiri sendiri dengan latar penuh layar,
              sehingga kartunya mengapung di tengah dan paddingnya tidak seragam. */}
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
            path="/admin/berkas-dosen"
            element={
              <ProtectedRoute>
                <AdminPanelRoute>
                  <PermissionRoute permission={PERMISSIONS.berkasBerkaMenu}>
                    <BerkasDosen />
                  </PermissionRoute>
                </AdminPanelRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/api-hub"
            element={
              <ProtectedRoute>
                <AdminPanelRoute>
                  <PermissionRoute permission={PERMISSIONS.apiHubMenu}>
                    <ApiHub />
                  </PermissionRoute>
                </AdminPanelRoute>
              </ProtectedRoute>
            }
          />

          {/* Sub-rute panel yang tidak dikenal tetap diarahkan ke beranda panel */}
          <Route path="/admin/*" element={<Navigate to={ADMIN_PANEL_PATH} replace />} />
        </Route>

        {/* Fallback: rute tak dikenal.
            Pengguna yang sudah masuk mendapat halaman 404 bergaya panel (dengan
            sidebar). Tamu tetap diarahkan ke beranda karena sidebar tidak
            relevan bagi mereka. Sebelumnya semua rute tak dikenal dilempar
            diam-diam ke beranda tanpa penjelasan. */}
        <Route
          path="*"
          element={
            readCachedUser() ? (
              <PanelLayout />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route path="*" element={<HalamanTidakDitemukan />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
