export const APP_ROLES = ['MAHASISWA', 'DOSEN', 'SUPERADMIN'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABEL: Record<AppRole, string> = {
  MAHASISWA: 'Mahasiswa',
  DOSEN: 'Dosen',
  SUPERADMIN: 'Superadmin',
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
