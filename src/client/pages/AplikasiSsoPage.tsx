import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMe,
  fetchSsoApps,
  getSsoRedirectV2,
  UserProfile,
  SsoAppItem,
} from '../services/api';
import { NotificationModal, NotificationType } from '../components/NotificationModal';
import { isImageSource } from '../lib/appIcon';
import { isBiodataComplete } from '../lib/biodata';
import { openTabTujuan, arahkanTab, tutupTab } from '../lib/ssoLaunch';
import { assetUrl } from '../lib/assets';
import {
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export const AplikasiSsoPage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ssoApps, setSsoApps] = useState<SsoAppItem[]>([]);
  const [loading, setLoading] = useState(true);
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

      const [userRes, appsRes] = await Promise.allSettled([
        fetchMe(),
        fetchSsoApps(),
      ]);

      if (userRes.status === 'rejected') {
        const status = userRes.reason?.response?.status;
        if (status === 401 || status === 403) return;
        setError('Gagal memuat profil pengguna. Periksa koneksi ke server.');
        return;
      }

      if (userRes.value.data.status) {
        setUser(userRes.value.data.data);
      }
      if (appsRes.status === 'fulfilled' && appsRes.value.data.status) {
        setSsoApps(appsRes.value.data.data);
      }
    } catch (err: any) {
      console.error('Gagal memuat data aplikasi SSO:', err);
      setError('Gagal memuat katalog aplikasi SSO dari server.');
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

  // Filter permission masuk mahasiswa:
  // Jika akun hanya memiliki izin masuk_mahasiswa murni, saring aplikasi agar HANYA yang diizinkan untuk mahasiswa
  const filteredApps = useMemo(() => {
    const userPerms = user?.permissions || [];
    const hasMasukMahasiswa = userPerms.includes('masuk_mahasiswa');
    const hasMasukDosen = userPerms.includes('masuk_dosen');
    const hasMasukAdmin = userPerms.includes('masuk_admin');
    const isMahasiswaOnly = hasMasukMahasiswa && !hasMasukDosen && !hasMasukAdmin;

    let list = ssoApps;
    if (isMahasiswaOnly) {
      list = list.filter((a) => a.isAllowed !== false);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (app) =>
        app.nameApp.toLowerCase().includes(q) ||
        (app.description && app.description.toLowerCase().includes(q)) ||
        (app.badge && app.badge.toLowerCase().includes(q)) ||
        app.clientId.toLowerCase().includes(q)
    );
  }, [ssoApps, user, searchQuery]);

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
      <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#166534]">
            <LinkIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Daftar Aplikasi SSO</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Aplikasi resmi terintegrasi Single Sign-On (SSO) UNUSU. Masuk otomatis tanpa memasukkan kata sandi lagi.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D8E5DC] text-xs font-semibold text-[#166534] hover:bg-[#F0FDF4] transition self-start md:self-auto disabled:opacity-60"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Bar Pencarian */}
      <div className="bg-white rounded-[18px] border border-[#D8E5DC] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#3A5544]">
          <span className="w-2 h-2 rounded-full bg-[#166534]" />
          <span>Menampilkan {filteredApps.length} modul SSO aktif</span>
        </div>

        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Cari aplikasi SSO..."
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

      {/* Grid Kartu Aplikasi SSO */}
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
      ) : filteredApps.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#D8E5DC] bg-white p-12 text-center text-xs text-[#64748B]">
          Tidak ada aplikasi SSO yang sesuai dengan pencarian atau hak akses akun Anda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => {
            const isLocked = app.isAllowed === false;
            return (
              <div
                key={app.id}
                className={`group flex flex-col justify-between overflow-hidden rounded-[18px] border bg-white shadow-xs transition-all duration-200 ${
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
                        isLocked ? 'grayscale' : 'group-hover:scale-103'
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#B91C1C]/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                          <LockClosedIcon className="w-3 h-3" />
                          <span>Tidak Ada Akses</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#166534]/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                          <CheckCircleIcon className="w-3 h-3" />
                          <span>Tersedia</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-base text-[#1E293B] group-hover:text-[#166534] transition line-clamp-1">
                      {app.nameApp}
                    </h3>
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
                        : 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs hover:shadow-sm'
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
  );
};
