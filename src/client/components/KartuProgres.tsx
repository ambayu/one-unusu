import React from 'react';
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface KartuProgresProps {
  /** Judul kartu, mis. "Kelengkapan Biodata". */
  judul: string;
  /** Satu kalimat penjelas apa yang diukur. */
  keterangan: string;
  /** Ikon di kotak kiri. */
  ikon: React.ElementType;
  /** Pecahan yang sudah terisi dan totalnya. */
  terisi: number;
  total: number;
  /** 0–100. */
  persen: number;
  /** Kalimat ajakan, mis. "Lengkapi biodata agar dapat membuka aplikasi SSO." */
  ajakan: string;
  /** Label tombol aksi. */
  labelAksi: string;
  onAksi: () => void;
  /** Bila true, kartu tampil dalam keadaan "selesai" (hijau, tanpa ajakan). */
  lengkap?: boolean;
}

/**
 * Kartu progres kelengkapan untuk dashboard.
 *
 * Dipakai dua kali pada dashboard (biodata dan dokumen dosen) supaya keduanya
 * tampil seragam: ikon, bar progres berwarna, daftar butir yang kurang, dan
 * satu tombol menuju halaman pelengkapan. Warna berubah mengikuti keadaan —
 * hijau bila lengkap, kuning bila masih ada yang kurang.
 */
export const KartuProgres: React.FC<KartuProgresProps> = ({
  judul,
  keterangan,
  ikon: Ikon,
  terisi,
  total,
  persen,
  ajakan,
  labelAksi,
  onAksi,
  lengkap = false,
}) => (
  <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-5 sm:p-6 shadow-sm flex flex-col">
    <div className="flex items-start gap-3">
      <div
        className={`w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
          lengkap ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#B45309]'
        }`}
      >
        {lengkap ? <CheckCircleIcon className="w-5 h-5" /> : <Ikon className="w-5 h-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-[#1E293B]">{judul}</h3>
        <p className="text-[11.5px] text-[#64748B] leading-relaxed mt-0.5">{keterangan}</p>
      </div>

      <span
        className={`text-sm font-bold flex-shrink-0 tabular-nums ${
          lengkap ? 'text-[#166534]' : 'text-[#B45309]'
        }`}
      >
        {persen}%
      </span>
    </div>

    <div className="mt-3.5">
      <div className="w-full h-2 bg-[#E8F0EB] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${lengkap ? 'bg-[#166534]' : 'bg-[#B45309]'}`}
          style={{ width: `${persen}%` }}
        />
      </div>
      <p className="text-[11px] text-[#64748B] mt-1.5">
        {terisi} dari {total} terisi
      </p>
    </div>

    {lengkap ? (
      <p className="mt-3 text-[11.5px] font-semibold text-[#166534]">
        Semua data sudah lengkap. Terima kasih.
      </p>
    ) : (
      <p className="mt-3 text-[11.5px] text-[#475569] leading-relaxed flex-1">{ajakan}</p>
    )}

    <div className="mt-4">
      <button
        type="button"
        onClick={onAksi}
        className={`w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-[8px] text-xs font-semibold transition ${
          lengkap
            ? 'bg-white border border-[#D8E5DC] text-[#475569] hover:bg-[#F1F5F2]'
            : 'bg-[#166534] hover:bg-[#14532D] text-white shadow-sm'
        }`}
      >
        {labelAksi}
        <ArrowRightIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export default KartuProgres;
