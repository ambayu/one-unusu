export const APP_ROLES = [
  'SUPERADMIN',
  'ADMIN_SSO',
  'DOSEN',
  'MAHASISWA',
] as const;

export type AppRole = (typeof APP_ROLES)[number] | string;

export const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN_SSO: 'Admin ONE UNUSU',
  DOSEN: 'Dosen',
  MAHASISWA: 'Mahasiswa',
};

export function isAppRole(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,49}$/.test(value);
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
