import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
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

  // Selama belum ada error, tugas halaman ini murni menerbitkan tiket lalu
  // meneruskan pengguna. Durasinya sangat singkat (satu panggilan API internal),
  // jadi SENGAJA hanya latar polos berwarna brand — tanpa logo, tanpa teks,
  // tanpa animasi.
  //
  // Alasannya: layar loading bernuansa lengkap (logo + judul + titik berdenyut)
  // yang muncul lalu hilang dalam sepersekian detik justru terbaca sebagai
  // kedipan/kerusakan. Latar polos membuat transisinya tidak terasa sebagai
  // layar tersendiri, sementara halaman login dan callback tetap memakai
  // `SsoLoadingScreen` lengkap karena keduanya memang menunggu jaringan nyata.
  if (!error) {
    return <div aria-hidden="true" className="min-h-screen w-full bg-[#0B2E1C]" />;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F2] px-4 py-8 sm:px-6">
      <div className="w-full">
        <div className="w-full bg-white rounded-[16px] border border-[#D8E5DC] shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 px-5 py-4 sm:px-6 border-b border-[#E8EFEA]">
            <div className="w-10 h-10 rounded-[10px] bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] flex items-center justify-center flex-shrink-0">
              <ShieldExclamationIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                Keamanan SSO UNUSU
              </span>
              <h1 className="mt-1.5 text-lg font-bold text-[#1E293B]">
                {isAccessDenied ? 'Akses Ditolak' : 'Tidak Bisa Masuk ke Aplikasi'}
              </h1>
            </div>
          </div>

          <div className="px-5 py-4 sm:px-6">
            <p className="text-sm text-[#475569] leading-relaxed">{error}</p>
          </div>

          <div className="px-5 py-4 sm:px-6 border-t border-[#E8EFEA] bg-[#F8FAF9] flex flex-col sm:flex-row sm:justify-end gap-2">
            <Link
              to="/"
              data-testid="link-kembali-beranda"
              className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[8px] border border-[#D8E5DC] bg-white hover:bg-[#F0FDF4] text-[#475569] text-xs font-semibold transition"
            >
              Halaman Depan
            </Link>
            <Link
              to="/login"
              data-testid="link-login-ulang"
              className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[8px] border border-[#D8E5DC] bg-white hover:bg-[#F0FDF4] text-[#475569] text-xs font-semibold transition"
            >
              Masuk dengan Akun Lain
            </Link>
            <Link
              to="/dashboard"
              data-testid="link-kembali-dashboard"
              className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold shadow-sm transition"
            >
              Kembali ke Portal ONE UNUSU
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SsoAuthorize;
