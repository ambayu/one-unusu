import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchMe, 
  fetchSsoApps, 
  getSsoRedirectV2, 
  UserProfile, 
  SsoAppItem 
} from '../services/api';
import { AppCardSkeleton } from '../components/Skeleton';
import { SsoLogo } from '../components/SsoLogo';
import { 
  ExternalLink, 
  ShieldCheck, 
  BookOpenCheck, 
  FlaskConical, 
  Award, 
  MailCheck, 
  Building2, 
  LayoutGrid, 
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  LogOut,
  User,
  Sliders
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [apps, setApps] = useState<SsoAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirectingAppId, setRedirectingAppId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userRes, appsRes] = await Promise.all([
        fetchMe(),
        fetchSsoApps()
      ]);

      if (userRes.data.status) {
        setUser(userRes.data.data);
      }
      if (appsRes.data.status) {
        setApps(appsRes.data.data);
      }
    } catch (err: any) {
      console.error('Error loading SSO apps:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
        return;
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Koneksi timeout. Gagal memuat daftar aplikasi SSO dalam batas waktu.');
      } else {
        setError('Gagal memuat katalog aplikasi SSO dari server.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('one_unusu_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadDashboardData();
  }, [navigate]);

  // Handle SSO Token v2 Launch
  const handleLaunchApp = async (app: SsoAppItem) => {
    try {
      setRedirectingAppId(app.id);
      const res = await getSsoRedirectV2(app.clientId);
      if (res.data.status && res.data.redirectUrl) {
        // Alihkan browser pengguna ke aplikasi cabang dengan parameter ?client_id=...&token=...
        window.location.href = res.data.redirectUrl;
      } else {
        alert(res.data.message || 'Gagal membuat tiket SSO.');
      }
    } catch (err: any) {
      console.error('SSO Redirect error:', err);
      alert(err.response?.data?.message || 'Gagal mengarahkan ke aplikasi cabang.');
    } finally {
      setRedirectingAppId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('one_unusu_token');
    localStorage.removeItem('one_unusu_user');
    navigate('/login');
  };

  const getAppIcon = (iconName?: string) => {
    switch (iconName) {
      case 'BookOpenCheck':
        return <BookOpenCheck className="w-6 h-6 text-emerald-600" />;
      case 'FlaskConical':
        return <FlaskConical className="w-6 h-6 text-amber-600" />;
      case 'Award':
        return <Award className="w-6 h-6 text-indigo-600" />;
      case 'MailCheck':
        return <MailCheck className="w-6 h-6 text-rose-600" />;
      case 'Building2':
        return <Building2 className="w-6 h-6 text-teal-600" />;
      default:
        return <LayoutGrid className="w-6 h-6 text-emerald-600" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'SUPERADMIN') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          Super Administrator
        </span>
      );
    }
    if (role === 'DOSEN') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
          Dosen Pengajar
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Mahasiswa Aktif
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Interactive SSO Brand Logo */}
            <SsoLogo
              size="md"
              subtitle="SSO Central Gateway"
              onClick={() => navigate('/')}
            />

            {/* Navigation Right */}
            <div className="flex items-center space-x-3">
              {user?.role === 'SUPERADMIN' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition border border-blue-200"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Panel Superadmin</span>
                </button>
              )}

              <button
                onClick={() => navigate('/profil')}
                className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-2 rounded-xl hover:bg-slate-100 transition border border-slate-200"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                  {user?.nama?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{user?.nama}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {user?.nim || user?.nidn || user?.username}
                  </p>
                </div>
              </button>

              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Portal Akun Terpadu
                </span>
                <span className="text-slate-600">•</span>
                {getRoleBadge(user?.role)}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Ahlan wa Sahlan, {user?.nama || 'Sivitas UNUSU'} 🤍
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                {user?.role === 'MAHASISWA' && `NIM: ${user.nim} | Program Studi: ${user.prodi || '-'} | Fakultas: ${user.fakultas || '-'}`}
                {user?.role === 'DOSEN' && `NIDN: ${user.nidn} | Homebase: ${user.prodi || '-'} | Fakultas: ${user.fakultas || '-'}`}
                {user?.role === 'SUPERADMIN' && 'Anda memiliki hak penuh mengelola akun dan konfigurasi aplikasi SSO di database.'}
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-emerald-900/40 border border-emerald-500/30 rounded-2xl px-4 py-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">SSO Token v2 Aktif</p>
                <p className="text-[11px] text-emerald-200">Single-use token 64 char otomatis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Section Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-emerald-700" />
              <span>Aplikasi Terintegrasi SSO</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik aplikasi untuk masuk secara otomatis tanpa perlu login manual lagi.
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Error Fallback with Retry */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <>
              <AppCardSkeleton />
              <AppCardSkeleton />
              <AppCardSkeleton />
              <AppCardSkeleton />
              <AppCardSkeleton />
              <AppCardSkeleton />
            </>
          ) : apps.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
              <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Belum ada aplikasi yang tersedia untuk peran Anda.</p>
              <p className="text-xs text-slate-400">Hubungi Superadministrator PUSTIK UNUSU jika Anda membutuhkan akses tambahan.</p>
            </div>
          ) : (
            apps.map((app) => (
              <div
                key={app.id}
                className="group bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-emerald-500/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Card Top */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getAppIcon(app.icon)}
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {app.badge || 'Terkoneksi'}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-700 transition">
                      {app.nameApp}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {app.description || 'Layanan digital terintegrasi ONE UNUSU.'}
                    </p>
                  </div>
                </div>

                {/* Launch Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Single Sign-On</span>
                  </div>
                  <button
                    onClick={() => handleLaunchApp(app)}
                    disabled={redirectingAppId === app.id}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-950/10 transition group-hover:scale-105 disabled:opacity-50"
                  >
                    {redirectingAppId === app.id ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menghubungkan...</span>
                      </>
                    ) : (
                      <>
                        <span>Buka Layanan</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-400">
        <p>ONE UNUSU SSO Central Gateway • Universitas Nahdlatul Ulama Sumatera Utara</p>
      </footer>
    </div>
  );
};
