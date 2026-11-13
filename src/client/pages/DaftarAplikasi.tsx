import React, { useState, useEffect, useMemo } from 'react';
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
import { NotificationModal, NotificationType } from '../components/NotificationModal';
import { isImageSource } from '../lib/appIcon';
import { isBiodataComplete } from '../lib/biodata';
import { openTabTujuan, arahkanTab, tutupTab } from '../lib/ssoLaunch';
import { assetUrl } from '../lib/assets';
import {
  Squares2X2Icon,
  GlobeAltIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type FilterTab = 'all' | 'sso' | 'non-sso';

export const DaftarAplikasi: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ssoApps, setSsoApps] = useState<SsoAppItem[]>([]);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [redirectingAppId, setRedirectingAppId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'error',
    message: '',
  });

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userRes, appsRes, dirRes] = await Promise.allSettled([
        fetchMe(),
        fetchSsoApps(),
        fetchDirectories(),
      ]);

      if (userRes.status === 'rejected') {
        const status = userRes.reason?.response?.status;
        if (status === 401 || status === 403) {
          return;
        }
        setError('Gagal memuat profil pengguna. Periksa koneksi ke server.');
        return;
      }

      if (userRes.value.data.status) {
        setUser(userRes.value.data.data);
      }
      if (appsRes.status === 'fulfilled' && appsRes.value.data.status) {
        setSsoApps(appsRes.value.data.data);
      }
      if (dirRes.status === 'fulfilled' && dirRes.value.data.status) {
        setDirectories(dirRes.value.data.data);
      }
    } catch (err: any) {
      console.error('Gagal memuat data aplikasi:', err);
      setError('Gagal memuat katalog aplikasi dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleLaunchApp = async (app: SsoAppItem) => {
    if (!isBiodataComplete(user)) {
      navigate('/profil', { state: { requiredBio: true } });
      return;
    }

    if (app.isAllowed === false) {
      setNotify({
        isOpen: true,
        type: 'denied',
        title: 'Akses Ditolak',
        message: 'Akses ditolak. Anda tidak memiliki akses ke aplikasi ini.',
      });
      return;
    }

    const tabTujuan = openTabTujuan();

    try {
      setRedirectingAppId(app.id);
      const res = await getSsoRedirectV2(app.clientId);
      if (res.data.status && res.data.redirectUrl) {
        arahkanTab(tabTujuan, res.data.redirectUrl);
      } else {
        tutupTab(tabTujuan);
        setNotify({
          isOpen: true,
          type: 'denied',
          title: 'Akses Ditolak',
          message: res.data.message || 'Akses ditolak. Anda tidak memiliki akses ke aplikasi ini.',
        });
      }
    } catch (err: any) {
      tutupTab(tabTujuan);
      console.error('SSO Redirect error:', err);
      const isForbidden = err.response?.status === 403;
      setNotify({
        isOpen: true,
        type: isForbidden ? 'denied' : 'error',
        title: isForbidden ? 'Akses Ditolak' : 'Gagal Membuka Aplikasi',
        message: isForbidden
          ? 'Akses ditolak. Anda tidak memiliki akses ke aplikasi ini.'
          : err.response?.data?.message || 'Gagal mengarahkan ke aplikasi cabang.',
      });
    } finally {
      setRedirectingAppId(null);
    }
  };

  const getAppPreviewImage = (app: Pick<SsoAppItem, 'clientId' | 'icon'>) => {
    if (isImageSource(app.icon)) return app.icon as string;

    const id = app.clientId.toLowerCase();
    if (id.includes('prodi')) return assetUrl('/assets/apps/app-siakad.png');
    if (id.includes('lppm')) return assetUrl('/assets/apps/app-lppm.png');
    if (id.includes('lpm')) return assetUrl('/assets/apps/app-lpm.png');
    if (id.includes('lms')) return assetUrl('/assets/apps/app-lms.png');
    if (id.includes('esurat') || id.includes('e-surat')) return assetUrl('/assets/apps/app-esurat.png');
    if (id.includes('siakad')) return assetUrl('/assets/apps/app-siakad.png');
    if (id.includes('sarpras')) return assetUrl('/assets/apps/app-sarpras.png');
    if (id.includes('akreditasi')) return assetUrl('/assets/apps/app-sarpras.png');
    return assetUrl('/assets/apps/app-lms.png');
  };

  const renderDirectoryIcon = (iconName: string | null) => {
    if (isImageSource(iconName)) {
      return (
        <img
          src={iconName as string}
          alt="Ikon Portal"
          className="w-full h-full object-contain rounded-[6px]"
        />
      );
    }

    switch (iconName) {
      case 'AcademicCapIcon':
        return <AcademicCapIcon className="w-5 h-5" />;
      case 'BuildingOffice2Icon':
        return <BuildingOffice2Icon className="w-5 h-5" />;
      case 'Squares2X2Icon':
        return <Squares2X2Icon className="w-5 h-5" />;
      case 'GlobeAltIcon':
      default:
        return <GlobeAltIcon className="w-5 h-5" />;
    }
  };

  const filteredSsoApps = useMemo(() => {
    if (filterTab === 'non-sso') return [];
    if (!searchQuery.trim()) return ssoApps;
    const q = searchQuery.toLowerCase();
    return ssoApps.filter(
      (app) =>
        app.nameApp.toLowerCase().includes(q) ||
        (app.description && app.description.toLowerCase().includes(q)) ||
        (app.badge && app.badge.toLowerCase().includes(q)) ||
        app.clientId.toLowerCase().includes(q)
    );
  }, [ssoApps, filterTab, searchQuery]);

  const filteredDirectories = useMemo(() => {
    if (filterTab === 'sso') return [];
    if (!searchQuery.trim()) return directories;
    const q = searchQuery.toLowerCase();
    return directories.filter(
      (dir) =>
        dir.nama.toLowerCase().includes(q) ||
        (dir.deskripsi && dir.deskripsi.toLowerCase().includes(q)) ||
        (dir.kategori && dir.kategori.toLowerCase().includes(q))
    );
  }, [directories, filterTab, searchQuery]);

  const allowedSsoCount = useMemo(
    () => ssoApps.filter((a) => a.isAllowed !== false).length,
    [ssoApps]
  );

  return (
    <div className="space-y-6">
      <NotificationModal
        isOpen={notify.isOpen}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Header Halaman */}
      <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#166534]">
              <Squares2X2Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1E293B]">Katalog Daftar Aplikasi</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Koleksi terpadu seluruh aplikasi ber-SSO dan direktori portal mandiri di lingkungan UNUSU.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D8E5DC] text-xs font-semibold text-[#166534] hover:bg-[#F0FDF4] transition self-start md:self-auto disabled:opacity-60"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang Katalog</span>
        </button>
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[16px] border border-[#D8E5DC] p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center flex-shrink-0">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Aplikasi SSO Terhubung</p>
            <p className="text-xl font-extrabold text-[#1E293B] mt-0.5">
              {ssoApps.length} <span className="text-xs font-normal text-[#64748B]">modul ({allowedSsoCount} aktif berizin)</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-[#D8E5DC] p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center flex-shrink-0">
            <GlobeAltIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Portal Mandiri Non-SSO</p>
            <p className="text-xl font-extrabold text-[#1E293B] mt-0.5">
              {directories.length} <span className="text-xs font-normal text-[#64748B]">portal eksternal/publik</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-[#D8E5DC] p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center flex-shrink-0">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Total Layanan Kampus</p>
            <p className="text-xl font-extrabold text-[#1E293B] mt-0.5">
              {ssoApps.length + directories.length} <span className="text-xs font-normal text-[#64748B]">layanan terdaftar</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tab & Search Bar */}
      <div className="bg-white rounded-[18px] border border-[#D8E5DC] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3.5">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-[#166534] text-white shadow-sm'
                : 'bg-[#F1F5F2] text-[#475569] hover:bg-[#E2E8F0]'
            }`}
          >
            Semua Layanan ({ssoApps.length + directories.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('sso')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'sso'
                ? 'bg-[#166534] text-white shadow-sm'
                : 'bg-[#F1F5F2] text-[#475569] hover:bg-[#E2E8F0]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Aplikasi SSO ({ssoApps.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('non-sso')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'non-sso'
                ? 'bg-[#166534] text-white shadow-sm'
                : 'bg-[#F1F5F2] text-[#475569] hover:bg-[#E2E8F0]'
            }`}
          >
            <GlobeAltIcon className="w-3.5 h-3.5" />
            <span>Non-SSO / Mandiri ({directories.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Cari aplikasi atau portal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#D8E5DC] bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534] transition"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-[#FECACA] bg-[#FEE2E2] px-4 py-3 text-xs font-medium text-[#B91C1C]">
          <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* SEKSI 1: APLIKASI TERINTEGRASI SSO */}
      {filterTab !== 'non-sso' && (
        <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#166534]" />
                <span>Aplikasi Terintegrasi Single Sign-On (SSO)</span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Masuk otomatis ke sistem akademik dan layanan kampus dengan satu sesi terverifikasi.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#166534] bg-[#DCFCE7] px-3 py-1 rounded-full self-start sm:self-auto">
              {filteredSsoApps.length} Modul
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-[18px] border border-[#D8E5DC] bg-white overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-[#E6EFE8]" />
                  <div className="p-5 space-y-2.5">
                    <div className="h-4 w-2/3 rounded bg-[#E6EFE8]" />
                    <div className="h-3 w-full rounded bg-[#EEF4EF]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSsoApps.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#64748B]">
              Tidak ada aplikasi SSO yang cocok dengan filter atau kata kunci pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSsoApps.map((app) => {
                const isLocked = app.isAllowed === false;
                return (
                  <div
                    key={app.id}
                    className={`group flex flex-col justify-between overflow-hidden rounded-[18px] border bg-white shadow-sm transition-all duration-200 ${
                      isLocked
                        ? 'border-[#E2E8F0] opacity-90'
                        : 'border-[#D8E5DC] hover:border-[#166534] hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#14532D]">
                        <img
                          src={getAppPreviewImage(app)}
                          alt={`Gambar aplikasi ${app.nameApp}`}
                          className={`w-full h-full object-cover object-center transition-transform duration-300 ${
                            isLocked ? 'grayscale' : 'group-hover:scale-105'
                          }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/60 via-transparent to-transparent pointer-events-none" />

                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="rounded-[8px] bg-[#1E293B]/85 px-2.5 py-1 text-[10px] font-bold text-white border border-white/10 uppercase tracking-wider">
                            {app.badge || 'Layanan SSO'}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#B91C1C]/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
                              <LockClosedIcon className="w-3 h-3" />
                              <span>Tidak Ada Akses</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#166534]/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
                              <CheckCircleIcon className="w-3 h-3" />
                              <span>Tersedia</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-base text-[#1E293B] group-hover:text-[#166534] transition line-clamp-1">
                            {app.nameApp}
                          </h3>
                        </div>
                        <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2">
                          {app.description || 'Layanan aplikasi terpadu ekosistem UNUSU.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <button
                        type="button"
                        onClick={() => handleLaunchApp(app)}
                        disabled={redirectingAppId === app.id}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[12px] text-xs font-bold transition-all ${
                          isLocked
                            ? 'bg-[#F1F5F2] hover:bg-[#E2E8F0] text-[#64748B] border border-[#D8E5DC]'
                            : 'bg-[#166534] hover:bg-[#14532D] text-white shadow-sm hover:shadow-sm'
                        }`}
                      >
                        <span>
                          {redirectingAppId === app.id
                            ? 'Membuka Tab Baru...'
                            : isLocked
                              ? 'Tidak Ada Akses'
                              : 'Buka Aplikasi'}
                        </span>
                        {isLocked ? (
                          <LockClosedIcon className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SEKSI 2: PORTAL INFORMASI & DIREKTORI NON-SSO */}
      {filterTab !== 'sso' && (
        <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <GlobeAltIcon className="w-4 h-4 text-[#166534]" />
                <span>Portal Mandiri & Direktori Publik Non-SSO</span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Portal informasi publik, pendaftaran mahasiswa, dan sistem mandiri di luar integrasi SSO.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#B45309] bg-[#FEF3C7] px-3 py-1 rounded-full self-start sm:self-auto">
              {filteredDirectories.length} Portal Mandiri
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-[16px] bg-stone-50 border border-stone-200 animate-pulse space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-200" />
                  <div className="h-4 w-2/3 rounded bg-stone-200" />
                  <div className="h-3 w-full rounded bg-stone-200" />
                </div>
              ))}
            </div>
          ) : filteredDirectories.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#64748B]">
              Tidak ada portal mandiri yang cocok dengan filter atau kata kunci pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredDirectories.map((dir) => (
                <div
                  key={dir.id}
                  className="p-4.5 rounded-[16px] bg-white border border-[#D8E5DC] hover:border-[#166534] transition flex flex-col justify-between space-y-3 group shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-[10px] bg-[#DCFCE7] flex items-center justify-center text-[#166534] transition-colors group-hover:bg-[#166534] group-hover:text-white">
                      {renderDirectoryIcon(dir.icon)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        {dir.kategori || 'Portal'}
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
                    rel={dir.isExternal ? 'noopener noreferrer' : undefined}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] bg-[#F1F5F2] hover:bg-[#166534] text-[#1E293B] hover:text-white text-xs font-semibold transition group-hover:border-[#166534] border border-[#D8E5DC]"
                  >
                    <span>Kunjungi Portal</span>
                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
