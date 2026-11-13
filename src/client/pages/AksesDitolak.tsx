import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { fetchPanelAccess, logoutSession, PanelAccess, UserProfile } from '../services/api';
import {
  canOpenAdminPanel,
  DASHBOARD_PATH,
  MANAGED_APP_BY_ROLE,
  ROLE_LABELS,
} from '../lib/landing';

const USER_STORAGE_KEY = 'one_unusu_user';

function readCachedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

/**
 * Halaman 403 terpusat.
 *
 * Sebelumnya pengguna yang mencoba membuka panel yang bukan haknya
 * diarahkan diam-diam ke /dashboard sehingga terkesan "tidak terjadi apa-apa".
 * Halaman ini menjelaskan pemisahan peran (admin SSO, admin aplikasi cabang,
 * civitas) sekaligus menawarkan jalur navigasi yang sah.
 */
export const AksesDitolak: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useMemo(() => readCachedUser(), []);
  const [access, setAccess] = useState<PanelAccess | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const deniedPath = searchParams.get('from');
  const requiredPermission = searchParams.get('need');
  const deniedApp = searchParams.get('app');

  useEffect(() => {
    let active = true;

    fetchPanelAccess()
      .then((res) => {
        if (active && res.data.status) setAccess(res.data.data);
      })
      .catch(() => {
        // Halaman tetap informatif tanpa data server.
      });

    return () => {
      active = false;
    };
  }, []);

  const role = access?.role ?? user?.role;
  const roleLabel = role ? ROLE_LABELS[role] ?? role : 'Tidak diketahui';
  const managedApp = role ? MANAGED_APP_BY_ROLE[role] ?? null : null;
  const allowedApps = access?.apps.filter((app) => app.isAllowed) ?? [];
  const isPanelAdmin = access ? access.canOpenAdminPanel : canOpenAdminPanel(user);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutSession();
    } catch {
      // Sesi mungkin sudah berakhir; cache tetap dibersihkan.
    } finally {
      localStorage.removeItem(USER_STORAGE_KEY);
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F2] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-[16px] border border-[#D8E5DC] shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 p-6 border-b border-[#E8EFEA] bg-[#FEF2F2]">
            <div className="w-12 h-12 rounded-[12px] bg-white border border-[#FECACA] text-[#B91C1C] flex items-center justify-center flex-shrink-0">
              <LockClosedIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#B91C1C] text-white">
                403 · AKSES DITOLAK
              </span>
              <h1 className="mt-2 text-lg font-bold text-[#1E293B]">Anda tidak berhak membuka halaman ini</h1>
              <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                Setiap admin di ONE UNUSU hanya mengelola panel dan aplikasi yang menjadi
                kewenangannya. Akun Anda tidak memiliki izin untuk tujuan tersebut.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-[12px] bg-[#F9FDFB] border border-[#D8E5DC]">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Peran Anda
                </span>
                <p className="mt-1 text-sm font-bold text-[#1E293B]">{roleLabel}</p>
                <p className="mt-0.5 text-[11px] text-[#64748B]">
                  {managedApp ? `Mengelola: ${managedApp}` : 'Bukan pengelola panel administrasi'}
                </p>
              </div>

              <div className="p-4 rounded-[12px] bg-[#F9FDFB] border border-[#D8E5DC]">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Tujuan yang ditolak
                </span>
                <p className="mt-1 text-sm font-bold text-[#1E293B] break-words">
                  {deniedApp ?? deniedPath ?? 'Panel administrasi'}
                </p>
                <p className="mt-0.5 text-[11px] text-[#64748B] font-mono break-all">
                  {requiredPermission ? `butuh izin: ${requiredPermission}` : 'di luar kewenangan peran'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3.5 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] leading-relaxed">
              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Admin aplikasi cabang (mis. Admin LPPM) tidak dapat masuk ke panel atau aplikasi
                milik unit lain (mis. LPM). Bila Anda merasa ini keliru, hubungi Administrator
                ONE UNUSU untuk penyesuaian peran.
              </span>
            </div>

            {allowedApps.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                  Aplikasi yang boleh Anda akses
                </p>
                <ul className="flex flex-wrap gap-2">
                  {allowedApps.map((app) => (
                    <li
                      key={app.clientId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      {app.nameApp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-[#E8EFEA]">
              <Link
                to={DASHBOARD_PATH}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-sm transition"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Kembali ke Dashboard
              </Link>

              {isPanelAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-[8px] bg-white hover:bg-[#F0FDF4] text-[#166534] border border-[#D8E5DC] font-semibold text-xs transition"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  Buka Panel Admin
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-[8px] bg-white hover:bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-semibold text-xs transition disabled:opacity-50 sm:ml-auto"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                {isLoggingOut ? 'Keluar...' : 'Keluar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AksesDitolak;
