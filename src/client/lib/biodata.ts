import type { UserProfile } from '../services/api';

/**
 * Biodata dianggap lengkap bila email dan nomor WhatsApp sudah terisi.
 *
 * Kelengkapan biodata tidak lagi dipakai sebagai gerbang setelah login: pengguna
 * tetap diarahkan ke dashboard. Gerbang dipindah ke langkah membuka aplikasi SSO
 * supaya civitas bisa melihat katalog layanan lebih dulu.
 */
export function isBiodataComplete(
  user: Pick<UserProfile, 'email' | 'noHp'> | null | undefined
): boolean {
  if (!user) return false;
  return Boolean(user.email?.trim() && user.noHp?.trim());
}
