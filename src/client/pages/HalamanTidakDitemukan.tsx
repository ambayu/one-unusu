import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { PanelPageTemplate } from '../components/templates/PanelPageTemplate';
import { DASHBOARD_PATH } from '../lib/landing';

/**
 * Halaman 404 — rute tidak ditemukan.
 *
 * Sebelumnya rute tak dikenal langsung dialihkan diam-diam ke beranda
 * (`<Navigate to="/" />`), sehingga pengguna yang salah ketik tautan terkesan
 * "dilempar" tanpa penjelasan. Halaman ini menjelaskan apa yang terjadi dan
 * menawarkan jalan keluar, memakai kerangka panel yang sama dengan halaman lain.
 */
export const HalamanTidakDitemukan: React.FC = () => {
  return (
    <PanelPageTemplate
      badge="Halaman Tidak Ditemukan"
      badgeIcon={QuestionMarkCircleIcon}
      title="Halaman yang Anda cari tidak ada"
      description="Alamat yang dibuka mungkin salah ketik, sudah dipindahkan, atau tidak tersedia untuk akun Anda."
    >
      <div className="rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 flex items-start gap-2.5">
        <MagnifyingGlassIcon className="w-4 h-4 text-[#B45309] flex-shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-[#92400E]">404 · TIDAK DITEMUKAN</p>
      </div>

      <div className="rounded-[12px] border border-[#D8E5DC] bg-[#F9FDFB] px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
          Yang dapat Anda lakukan
        </span>
        <ul className="mt-1.5 space-y-1 text-xs text-[#475569] leading-relaxed">
          <li>Periksa kembali alamat pada bilah alamat peramban Anda.</li>
          <li>Kembali ke dashboard lalu buka halaman melalui menu sidebar.</li>
          <li>Bila tautan berasal dari aplikasi cabang, minta tautan baru ke unit terkait.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          to={DASHBOARD_PATH}
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-sm transition"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-[8px] bg-white hover:bg-[#F0FDF4] text-[#166534] border border-[#D8E5DC] font-semibold text-xs transition"
        >
          Halaman Depan
        </Link>
      </div>
    </PanelPageTemplate>
  );
};

export default HalamanTidakDitemukan;
