import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowPathIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { getSsoRedirectV2 } from '../services/api';

/**
 * Titik masuk SSO dari aplikasi cabang.
 * Aplikasi cabang mengarahkan pengguna ke /authorize?client_id=... lalu
 * halaman ini meminta tiket sekali pakai ke server dan meneruskan pengguna ke
 * callback aplikasi tujuan. Tanpa alur ini, pengguna hanya berhenti di panel
 * portal dan tidak pernah kembali ke aplikasi asal.
 */
export const SsoAuthorize: React.FC = () => {
  const [params] = useSearchParams();
  const clientId = params.get('client_id')?.trim() ?? '';
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setError('Parameter client_id tidak ditemukan pada tautan masuk.');
      return;
    }

    let cancelled = false;

    const authorize = async () => {
      try {
        const res = await getSsoRedirectV2(clientId);
        if (!res.data.status || !res.data.redirectUrl) {
          throw new Error(res.data.message || 'Gagal menerbitkan tiket SSO.');
        }
        if (!cancelled) {
          window.location.replace(res.data.redirectUrl);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        // Sesi portal belum ada: lanjutkan ke login lalu kembali ke halaman ini.
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          const next = `/authorize?client_id=${encodeURIComponent(clientId)}`;
          window.location.replace(`${import.meta.env.BASE_URL}login?next=${encodeURIComponent(next)}`);
          return;
        }

        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setIsAccessDenied(true);
          setError('Akses ditolak. Anda tidak memiliki akses ke aplikasi ini.');
          return;
        }

        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || 'Gagal menghubungkan ke aplikasi tujuan.'
            : err instanceof Error
              ? err.message
              : 'Gagal menghubungkan ke aplikasi tujuan.'
        );
      }
    };

    authorize();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="min-h-screen bg-[#F1F5F2] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-[20px] border border-[#D8E5DC] shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-[#166534]" />
        {error ? (
          <>
            <div className="bg-[#F0FDF4] border-b border-[#D8E5DC] px-6 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6 flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[16px] bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] flex items-center justify-center flex-shrink-0 shadow-2xs">
                <ShieldExclamationIcon className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 text-left">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-[8px] text-[11px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                  Keamanan SSO UNUSU
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold text-[#1E293B] tracking-tight">
                  {isAccessDenied ? 'Akses Ditolak' : 'Tidak Bisa Masuk ke Aplikasi'}
                </h1>
              </div>
            </div>
            <div className="px-6 py-6 sm:px-8 sm:py-7 text-left">
              <p className="text-sm sm:text-[15px] text-[#475569] leading-relaxed font-medium">
                {error}
              </p>
            </div>
            <div className="px-6 py-4 sm:px-8 sm:py-5 bg-[#F1F5F2]/70 border-t border-[#E8EFEA] flex flex-col sm:flex-row sm:justify-end gap-2.5">
              <Link
                to="/login"
                className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-[10px] border border-[#D8E5DC] bg-white hover:bg-[#F0FDF4] text-[#475569] text-sm font-semibold transition"
              >
                Masuk dengan Akun Lain
              </Link>
              <Link
                to="/dashboard"
                className="min-h-[44px] inline-flex items-center justify-center px-6 py-2.5 rounded-[10px] bg-[#166534] hover:bg-[#14532D] text-white text-sm font-bold shadow-xs transition"
              >
                Kembali ke Portal ONE UNUSU
              </Link>
            </div>
          </>
        ) : (
          <div className="p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-[16px] bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] mx-auto flex items-center justify-center mb-4">
              <ArrowPathIcon className="w-8 h-8 animate-spin" aria-hidden="true" />
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#1E293B]">Menghubungkan Akun</h1>
            <p className="mt-2 text-sm text-[#475569] leading-relaxed">
              Mohon tunggu, sesi ONE UNUSU Anda sedang diteruskan ke aplikasi tujuan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SsoAuthorize;
