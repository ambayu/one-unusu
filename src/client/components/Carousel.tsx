import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface CarouselProps {
  /** Jumlah item; dipakai untuk menghitung batas geser. */
  jumlahItem: number;
  /** Isi carousel - biasanya daftar kartu yang dirender pemanggil. */
  children: React.ReactNode;
  /** Label untuk pembaca layar, mis. "Aplikasi SSO". */
  label: string;
  /** Sembunyikan panah bila item sedikit. */
  tampilkanKontrol?: boolean;
}

/** Jarak gerak (px) sebelum sebuah gestur dianggap "menyeret", bukan "mengeklik". */
const AMBANG_SERET = 5;

/**
 * Carousel mendatar yang isinya bisa diseret ke kiri/kanan, plus tombol panah.
 *
 * Catatan perilaku:
 * - Menggeser memakai `scrollLeft`, bukan `transform`, sehingga tetap bisa
 *   di-swipe di layar sentuh dan trackpad tanpa kode tambahan.
 * - **`scroll-smooth` dimatikan sementara saat menyeret.** Ini penting: dengan
 *   smooth aktif, setiap perubahan `scrollLeft` dianimasikan sehingga kartu
 *   tertinggal dari kursor dan seret terasa "berat"/tidak menempel.
 * - Pendengar `mousemove`/`mouseup` dipasang di `window`, bukan hanya di area
 *   carousel, supaya seret tetap berlanjut walau kursor keluar dari kotak.
 * - Klik dibatalkan bila gestur berubah menjadi seret, agar menyeret tidak
 *   ikut membuka aplikasi.
 * - Panah dinonaktifkan (bukan disembunyikan) saat sudah mentok, agar tata
 *   letak tidak bergeser.
 */
export const Carousel: React.FC<CarouselProps> = ({
  jumlahItem,
  children,
  label,
  tampilkanKontrol = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [bisaKiri, setBisaKiri] = useState(false);
  const [bisaKanan, setBisaKanan] = useState(false);
  const [sedangSeret, setSedangSeret] = useState(false);

  // Status tombol dihitung dari posisi scroll nyata, bukan dari indeks halaman.
  // Dengan begitu tetap benar walau lebar kartu berubah karena responsif.
  const perbaruiStatus = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const sisa = el.scrollWidth - el.clientWidth;
    setBisaKiri(el.scrollLeft > 4);
    setBisaKanan(sisa > 4 && el.scrollLeft < sisa - 4);
  }, []);

  useEffect(() => {
    perbaruiStatus();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', perbaruiStatus, { passive: true });
    window.addEventListener('resize', perbaruiStatus);
    return () => {
      el.removeEventListener('scroll', perbaruiStatus);
      window.removeEventListener('resize', perbaruiStatus);
    };
  }, [perbaruiStatus, jumlahItem]);

  /** Menggeser satu "halaman" selebar area pandang. */
  const geser = (arah: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: arah * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  // --- Tarik-geser ---
  // `x` = posisi kursor saat mulai, `scroll` = posisi scroll saat mulai,
  // `dipindah` = penanda bahwa gestur ini sudah melewati ambang seret.
  const seret = useRef({ aktif: false, x: 0, scroll: 0, dipindah: false });

  /**
   * Mencegah klik "bocor" setelah menyeret.
   *
   * Dipasang sebagai pendengar `click` pada fase **capture** di window, lalu
   * dilepas pada tick berikutnya. Cara ini lebih andal daripada `onClickCapture`
   * di React, karena beberapa elemen (mis. tautan dengan `target="_blank"`)
   * sudah membuka tab sebelum handler React sempat membatalkannya.
   */
  const cegahKlikSesudahSeret = () => {
    const pembatal = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('click', pembatal, { capture: true, once: true });
    // Bila tidak ada klik yang datang, lepaskan pendengar agar tidak menumpuk.
    setTimeout(() => {
      window.removeEventListener('click', pembatal, { capture: true });
    }, 0);
  };

  useEffect(() => {
    if (!sedangSeret) return;

    const onMouseMove = (e: MouseEvent) => {
      const el = ref.current;
      const s = seret.current;
      if (!el || !s.aktif) return;
      const dx = e.pageX - s.x;
      if (Math.abs(dx) > AMBANG_SERET) s.dipindah = true;
      el.scrollLeft = s.scroll - dx;
    };

    const onMouseUp = () => {
      const s = seret.current;
      s.aktif = false;
      setSedangSeret(false);
      if (s.dipindah) cegahKlikSesudahSeret();
    };

    // `passive: false` supaya `preventDefault` di bawah berpengaruh.
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [sedangSeret]);

  const onMouseDown = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    // Hanya tombol kiri. Klik kanan / tombol tengah dibiarkan apa adanya.
    if (e.button !== 0) return;

    // Batalkan seleksi teks dan drag-and-drop bawaan (mis. pada <img>).
    e.preventDefault();

    seret.current = { aktif: true, x: e.pageX, scroll: el.scrollLeft, dipindah: false };
    setSedangSeret(true);
  };

  const tampilKontrol = tampilkanKontrol && jumlahItem > 1;

  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        onMouseDown={onMouseDown}
        // `select-none` mencegah teks ikut terseleksi saat menyeret.
        // `scroll-smooth` sengaja TIDAK dipakai di sini; kelas itu ditambahkan
        // hanya saat tidak menyeret, karena animasinya membuat kartu tertinggal
        // dari kursor.
        className={`flex gap-5 overflow-x-auto pb-1 select-none ${
          sedangSeret ? 'cursor-grabbing' : 'cursor-grab scroll-smooth'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {children}
      </div>

      {tampilKontrol && (
        <>
          <button
            type="button"
            onClick={() => geser(-1)}
            disabled={!bisaKiri}
            aria-label={`Geser ${label} ke kiri`}
            className="hidden sm:inline-flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 items-center justify-center w-9 h-9 rounded-full bg-white border border-[#D8E5DC] text-[#166534] shadow-md transition hover:bg-[#F0FDF4] disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => geser(1)}
            disabled={!bisaKanan}
            aria-label={`Geser ${label} ke kanan`}
            className="hidden sm:inline-flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 items-center justify-center w-9 h-9 rounded-full bg-white border border-[#D8E5DC] text-[#166534] shadow-md transition hover:bg-[#F0FDF4] disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};
