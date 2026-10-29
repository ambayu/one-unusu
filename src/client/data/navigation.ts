import type { NavItem, NavLink } from "./types";

export const mainNavigation: NavItem[] = [
  { id: "beranda", label: "Beranda", href: "/" },
  { id: "layanan", label: "Layanan Terpadu", href: "/layanan" },
  { id: "aplikasi", label: "Aplikasi Terintegrasi", href: "/aplikasi" },
  { id: "bantuan", label: "Pusat Bantuan", href: "/bantuan" },
];

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
