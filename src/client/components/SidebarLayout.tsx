import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserProfile, logoutSession } from '../services/api';
import { assetUrl } from '../lib/assets';
import {
  HomeIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  IdentificationIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  Squares2X2Icon,
  UsersIcon,
  KeyIcon,
  ShieldCheckIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { PERMISSIONS, hasPermission } from '../lib/permissions';
import { isBiodataComplete } from '../lib/biodata';

/**
 * Tautan "Portal Publik UNUSU" pada topbar.
 *
 * Diambil dari env supaya bisa diarahkan ke situs kampus utama tanpa menyentuh
 * kode. Bila tidak diset, yang dibuka adalah halaman depan aplikasi ini,
 * mengikuti base hasil build (mis. "/sso/") — bukan akar domain yang dulu
 * menampung portal lama.
 */
const PUBLIC_PORTAL_URL =
  import.meta.env.VITE_PUBLIC_PORTAL_URL?.trim() || import.meta.env.BASE_URL;

interface SidebarLayoutProps {
  user: UserProfile | null;
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ user, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      // Hapus sesi di server agar cookie HttpOnly ikut dibersihkan.
      await logoutSession();
    } catch {
      // Sesi mungkin sudah berakhir; pembersihan lokal tetap dilanjutkan.
    }
    localStorage.removeItem('one_unusu_token');
    localStorage.removeItem('one_unusu_user');
    navigate('/login');
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /** Tutup drawer & dropdown saat berpindah halaman (penting di mobile). */
  useEffect(() => {
    setMobileOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  /** Cegah halaman di belakang drawer ikut ter-scroll saat drawer terbuka. */
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const isProfileIncomplete = !isBiodataComplete(user);

  /**
   * isActive — hanya SATU menu yang boleh aktif.
   *
   * Versi lama (`pathname === path`) membuat menu seperti '/admin' tetap
   * menyala saat berada di '/admin/pengguna', sehingga dua menu aktif
   * bersamaan. Sekarang: cocok persis ATAU cocok sebagai prefix segmen,
   * dan bila beberapa menu berprefiks sama, yang TERPANJANG yang menang.
   */
  const allNavPaths = [
    '/dashboard',
    '/profil',
    '/admin',
    '/admin/slider',
    '/admin/direktori',
    '/admin/pengguna',
    '/admin/peran',
    '/admin/izin',
  ];

  const isActive = (path: string) => {
    const current = location.pathname;

    if (current === path) {
      // '/admin' hanya aktif tepat di '/admin' (bukan '/admin/...').
      if (path === '/admin') return true;
      const longerMatch = allNavPaths.find(
        (p) => p.length > path.length && current.startsWith(`${p}/`)
      );
      return !longerMatch;
    }

    if (!current.startsWith(`${path}/`)) return false;

    const longerMatch = allNavPaths.find(
      (p) => p.length > path.length && (current === p || current.startsWith(`${p}/`))
    );

    return !longerMatch;
  };

  const primaryNavItems = [
    { path: '/dashboard', label: 'Dashboard SSO', icon: HomeIcon as React.ElementType, permission: PERMISSIONS.dashboardMenu },
    { path: '/profil', label: 'Biodata', icon: UserCircleIcon as React.ElementType, permission: PERMISSIONS.profileMenu },
  ].filter((item) => hasPermission(user, item.permission));

  const governanceNavItems = [
    { path: '/admin', label: 'Registrasi SSO', icon: Squares2X2Icon as React.ElementType, permission: PERMISSIONS.applicationMenu },
    { path: '/admin/slider', label: 'Slider Hero', icon: PhotoIcon as React.ElementType, permission: PERMISSIONS.sliderMenu },
    { path: '/admin/direktori', label: 'Aplikasi Non-SSO', icon: GlobeAltIcon as React.ElementType, permission: PERMISSIONS.nonSsoMenu },
    // Manajemen Pengguna, Peran, dan Izin selalu diletakkan PALING BAWAH
    // pada label "Tata Kelola" karena bersifat pengaturan akses, bukan
    // pekerjaan harian pengelola konten.
    { path: '/admin/pengguna', label: 'Manajemen Pengguna', icon: UsersIcon as React.ElementType, permission: PERMISSIONS.userMenu },
    { path: '/admin/peran', label: 'Peran', icon: ShieldCheckIcon as React.ElementType, permission: PERMISSIONS.roleMenu },
    { path: '/admin/izin', label: 'Izin', icon: KeyIcon as React.ElementType, permission: PERMISSIONS.permissionMenu },
  ].filter((item) => hasPermission(user, item.permission));

  const breadcrumbLabels: Record<string, string> = {
    '/dashboard': 'Dashboard Layanan SSO',
    '/profil': 'Biodata Pengguna',
    '/admin': 'Registrasi SSO',
    '/admin/slider': 'Slider Hero',
    '/admin/direktori': 'Aplikasi Non-SSO',
    '/admin/pengguna': 'Manajemen Pengguna',
    '/admin/izin': 'Izin',
    '/admin/peran': 'Peran',
    '/akses-ditolak': 'Akses Ditolak',
  };

  const navItemClass = (path: string) =>
    `w-full flex items-center rounded-[12px] text-[13.5px] font-semibold transition-all ${
      isActive(path)
        ? 'bg-[#D8F0E1] text-[#145A32]'
        : 'text-[#3A5544] hover:bg-[#E4F2E9] hover:text-[#166534]'
    }`;

  const iconBoxClass = (path: string) =>
    `w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
      isActive(path) ? 'bg-[#166534] text-white' : 'bg-[#D3EAD9] text-[#4D7A60]'
    }`;

  const renderSidebar = (isCollapsed: boolean) => (
    <div className="h-full flex flex-col justify-between bg-[#EEF7EF] text-[#1E293B] border-r border-[#C8DDD0] relative overflow-hidden">

      {/* Bottom-left botanical leaf ornament */}
      <div
        className="absolute -bottom-6 -left-6 w-[460px] h-[420px] pointer-events-none z-0"
        style={{
          backgroundImage: `url('${assetUrl('/assets/sidebar-leaves.svg')}')`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom left',
          backgroundSize: 'cover',
          opacity: 0.85,
        }}
      />

      <div className="flex flex-col relative z-10">
        {/* Brand Header — solid light-green, tinggi sama dengan headbar utama */}
        <div
          className={`h-[88px] flex items-center border-b border-[#9BD4AF] bg-[#C2ECD0] ${
            isCollapsed ? 'justify-center px-0' : 'justify-between px-5'
          }`}
        >
          <Link
            to="/"
            className="flex items-center gap-3"
            title="ONE UNUSU - Halaman Depan"
            data-testid="link-brand-home"
          >
            <div className="w-11 h-11 rounded-[14px] bg-white border border-[#A5DCB9] p-1 shadow-2xs flex-shrink-0 flex items-center justify-center">
              <img
                src={assetUrl("/assets/pai/logo-unusu.jpg")}
                alt="Logo UNUSU"
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="leading-snug">
                <div className="font-extrabold text-[15px] tracking-tight">
                  <span className="text-[#3F5B4B]">ONE </span>
                  <span className="text-[#0F4527]">UNUSU</span>
                </div>
                <p className="text-[11px] text-[#2F6B45] font-semibold mt-0.5 italic">
                  Gateway Sistem Terpadu
                </p>
              </div>
            )}
          </Link>

          {mobileOpen && !isCollapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#2F6B45] hover:text-[#0F4527] hover:bg-[#A9E0BC]"
              aria-label="Tutup Menu"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className={`${isCollapsed ? 'px-2' : 'px-3'} pt-5 space-y-5`}>
          {/* MENU UTAMA */}
          <div className="space-y-1.5">
            {!isCollapsed && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#9BB5A3]">
                MENU UTAMA
              </p>
            )}

            {primaryNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                title={isCollapsed ? item.label : undefined}
                className={`${navItemClass(item.path)} ${
                  isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                }`}
              >
                <div className={isCollapsed ? 'flex items-center' : 'flex items-center gap-3 truncate'}>
                  <span className={`${iconBoxClass(item.path)} relative`}>
                    <item.icon className="w-4 h-4" />
                    {item.path === '/profil' && isCollapsed && isProfileIncomplete && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#B45309] ring-2 ring-[#EEF7EF]" />
                    )}
                  </span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
              </button>
            ))}
          </div>

          {/* TATA KELOLA */}
          {governanceNavItems.length > 0 && (
            <div className="space-y-1.5 pt-4 border-t border-[#B8D0BD]">
              {!isCollapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#9BB5A3]">
                  TATA KELOLA
                </p>
              )}

              {governanceNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  title={isCollapsed ? item.label : undefined}
                  className={`${navItemClass(item.path)} ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  }`}
                >
                  <div className={isCollapsed ? 'flex items-center' : 'flex items-center gap-3 truncate'}>
                    <span className={iconBoxClass(item.path)}>
                      <item.icon className="w-4 h-4" />
                    </span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className={`relative z-10 space-y-2 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {isCollapsed ? (
          <div
            className="flex items-center justify-center py-2.5 rounded-[12px] bg-white border border-[#C5D9CA] shadow-2xs"
            title="SSO Gateway V2 — ONLINE"
          >
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#22C55E] opacity-70 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
            </span>
          </div>
        ) : (
          <div className="px-3.5 py-2.5 rounded-[14px] bg-white border border-[#C5D9CA] flex items-center gap-2 text-xs shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="text-[#1E293B] font-bold">SSO Gateway V2</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Keluar Akun' : undefined}
          className={`w-full flex items-center justify-center rounded-[14px] bg-white hover:bg-[#FEE2E2] border border-[#C5D9CA] hover:border-[#FECACA] font-semibold text-[#3A5544] hover:text-[#B91C1C] transition shadow-2xs group ${
            isCollapsed ? 'py-2.5 px-0' : 'gap-2 px-3.5 py-2.5 text-[13px]'
          }`}
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4 group-hover:text-[#B91C1C]" />
          {!isCollapsed && <span>Keluar Akun</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F2] flex flex-col lg:flex-row text-[#1E293B]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block h-screen sticky top-0 flex-shrink-0 z-30 transition-[width] duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-sidebar" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <div
            className="fixed inset-0 bg-[#1E293B]/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 overflow-y-auto shadow-2xl">
            {renderSidebar(false)}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Headbar — desktop 88px (sejajar brand sidebar), mobile lebih ringkas
         *  agar tidak memakan ruang layar kecil. Breadcrumb disederhanakan:
         *  "ONE UNUSU / <halaman>" disembunyikan di bawah `sm` karena nama
         *  halaman sudah jelas dari menu; menyisakan tombol menu + tombol aksi. */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#D8E5DC] px-3 sm:px-6 flex h-16 lg:h-[88px] items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile drawer toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-[10px] border border-[#D8E5DC] text-[#475569] hover:bg-[#E4F2E9] hover:text-[#14532D] transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              aria-label="Buka Menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-sidebar"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="hidden lg:inline-flex items-center justify-center p-2 rounded-[10px] border border-[#D8E5DC] text-[#475569] hover:bg-[#E4F2E9] hover:text-[#14532D] transition"
              aria-label={collapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
            >
              {collapsed ? (
                <ChevronDoubleRightIcon className="w-4 h-4" />
              ) : (
                <ChevronDoubleLeftIcon className="w-4 h-4" />
              )}
            </button>

            {/* Breadcrumb — di mobile hanya menampilkan halaman aktif */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex text-[#166534] hover:text-[#14532D] shrink-0"
                aria-label="Dashboard SSO"
              >
                <HomeIcon className="w-4 h-4" />
              </Link>
              <span className="hidden sm:inline text-[#94A3B8] font-bold">›</span>
              <span className="hidden md:inline font-bold text-[#1E293B] whitespace-nowrap">ONE UNUSU</span>
              <span className="hidden md:inline text-[#94A3B8]">/</span>
              <span className="text-[#475569] font-medium truncate">
                {breadcrumbLabels[location.pathname] ?? 'Portal SSO'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 border-x border-[#D8E5DC] bg-transparent hover:bg-[#F0FDF4]/60 transition focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#166534] text-white flex items-center justify-center flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.nama} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="text-left hidden md:block leading-tight">
                  <p className="text-xs font-bold text-[#1E293B]">{user?.nama || 'Pengguna'}</p>
                  <p className="text-[10px] text-[#64748B] font-mono">
                    {user?.nim || user?.nidn || user?.username || '-'}
                  </p>
                </div>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div
                  role="menu"
                  aria-label="Menu akun"
                  className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-white rounded-[14px] shadow-md border border-[#D8E5DC] py-1.5 z-50 text-xs"
                >
                  <div className="px-3.5 py-2.5 border-b border-[#E8EFEA]">
                    <p className="text-xs font-bold text-[#1E293B] truncate">{user?.nama}</p>
                    <p className="text-[11px] text-[#64748B] font-mono truncate mt-0.5">{user?.email || 'Belum ada email'}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full text-left px-3.5 py-2 text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] flex items-center gap-2.5 font-medium transition"
                    >
                      <GlobeAltIcon className="w-4 h-4 text-[#166534]" />
                      <span>Halaman Depan</span>
                    </Link>
                    <button
                      onClick={() => { navigate('/profil'); setProfileDropdownOpen(false); }}
                      className="w-full text-left px-3.5 py-2 text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] flex items-center gap-2.5 font-medium transition"
                    >
                      <IdentificationIcon className="w-4 h-4 text-[#166534]" />
                      <span>Biodata Saya</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#E8EFEA]">
                    <button
                      onClick={() => { setProfileDropdownOpen(false); handleLogout(); }}
                      className="w-full text-left px-3.5 py-2 text-[#B91C1C] hover:bg-[#FEE2E2] flex items-center gap-2.5 font-semibold transition"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4 text-[#B91C1C]" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-7">
          {children}
        </main>

        <footer className="py-4 px-4 sm:py-5 sm:px-6 text-center text-xs text-[#64748B]">
          <p>© {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara • Sistem Identitas Digital Terpadu</p>
        </footer>
      </div>
    </div>
  );
};

export default SidebarLayout;
