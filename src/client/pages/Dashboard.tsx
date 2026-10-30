import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchMe, 
  fetchSsoApps, 
  fetchDirectories,
  getSsoRedirectV2, 
  UserProfile, 
  SsoAppItem,
  DirectoryItem,
} from '../services/api';
import { SidebarLayout } from '../components/SidebarLayout';
import { isImageSource } from '../lib/appIcon';
import { isBiodataComplete } from '../lib/biodata';
import { assetUrl } from '../lib/assets';
import {
  ShieldCheckIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  Squares2X2Icon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  IdentificationIcon,
  UserIcon,
  LinkIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [apps, setApps] = useState<SsoAppItem[]>([]);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirectingAppId, setRedirectingAppId] = useState<number | null>(null);
  const [accessDeniedModal, setAccessDeniedModal] = useState<{
    show: boolean;
    appName: string;
    message: string;
  }>({
    show: false,
    appName: '',
    message: '',
  });

  const navigate = useNavigate();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userRes, appsRes, dirRes] = await Promise.allSettled([
        fetchMe(),
        fetchSsoApps(),
        fetchDirectories(),
      ]);

      // allSettled tidak pernah melempar galat, jadi kegagalan tiap permintaan
      // harus diperiksa manual. Tanpa ini, sesi mati hanya menghasilkan panel
      // kosong tanpa menu dan tanpa pesan apa pun.
      if (userRes.status === 'rejected') {
        const status = userRes.reason?.response?.status;
        if (status === 401 || status === 403) {
          // Interceptor sudah membersihkan sesi dan mengalihkan ke halaman login.
          return;
        }
        setError('Gagal memuat data akun Anda. Periksa koneksi lalu muat ulang halaman.');
        return;
      }

      if (userRes.value.data.status) {
        setUser(userRes.value.data.data);
        localStorage.setItem('one_unusu_user', JSON.stringify(userRes.value.data.data));
      }
      if (appsRes.status === 'fulfilled' && appsRes.value.data.status) {
        setApps(appsRes.value.data.data);
      }
      if (dirRes.status === 'fulfilled' && dirRes.value.data.status) {
        setDirectories(dirRes.value.data.data);
      }
    } catch (err: any) {
      console.error('Error loading SSO apps:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('one_unusu_token');
        localStorage.removeItem('one_unusu_user');
        navigate('/login');
        return;
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Koneksi timeout. Gagal memuat data SSO.');
      } else {
        setError('Gagal memuat katalog aplikasi SSO dari server.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Validasi sesi dilakukan server lewat cookie HttpOnly; bila cookie sudah
    // tidak berlaku, interceptor mengarahkan pengguna kembali ke halaman login.
    loadDashboardData();
  }, [navigate]);

  const handleLaunchApp = async (app: SsoAppItem) => {
    // Peran tidak sesuai: tampilkan modal penolakan resmi
    if (app.isAllowed === false) {
      setAccessDeniedModal({
        show: true,
        appName: app.nameApp,
        message: `Akun Anda dengan peran ${user?.role || 'Pengguna'} tidak memiliki hak akses ke panel/aplikasi ${app.nameApp}. Akses diisolasi khusus untuk pengelola dan peran yang ditentukan.`,
      });
      return;
    }

    // Gerbang biodata: tiket SSO hanya diterbitkan bila email dan nomor
    // WhatsApp sudah terisi. Pengguna diarahkan ke profil dengan notifikasi.
    if (!isBiodataComplete(user)) {
      navigate('/profil', { state: { requiredBio: true } });
      return;
    }

    try {
      setRedirectingAppId(app.id);
      const res = await getSsoRedirectV2(app.clientId);
      if (res.data.status && res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        alert(res.data.message || 'Gagal membuat tiket SSO.');
      }
    } catch (err: any) {
      console.error('SSO Redirect error:', err);

      // Peran tidak berhak atas aplikasi ini: tampilkan modal penolakan
      if (err.response?.status === 403) {
        setAccessDeniedModal({
          show: true,
          appName: app.nameApp,
          message:
            err.response?.data?.message ||
            `Akses ditolak. Anda tidak memiliki izin untuk mengakses aplikasi ${app.nameApp}.`,
        });
        return;
      }

      alert(err.response?.data?.message || 'Gagal mengarahkan ke aplikasi cabang.');
    } finally {
      setRedirectingAppId(null);
    }
  };

  // Thumbnail kartu aplikasi: gambar hasil unggahan pada registrasi SSO menjadi sumber utama.
  // Kolom icon juga menyimpan nama ikon lama, jadi hanya nilai berupa sumber gambar yang dipakai.
  const getAppPreviewImage = (app: Pick<SsoAppItem, 'clientId' | 'icon'>) => {
    if (isImageSource(app.icon)) return app.icon as string;

    const id = app.clientId.toLowerCase();
    if (id.includes('lms')) return assetUrl('/assets/apps/app-lms.png');
    if (id.includes('esurat') || id.includes('e-surat')) return assetUrl('/assets/apps/app-esurat.png');
    if (id.includes('siakad')) return assetUrl('/assets/apps/app-siakad.png');
    if (id.includes('sarpras')) return assetUrl('/assets/apps/app-sarpras.png');
    if (id.includes('lpm')) return assetUrl('/assets/apps/app-lpm.png');
    if (id.includes('lppm')) return assetUrl('/assets/apps/app-lppm.png');
    return assetUrl('/assets/apps/app-lms.png');
  };

  const statusLabel = user ? (user.isActive ? 'Aktif' : 'Nonaktif') : 'Belum tersedia';

  const identitySectionTitle =
    user?.role === 'DOSEN'
      ? 'Data Ketenagaan Dosen'
      : user?.role === 'SUPERADMIN'
        ? 'Otoritas & Unit Kerja'
        : 'Data Akademik Mahasiswa';

  const renderDirectoryIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'UserIcon':
        return <UserIcon className="w-5 h-5" />;
      case 'AcademicCapIcon':
        return <AcademicCapIcon className="w-5 h-5" />;
      case 'BuildingOffice2Icon':
        return <BuildingOffice2Icon className="w-5 h-5" />;
      case 'Squares2X2Icon':
        return <Squares2X2Icon className="w-5 h-5" />;
      default:
        return <GlobeAltIcon className="w-5 h-5" />;
    }
  };

  type IdentityMetric = {
    label: string;
    value: string;
    mono?: boolean;
  };

  const identityMetrics: IdentityMetric[] =
    user?.role === 'DOSEN'
      ? [
          { label: 'NIDN / NUP', value: user.nidn || 'Belum tersedia', mono: true },
          { label: 'Homebase Prodi', value: user.prodi || 'Belum tersedia' },
          { label: 'Fakultas Induk', value: user.fakultas || 'Belum tersedia' },
          { label: 'Status Kepegawaian', value: statusLabel },
        ]
      : user?.role === 'SUPERADMIN'
        ? [
            { label: 'Username', value: user.username, mono: true },
            { label: 'Unit Kerja', value: 'PUSTIK' },
            { label: 'Hak Akses', value: 'Root SSO' },
            { label: 'Status Akun', value: statusLabel },
          ]
        : [
            {
              label: 'Nomor Induk Mahasiswa',
              value: user?.nim || user?.username || 'Belum tersedia',
              mono: true,
            },
            { label: 'Program Studi', value: user?.prodi || 'Belum tersedia' },
            { label: 'Fakultas', value: user?.fakultas || 'Belum tersedia' },
            { label: 'Status Mahasiswa', value: statusLabel },
          ];

  return (
    <SidebarLayout user={user}>
      <div className="space-y-6">
        
        {/* =========================================================================
            1. HERO WELCOME CARD (Permukaan pale green, ilustrasi kampus, logo)
           ========================================================================= */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#F0FDF4] border border-[#D8E5DC] p-6 sm:p-8 shadow-xs">
          <div 
            className="absolute top-0 right-0 h-full w-1/2 pointer-events-none opacity-85 hidden sm:block bg-no-repeat bg-right bg-cover"
            style={{
              backgroundImage: `url('${assetUrl('/assets/campus-banner.png')}')`,
              maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
            }}
          />

          <div className="relative z-10 flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[22px] bg-white border-2 border-[#166534]/20 p-2 shadow-xs flex-shrink-0 flex items-center justify-center">
              <img 
                src={assetUrl("/assets/pai/logo-unusu.jpg")} 
                alt="UNUSU Logo" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <p className="text-base sm:text-lg font-bold text-[#14532D]">
                Selamat Datang,
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] tracking-tight break-words">
                {user?.nama || 'Pengguna'}
              </h1>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. IDENTITAS CIVITAS (Daftar 2 kolom, menyesuaikan peran pengguna)
           ========================================================================= */}
        <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1E293B]">
            <IdentificationIcon className="w-5 h-5 text-[#166534]" />
            <span>{identitySectionTitle}</span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
            {identityMetrics.map((metric) => (
              <div key={metric.label} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  {metric.label}
                </dt>
                <dd
                  className={`mt-1 text-sm font-semibold text-[#1E293B] break-words ${
                    metric.mono ? 'font-mono' : ''
                  }`}
                >
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Pengingat biodata: tidak memblokir dashboard, tetapi menandai bahwa
            aplikasi SSO belum bisa dibuka sampai email & WhatsApp terisi. */}
        {user && !isBiodataComplete(user) && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-[16px] border border-[#FDE68A] bg-[#FEF3C7] px-4 py-3.5">
            <ExclamationCircleIcon className="w-5 h-5 text-[#B45309] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#92400E]">Biodata belum lengkap</p>
              <p className="text-xs text-[#B45309] leading-relaxed mt-0.5">
                Email dan nomor WhatsApp wajib diisi sebelum membuka aplikasi SSO.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profil', { state: { requiredBio: true } })}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-semibold transition flex-shrink-0"
            >
              Lengkapi Biodata
            </button>
          </div>
        )}

        {/* =========================================================================
            3. WRAP KARTU TERPADU: LAYANAN SSO & AKSES KAMPUS (DENGAN GAMBAR PREVIEW)
           ========================================================================= */}
        <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#166534]" />
                <span>Aplikasi Terintegrasi SSO (Single Sign-On)</span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Pilih aplikasi di bawah untuk masuk otomatis menggunakan token SSO v2 tanpa perlu login ulang.
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D8E5DC] text-[11px] font-bold text-[#166534] hover:bg-[#F0FDF4] transition self-start sm:self-auto"
            >
              <span>Muat Ulang Layanan</span>
              <ArrowRightIcon className="w-3 h-3" />
            </button>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-[12px] border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-3 text-xs font-medium text-[#B91C1C]">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid Aplikasi SSO dengan Gambar Screenshot seperti di Landing Page */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-[18px] border border-[#D8E5DC] bg-white overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-[#E6EFE8]" />
                  <div className="p-5 space-y-2.5">
                    <div className="h-3.5 w-2/3 rounded bg-[#E6EFE8]" />
                    <div className="h-2.5 w-full rounded bg-[#EEF4EF]" />
                    <div className="h-2.5 w-4/5 rounded bg-[#EEF4EF]" />
                  </div>
                </div>
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#C8DDD0] bg-[#F7FBF8] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#3A5544]">Belum ada aplikasi SSO aktif</p>
              <p className="text-xs text-[#7FAD8E] mt-1">
                Aplikasi yang terdaftar akan tampil di sini setelah diaktifkan oleh Superadmin.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {apps.map((app) => {
              const isAllowed = app.isAllowed !== false;

              return (
              <div
                key={app.id}
                className="group flex flex-col justify-between overflow-hidden rounded-[18px] border border-[#D8E5DC] hover:border-[#166534] bg-white shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Gambar aplikasi dari registrasi SSO */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#14532D]">
                    <img
                      src={getAppPreviewImage(app)}
                      alt={`Gambar aplikasi ${app.nameApp}`}
                      className={`w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-103 ${
                        isAllowed ? '' : 'grayscale opacity-70'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/60 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-3 left-3">
                      <span className="rounded-[8px] bg-[#1E293B]/85 px-2.5 py-1 text-[10px] font-bold text-white border border-white/10 uppercase tracking-wider">
                        {app.badge || 'Layanan SSO'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      {isAllowed ? (
                        <span className="rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                          Terkoneksi
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                          Akses Terbatas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Deskripsi Aplikasi */}
                  <div className="p-4 sm:p-5 space-y-2">
                    <h3 className="font-bold text-base text-[#1E293B] group-hover:text-[#166534] transition">
                      {app.nameApp}
                    </h3>
                    <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2">
                      {app.description || 'Layanan digital terintegrasi sistem Single Sign-On UNUSU.'}
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi Buka Aplikasi */}
                <div className="p-4 sm:p-5 pt-0">
                  <button
                    onClick={() => handleLaunchApp(app)}
                    disabled={isAllowed && redirectingAppId === app.id}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[12px] text-xs font-bold transition disabled:opacity-50 ${
                      isAllowed
                        ? 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs hover:shadow-sm'
                        : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800'
                    }`}
                  >
                    <span>
                      {isAllowed
                        ? redirectingAppId === app.id
                          ? 'Mengarahkan SSO...'
                          : 'Buka Aplikasi'
                        : 'Akses Ditolak'}
                    </span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>

        {/* =========================================================================
            4. WRAP KARTU TERPADU: PORTAL INFORMASI & DIREKTORI KAMPUS
           ========================================================================= */}
        <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
              <Squares2X2Icon className="w-4 h-4 text-[#166534]" />
              <span>Portal Informasi & Direktori Publik Kampus</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Portal informasi, pendaftaran mahasiswa baru, dan direktori akademik fakultas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {directories.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-[#94A3B8]">
                Belum ada direktori publik yang dikonfigurasi.
              </div>
            ) : (
              directories.map((dir) => (
                <div
                  key={dir.id}
                  className="p-4 rounded-[16px] bg-white border border-[#D8E5DC] hover:border-[#166534] transition flex flex-col justify-between space-y-3 group shadow-2xs"
                >
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-[10px] bg-[#DCFCE7] flex items-center justify-center text-[#166534]">
                      {renderDirectoryIcon(dir.icon)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        {dir.kategori}
                      </span>
                      <h4 className="font-bold text-sm text-[#1E293B] group-hover:text-[#166534] transition">
                        {dir.nama}
                      </h4>
                      <p className="text-xs text-[#64748B] mt-1 leading-relaxed line-clamp-2">
                        {dir.deskripsi || 'Layanan portal publik terpadu UNUSU.'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={dir.urlTarget}
                    target={dir.isExternal ? '_blank' : '_self'}
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#166534] hover:text-[#14532D] transition pt-2"
                  >
                    <span>Kunjungi Tautan</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* =========================================================================
            5. BOTTOM BANNER: SATU AKUN, SEMUA LAYANAN
           ========================================================================= */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#F0FDF4] border border-[#D8E5DC] p-6 sm:p-7 shadow-xs">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 hidden sm:flex items-center justify-center">
                <img 
                  src={assetUrl("/assets/sso-laptop.png")} 
                  alt="SSO Laptop Illustration" 
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534]">
                  Sistem Terintegrasi
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#1E293B]">
                  Satu Akun, Semua Layanan
                </h3>
                <p className="text-xs sm:text-sm text-[#475569] max-w-xl leading-relaxed">
                  Akses seluruh layanan kampus UNUSU dengan mudah, aman dan terintegrasi melalui sistem Single Sign-On (SSO).
                </p>
              </div>
            </div>

            <a
              href="/bantuan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14532D] hover:bg-[#166534] text-white text-xs sm:text-sm font-bold shadow-sm transition whitespace-nowrap self-start md:self-auto"
            >
              <span>Pelajari Lebih Lanjut</span>
              <ArrowRightIcon className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Modal Notifikasi Penolakan Akses SSO */}
        {accessDeniedModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-200 p-6 sm:p-7 text-center animate-in fade-in zoom-in duration-200">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 ring-4 ring-rose-100/70">
                <ExclamationCircleIcon className="w-8 h-8" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100/80 text-rose-800 mb-2">
                Hak Akses Terbatas
              </span>

              <h3 className="text-lg font-bold text-slate-900">
                Akses ke {accessDeniedModal.appName} Ditolak
              </h3>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed text-left bg-slate-50 border border-slate-200 rounded-xl p-4">
                {accessDeniedModal.message}
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setAccessDeniedModal({ show: false, appName: '', message: '' })}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                >
                  Saya Mengerti
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/profil')}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  Periksa Profil & Peran Saya
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
};

export default Dashboard;
