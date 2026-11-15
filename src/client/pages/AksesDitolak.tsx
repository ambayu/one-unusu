import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  LockClosedIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { fetchPanelAccess, logoutSession, PanelAccess, UserProfile } from '../services/api';
import { PanelPageTemplate } from '../components/templates/PanelPageTemplate';
import { canOpenAdminPanel, DASHBOARD_PATH, ROLE_LABELS } from '../lib/landing';

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
 * Ditampilkan saat akun membuka halaman di luar kewenangannya. Isinya SENGAJA
 * minim: satu pernyataan singkat, dua fakta (peran + tujuan), dan satu tombol
 * utama. Daftar aplikasi yang boleh diakses dan penjelasan panjang tentang
 * pemisahan peran dihapus — pengguna yang salah masuk hanya perlu tahu bahwa
 * halaman itu bukan untuknya, lalu kembali bekerja.
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
        // Halaman tetap terbaca tanpa data server.
      });

    return () => {
      active = false;
    };
  }, []);

  const role = access?.role ?? user?.role;
  const roleLabel = role ? ROLE_LABELS[role] ?? role : 'Tidak diketahui';
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
    <PanelPageTemplate
      badge="Akses Ditolak"
      badgeIcon={LockClosedIcon}
      title="Halaman ini bukan untuk akun Anda"
      description="Akun Anda tidak memiliki izin membuka halaman tersebut."
    >
      {/* Panggung 403: angka besar dengan cincin dan titik yang bergerak lembut.
          Semua animasi memakai transform/opacity saja (bukan width/height) agar
          tetap ringan, dan dimatikan otomatis pada `prefers-reduced-motion`. */}
      <div className="relative overflow-hidden rounded-[12px] border border-[#D8E5DC] bg-gradient-to-br from-[#F0FDF4] via-[#F9FDFB] to-[#FEF2F2] px-4 py-6 flex flex-col items-center justify-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute -top-10 -left-8 w-28 h-28 rounded-full bg-[#DCFCE7]/70 motion-safe:animate-gerakLembut" />
          <span className="absolute -bottom-12 -right-6 w-36 h-36 rounded-full bg-[#FCE7F3]/60 motion-safe:animate-gerakLembut [animation-direction:reverse] [animation-duration:12s]" />
          <span className="absolute top-6 right-10 w-3 h-3 rounded-full bg-[#166534]/25 motion-safe:animate-denyutLembut" />
          <span className="absolute bottom-8 left-12 w-2 h-2 rounded-full bg-[#B91C1C]/25 motion-safe:animate-denyutLembut [animation-duration:5s] [animation-delay:1s]" />
        </div>

        <div className="relative flex items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-[#BBF7D0] motion-safe:animate-denyutCincin"
          />
          <span
            aria-hidden="true"
            className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-[#BBF7D0] motion-safe:animate-denyutCincin [animation-delay:1.75s]"
          />
          <span className="relative text-[64px] sm:text-[76px] font-black leading-none tracking-tighter text-[#166534] [text-shadow:0_4px_16px_rgba(22,101,52,0.18)]">
            403
          </span>
        </div>

        <p className="relative mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">
          Akses Ditolak
        </p>
      </div>

      <dl className="rounded-[12px] border border-[#D8E5DC] bg-white px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-3 py-1">
          <dt className="text-[#64748B]">Tujuan</dt>
          <dd className="font-semibold text-[#1E293B] truncate font-mono text-[11px]">
            {deniedApp ?? deniedPath ?? 'Panel administrasi'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1 border-t border-[#E8F0EB] mt-1 pt-2">
          <dt className="text-[#64748B]">Peran Anda</dt>
          <dd className="font-bold text-[#1E293B] truncate">{roleLabel}</dd>
        </div>
        {requiredPermission && (
          <div className="flex items-center justify-between gap-3 py-1 border-t border-[#E8F0EB] mt-1 pt-2">
            <dt className="text-[#64748B]">Izin dibutuhkan</dt>
            <dd className="font-mono text-[11px] text-[#475569] truncate">{requiredPermission}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Link
          to={DASHBOARD_PATH}
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-sm transition"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>

        {isPanelAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-[8px] bg-white hover:bg-[#F0FDF4] text-[#166534] border border-[#D8E5DC] font-semibold text-xs transition"
          >
            <Squares2X2Icon className="w-4 h-4" />
            Buka Panel Admin
          </Link>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-[8px] text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] font-semibold text-xs transition disabled:opacity-50 sm:ml-auto"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          {isLoggingOut ? 'Keluar...' : 'Keluar'}
        </button>
      </div>
    </PanelPageTemplate>
  );
};

export default AksesDitolak;
