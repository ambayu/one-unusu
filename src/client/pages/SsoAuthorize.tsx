import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getSsoRedirectV2 } from '../services/api';

/**
 * Titik masuk SSO dari aplikasi cabang.
 * Aplikasi cabang mengarahkan pengguna ke /sso/authorize?client_id=... lalu
 * halaman ini meminta tiket sekali pakai ke server dan meneruskan pengguna ke
 * callback aplikasi tujuan. Tanpa alur ini, pengguna hanya berhenti di panel
 * portal dan tidak pernah kembali ke aplikasi asal.
 */
export const SsoAuthorize: React.FC = () => {
  const [params] = useSearchParams();
  const clientId = params.get('client_id')?.trim() ?? '';
  const [error, setError] = useState<string | null>(null);

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
          const next = `/sso/authorize?client_id=${encodeURIComponent(clientId)}`;
          window.location.replace(`/login?next=${encodeURIComponent(next)}`);
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
    <div className="min-h-screen bg-[#F7F5EF] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-[20px] border border-[#E4DFD2] shadow-sm p-8 text-center">
        {error ? (
          <>
            <div className="w-14 h-14 rounded-[16px] bg-[#FBEAEA] text-[#B3261E] mx-auto flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-bold text-[#1E2A24]">Tidak Bisa Masuk ke Aplikasi</h1>
            <p className="mt-2 text-sm text-[#5B6B62] leading-relaxed">{error}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/dashboard"
                className="w-full py-2.5 rounded-[12px] bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold transition"
              >
                Buka Portal ONE UNUSU
              </Link>
              <Link
                to="/login"
                className="w-full py-2.5 rounded-[12px] border border-[#E4DFD2] text-[#3A5544] text-sm font-semibold hover:bg-[#F4F1E8] transition"
              >
                Masuk dengan akun lain
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-[16px] bg-[#E8F3EC] text-[#166534] mx-auto flex items-center justify-center mb-4">
              <ArrowPathIcon className="w-7 h-7 animate-spin" />
            </div>
            <h1 className="text-lg font-bold text-[#1E2A24]">Menghubungkan Akun</h1>
            <p className="mt-2 text-sm text-[#5B6B62] leading-relaxed">
              Mohon tunggu, sesi ONE UNUSU Anda sedang diteruskan ke aplikasi tujuan.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SsoAuthorize;
