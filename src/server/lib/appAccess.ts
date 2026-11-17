import type { TingkatMasuk } from './accessControl.js';

export function parseAppRoles(raw: string | null | undefined): string[] | null {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) && value.every((role) => typeof role === 'string' && /^[A-Z0-9_]{2,40}$/.test(role))
      ? [...new Set(value as string[])] : null;
  } catch {
    return null;
  }
}

export function decideAppAccess(_permissionKeys: string[], raw: string | null | undefined, roles: string[] = []) {
  const override = roles.includes('SUPERADMIN') || roles.includes('ADMIN_SSO');
  const targetRoles = parseAppRoles(raw);
  const matched = roles.filter((role) => targetRoles?.includes(role));
  const allowed = override || matched.length > 0;
  const tingkat: TingkatMasuk[] = override ? ['admin'] : [];
  if (!override) {
    if (matched.some((role) => role.startsWith('ADMIN_') || role.startsWith('ADMI_'))) tingkat.push('admin');
    if (matched.includes('DOSEN')) tingkat.push('dosen');
    if (matched.includes('MAHASISWA')) tingkat.push('mahasiswa');
  }
  return { allowed, reason: allowed ? 'permission-allowed' : 'permission-denied', tingkat };
}

export function mapAppRole(raw: string | null, role: string, selected: boolean): string {
  const roles = parseAppRoles(raw);
  if (!roles) throw new Error('Invalid application role mapping');
  return JSON.stringify(selected ? [...new Set([...roles, role])] : roles.filter((code) => code !== role));
}
