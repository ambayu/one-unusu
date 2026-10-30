export const APP_ROLES = [
  'SUPERADMIN',
  'ADMIN_SSO',
  'ADMIN_LPM',
  'ADMIN_LPPM',
  'ADMIN_ESURAT',
  'ADMIN_SARPRAS',
  'ADMIN_AKREDITASI',
  'ADMIN_LMS',
  'DOSEN',
  'MAHASISWA',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABEL: Record<AppRole, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN_SSO: 'Admin ONE UNUSU',
  ADMIN_LPM: 'Admin LPM',
  ADMIN_LPPM: 'Admin LPPM',
  ADMIN_ESURAT: 'Admin E-Surat',
  ADMIN_SARPRAS: 'Admin Sarpras',
  ADMIN_AKREDITASI: 'Admin Akreditasi',
  ADMIN_LMS: 'Admin LMS',
  DOSEN: 'Dosen',
  MAHASISWA: 'Mahasiswa',
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * `SsoApp.targetRoles` disimpan sebagai string JSON, contoh: '["DOSEN","SUPERADMIN"]'.
 * Nilai yang tidak valid dikembalikan sebagai array kosong agar matrix izin tidak
 * menampilkan akses palsu.
 */
export function parseTargetRoles(value: string | null | undefined): AppRole[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAppRole);
  } catch {
    return [];
  }
}
