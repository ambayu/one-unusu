/**
 * Katalog key permission yang dipakai untuk membatasi menu, rute, dan aksi.
 * Format mengikuti resource:action, contoh "profile:edit".
 */
export const PERMISSIONS = {
  dashboardMenu: 'dashboard:menu',
  dashboardView: 'dashboard:view',

  profileMenu: 'profile:menu',
  profileView: 'profile:view',
  profileEdit: 'profile:edit',

  applicationMenu: 'application:menu',
  applicationView: 'application:view',
  applicationEdit: 'application:edit',
  applicationDelete: 'application:delete',

  userMenu: 'user:menu',
  userView: 'user:view',
  userEdit: 'user:edit',
  userDelete: 'user:delete',

  permissionMenu: 'permission:menu',
  permissionView: 'permission:view',
  permissionEdit: 'permission:edit',

  roleMenu: 'role:menu',
  roleView: 'role:view',
  roleEdit: 'role:edit',
  roleDelete: 'role:delete',

  directoryMenu: 'directory:menu',
  directoryView: 'directory:view',
  directoryEdit: 'directory:edit',
  directoryDelete: 'directory:delete',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

interface PermissionHolder {
  permissions?: string[];
}

/** Cek satu izin. Tidak ada fallback berbasis role: menu tampil hanya bila izinnya ada. */
export function hasPermission(holder: PermissionHolder | null | undefined, key: string): boolean {
  return Boolean(holder?.permissions?.includes(key));
}

export function hasAnyPermission(holder: PermissionHolder | null | undefined, keys: string[]): boolean {
  return keys.some((key) => hasPermission(holder, key));
}
