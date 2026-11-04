import { PERMISSIONS } from './permissions';
import type { UserProfile } from '../services/api';

/**
 * Key izin yang menandakan pemiliknya berhak membuka panel administrasi
 * ONE UNUSU. Peran aplikasi (ADMIN_LPM, ADMIN_LPPM, ADMIN_ESURAT, dst.)
 * sengaja tidak memilikinya sehingga tidak pernah diarahkan ke /admin.
 */
export const ADMIN_PANEL_PERMISSION_KEYS: string[] = [
  PERMISSIONS.applicationMenu,
  PERMISSIONS.nonSsoMenu,
  PERMISSIONS.userMenu,
  PERMISSIONS.roleMenu,
  PERMISSIONS.permissionMenu,
  PERMISSIONS.sliderMenu,
];

/** Rute panel tata kelola SSO dan halaman penolakan akses. */
export const ADMIN_PANEL_PATH = '/admin';
export const DASHBOARD_PATH = '/dashboard';
export const ACCESS_DENIED_PATH = '/akses-ditolak';

/**
 * Aplikasi cabang yang dikelola tiap peran admin. Dipakai untuk menjelaskan
 * ke pengguna "Anda admin aplikasi apa" pada halaman penolakan akses, tanpa
 * perlu memanggil API tambahan.
 */
export const MANAGED_APP_BY_ROLE: Record<string, string> = {
  ADMIN_LPM: 'LPM UNUSU',
  ADMIN_LPPM: 'LPPM UNUSU',
  ADMIN_ESURAT: 'E-Surat UNUSU',
  ADMIN_SARPRAS: 'SDM & Sarpras',
  ADMIN_AKREDITASI: 'Akreditasi UNUSU',
  ADMIN_LMS: 'LMS UNUSU',
};

/** Label peran yang ramah dibaca pada halaman penolakan akses. */
export const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Administrator',
  ADMIN_SSO: 'Administrator ONE UNUSU',
  ADMIN_LPM: 'Administrator LPM',
  ADMIN_LPPM: 'Administrator LPPM',
  ADMIN_ESURAT: 'Administrator E-Surat',
  ADMIN_SARPRAS: 'Administrator Sarpras',
  ADMIN_AKREDITASI: 'Administrator Akreditasi',
  ADMIN_LMS: 'Administrator LMS',
  DOSEN: 'Dosen',
  MAHASISWA: 'Mahasiswa',
};

/**
 * Apakah pengguna boleh membuka panel administrasi SSO?
 * Bila daftar izin belum tersedia di cache, dipakai fallback peran panel
 * (SUPERADMIN / ADMIN_SSO) agar navigasi tetap wajar; server tetap menolak
 * request yang tidak berizin.
 */
export function canOpenAdminPanel(user: UserProfile | null | undefined): boolean {
  if (!user) return false;

  if (Array.isArray(user.permissions)) {
    return ADMIN_PANEL_PERMISSION_KEYS.some((key) => user.permissions!.includes(key));
  }

  return user.role === 'SUPERADMIN' || user.role === 'ADMIN_SSO';
}

/**
 * Tujuan setelah login: pengelola panel ke /admin, civitas lain ke /dashboard.
 * Menjaga pemisahan tegas antara admin SSO dan admin aplikasi cabang.
 */
export function resolveLandingPath(user: UserProfile | null | undefined): string {
  return canOpenAdminPanel(user) ? ADMIN_PANEL_PATH : DASHBOARD_PATH;
}

/** Nama aplikasi yang dikelola peran pengguna (kosong bila bukan admin aplikasi). */
export function managedAppLabel(role: string | undefined): string | null {
  if (!role) return null;
  return MANAGED_APP_BY_ROLE[role] ?? null;
}

/** Bangun URL halaman penolakan akses beserta konteksnya. */
export function accessDeniedUrl(params: {
  from?: string;
  need?: string;
  app?: string;
  reason?: string;
}): string {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.need) search.set('need', params.need);
  if (params.app) search.set('app', params.app);
  if (params.reason) search.set('reason', params.reason);

  const query = search.toString();
  return query ? `${ACCESS_DENIED_PATH}?${query}` : ACCESS_DENIED_PATH;
}
