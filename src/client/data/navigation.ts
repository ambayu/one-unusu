import type { NavItem, NavLink } from "./types";

export const mainNavigation: NavItem[] = [
  { id: "beranda", label: "Beranda", href: "/" },
  { id: "layanan", label: "Layanan Terpadu", href: "/layanan" },
  { id: "aplikasi", label: "Aplikasi Terintegrasi", href: "/aplikasi" },
  { id: "bantuan", label: "Pusat Bantuan", href: "/bantuan" },
];

/**
 * Catatan pembagian peran antar menu (jangan disatukan):
 *
 * - "Aplikasi Terintegrasi" (/aplikasi) → katalog aplikasi yang login-nya
 *   lewat SSO ONE UNUSU (LMS, E-Surat, LPM, LPPM, SDM & Sarpras, Akreditasi).
 *   Landing page menampilkan subset ini pada `DigitalServicesSection`.
 *
 * - "Layanan Terpadu" (/layanan) → pintu masuk seluruh layanan, termasuk
 *   direktori publik & portal mandiri NON-SSO (website prodi, PMB, jurnal,
 *   SIAKAD). Seksi `NonSsoServicesSection` di landing page tidak lagi
 *   memuat daftar kartu; ia mengarahkan pengunjung ke halaman ini.
 */

export const topbarLinks: NavLink[] = [
  { label: "Bantuan PUSTIK UNUSU", href: "/bantuan" },
  { label: "Status SSO: Aktif", href: null },
];

export const footerQuickLinks: NavLink[] = [
  { label: "Beranda ONE UNUSU", href: "/" },
  { label: "Layanan Terpadu", href: "/layanan" },
  { label: "Aplikasi Terintegrasi", href: "/aplikasi" },
  { label: "Pusat Bantuan", href: "/bantuan" },
  { label: "Keamanan & Privasi", href: "/keamanan" },
  { label: "Masuk Portal SSO", href: "/login" },
];
