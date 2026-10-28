import type { NavItem, NavLink } from "./types";

export const mainNavigation: NavItem[] = [
  { id: "beranda", label: "Beranda", href: "/" },
  {
    id: "akademik",
    label: "Akademik",
    children: [
      {
        label: "Fakultas",
        href: "/fakultas",
        description: "Direktori fakultas dan pimpinan",
      },
      {
        label: "Program Studi",
        href: "/prodi",
        description: "Daftar program studi sarjana",
      },
    ],
  },
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
  { label: "Fakultas", href: "/fakultas" },
  { label: "Program Studi", href: "/prodi" },
  { label: "Layanan Terpadu", href: "/layanan" },
  { label: "Aplikasi Terintegrasi", href: "/aplikasi" },
  { label: "Pusat Bantuan", href: "/bantuan" },
  { label: "Keamanan & Privasi", href: "/keamanan" },
  { label: "Masuk Portal SSO", href: "/login" },
];
