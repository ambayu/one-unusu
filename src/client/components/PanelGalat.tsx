import React from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface PanelGalatProps {
  /** Judul ringkas, mis. "Gagal Memuat Data". */
  judul: string;
  /** Penjelasan satu-dua kalimat: apa yang gagal dan apa yang bisa dilakukan. */
  pesan: string;
  /** Tombol "Coba Lagi". Bila tidak diisi, tombol tidak ditampilkan. */
  onCobaLagi?: () => void;
  /** Nonaktifkan tombol selama permintaan ulang berjalan. */
  sedangMemuat?: boolean;
  /** Slot aksi tambahan, mis. tautan ke halaman lain. */
  aksi?: React.ReactNode;
}

/**
 * Panel galat di dalam halaman — pengganti popup untuk kegagalan memuat data.
 *
 * Alasan dibuat komponen: kegagalan memuat adalah keadaan yang MENETAP sampai
 * pengguna mencoba lagi, sedangkan `NotificationModal` bersifat sementara dan
 * menutupi isi halaman. Menaruh galat di dalam alur halaman membuat konteks
 * (halaman mana yang gagal) tetap terlihat dan tombol "Coba Lagi" selalu
 * terjangkau tanpa perlu membuka ulang popup.
 *
 * Tampilannya memakai skala panel yang sama: kartu `rounded-[12px]` bergaris
 * `#FECACA` bernuansa merah lembut, ikon 9×9, dan padding `px-4 py-3` agar
 * sejajar dengan kartu lain di halaman.
 */
export const PanelGalat: React.FC<PanelGalatProps> = ({
  judul,
  pesan,
  onCobaLagi,
  sedangMemuat = false,
  aksi,
}) => (
  <div
    role="alert"
    className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
  >
    <div className="flex items-start gap-3 min-w-0 flex-1">
      <div className="w-9 h-9 rounded-[10px] bg-white border border-[#FECACA] text-[#B91C1C] flex items-center justify-center flex-shrink-0">
        <ExclamationTriangleIcon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#B91C1C]">{judul}</p>
        <p className="text-xs text-[#92400E] leading-relaxed mt-0.5">{pesan}</p>
      </div>
    </div>

    {(onCobaLagi || aksi) && (
      <div className="flex items-center gap-2 flex-shrink-0 sm:pl-3">
        {aksi}
        {onCobaLagi && (
          <button
            type="button"
            onClick={onCobaLagi}
            disabled={sedangMemuat}
            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 rounded-[8px] bg-white border border-[#FECACA] text-[#B91C1C] text-xs font-semibold hover:bg-[#FEF2F2] transition disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${sedangMemuat ? 'animate-spin' : ''}`} />
            {sedangMemuat ? 'Memuat...' : 'Coba Lagi'}
          </button>
        )}
      </div>
    )}
  </div>
);

export default PanelGalat;
