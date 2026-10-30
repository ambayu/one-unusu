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
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isProfileIncomplete = !isBiodataComplete(user);

  const isActive = (path: string) => location.pathname === path;

  const primaryNavItems = [
    { path: '/dashboard', label: 'Dashboard SSO', icon: HomeIcon as React.ElementType, permission: PERMISSIONS.dashboardMenu },
    { path: '/profil', label: 'Biodata', icon: UserCircleIcon as React.ElementType, permission: PERMISSIONS.profileMenu },
  ].filter((item) => hasPermission(user, item.permission));

  const governanceNavItems = [
    { path: '/admin', label: 'Registrasi SSO', icon: Squares2X2Icon as React.ElementType, permission: PERMISSIONS.applicationMenu },
    { path: '/admin/slider', label: 'Slider Hero', icon: PhotoIcon as React.ElementType, permission: PERMISSIONS.sliderMenu },
    { path: '/admin/direktori', label: 'Aplikasi Non-SSO', icon: GlobeAltIcon as React.ElementType, permission: PERMISSIONS.directoryMenu },
    { path: '/admin/pengguna', label: 'Manajemen Pengguna', icon: UsersIcon as React.ElementType, permission: PERMISSIONS.userMenu },
    { path: '/admin/izin', label: 'Izin', icon: KeyIcon as React.ElementType, permission: PERMISSIONS.permissionMenu },
    { path: '/admin/peran', label: 'Peran', icon: ShieldCheckIcon as React.ElementType, permission: PERMISSIONS.roleMenu },
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
          <Link to="/dashboard" className="flex items-center gap-3" title="ONE UNUSU">
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
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-[#1E293B]/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 max-w-[80vw] z-50">
            {renderSidebar(false)}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Headbar — tinggi 88px, sama dengan brand header sidebar */}
        <header className="sticky top-0 z-20 h-[88px] bg-white border-b border-[#D8E5DC] px-4 sm:px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile drawer toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-[10px] border border-[#D8E5DC] text-[#475569] hover:bg-[#E4F2E9] hover:text-[#14532D] transition"
              aria-label="Buka Menu"
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

            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Link to="/dashboard" className="text-[#166534] hover:text-[#14532D]">
                <HomeIcon className="w-4 h-4" />
              </Link>
              <span className="text-[#94A3B8] font-bold">›</span>
              <span className="font-bold text-[#1E293B]">ONE UNUSU</span>
              <span className="text-[#94A3B8]">/</span>
              <span className="text-[#475569] font-medium">
                {breadcrumbLabels[location.pathname] ?? 'Portal SSO'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={PUBLIC_PORTAL_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D8E5DC] bg-white text-[#1E293B] hover:bg-[#F0FDF4] hover:text-[#166534] text-xs font-semibold transition shadow-2xs"
            >
              <GlobeAltIcon className="w-4 h-4 text-[#166534]" />
              <span>Halaman Depan</span>
            </a>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-white hover:bg-[#F0FDF4] border border-[#D8E5DC] transition focus:outline-none shadow-2xs"
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
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-[14px] shadow-md border border-[#D8E5DC] py-1.5 z-50 text-xs">
                  <div className="px-3.5 py-2.5 border-b border-[#E8EFEA]">
                    <p className="text-xs font-bold text-[#1E293B] truncate">{user?.nama}</p>
                    <p className="text-[11px] text-[#64748B] font-mono truncate mt-0.5">{user?.email || 'Belum ada email'}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { navigate('/profil'); setProfileDropdownOpen(false); }}
                      className="w-full text-left px-3.5 py-2 text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] flex items-center gap-2.5 font-medium transition"
                    >
                      <IdentificationIcon className="w-4 h-4 text-[#166534]" />
                      <span>Biodata Saya</span>
                    </button>
                    {hasPermission(user, PERMISSIONS.applicationMenu) && (
                      <button
                        onClick={() => { navigate('/admin'); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-3.5 py-2 text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] flex items-center gap-2.5 font-medium transition"
                      >
                        <Cog6ToothIcon className="w-4 h-4 text-[#166534]" />
                        <span>Registrasi Aplikasi</span>
                      </button>
                    )}
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

        <main className="flex-1 min-w-0 w-full p-5 sm:p-7">
          {children}
        </main>

        <footer className="py-5 px-6 text-center text-xs text-[#64748B]">
          <p>© {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara • Sistem Identitas Digital Terpadu</p>
        </footer>
      </div>
    </div>
  );
};

export default SidebarLayout;
