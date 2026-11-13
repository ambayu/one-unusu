import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Pilihan jumlah baris per halaman yang ditawarkan ke pengguna.
 * Dibatasi pada nilai yang wajar supaya tabel tetap terbaca.
 */
export const OPSI_PER_HALAMAN = [10, 25, 50, 100] as const;

export const PER_HALAMAN_BAWAAN = 10;

export interface HasilPagination<T> {
  /** Baris yang boleh ditampilkan pada halaman aktif. */
  barisHalaman: T[];
  /** Total baris setelah difilter (bukan total keseluruhan). */
  total: number;
  /** Halaman aktif, dimulai dari 1. Selalu dijepit ke rentang yang sah. */
  halaman: number;
  /** Jumlah halaman; minimal 1 agar tampilan tidak pernah "halaman 0 dari 0". */
  totalHalaman: number;
  perHalaman: number;
  /** Indeks baris pertama & terakhir pada halaman aktif (berbasis 1) untuk teks ringkasan. */
  dari: number;
  sampai: number;
  setHalaman: (n: number) => void;
  setPerHalaman: (n: number) => void;
  /** Kembali ke halaman 1; dipakai saat filter/pencarian berubah. */
  resetHalaman: () => void;
}

/**
 * Memotong daftar menjadi halaman.
 *
 * Perilaku penting yang sengaja dipilih:
 * - Saat filter berubah, jumlah baris menyusut. Tanpa penjepitan, pengguna bisa
 *   terdampar di halaman 5 yang sudah tidak ada isinya. Karena itu `halaman`
 *   selalu dijepit ke `totalHalaman`.
 * - Saat `perHalaman` diubah, halaman dipertahankan selama masih sah agar
 *   pengguna tidak terlempar ke awal setiap kali mengganti ukuran halaman.
 */
export function usePagination<T>(
  data: T[],
  opsiAwal: { perHalaman?: number } = {}
): HasilPagination<T> {
  const [halaman, setHalamanMentah] = useState(1);
  const [perHalaman, setPerHalamanMentah] = useState<number>(
    opsiAwal.perHalaman ?? PER_HALAMAN_BAWAAN
  );

  const total = data.length;
  // Nilai per-halaman yang tidak sah (0 atau negatif) akan membuat pembagian
  // oleh nol dan ringkasan "Menampilkan 1-0". Dijaga di sini, bukan hanya di
  // setter, supaya nilai awal dari props pun tidak bisa merusaknya.
  const perHalamanSah = Number.isFinite(perHalaman) && perHalaman > 0 ? Math.trunc(perHalaman) : 1;
  const totalHalaman = Math.max(1, Math.ceil(total / perHalamanSah));

  // Jepit halaman aktif agar tidak pernah menunjuk halaman kosong. Dilakukan
  // saat render (bukan lewat efek) supaya tidak ada satu frame pun yang
  // menampilkan tabel kosong kepada pengguna.
  const halamanSah = Math.min(Math.max(1, halaman), totalHalaman);

  // Sinkronkan state bila penjepitan mengubah nilainya, agar tombol
  // "berikutnya/sebelumnya" membaca angka yang sama dengan yang ditampilkan.
  useEffect(() => {
    if (halaman !== halamanSah) setHalamanMentah(halamanSah);
  }, [halaman, halamanSah]);

  const setHalaman = useCallback((n: number) => {
    setHalamanMentah(Number.isFinite(n) ? Math.trunc(n) : 1);
  }, []);

  const setPerHalaman = useCallback((n: number) => {
    if (Number.isFinite(n) && n > 0) setPerHalamanMentah(Math.trunc(n));
  }, []);

  const resetHalaman = useCallback(() => setHalamanMentah(1), []);

  const barisHalaman = useMemo(() => {
    const mulai = (halamanSah - 1) * perHalamanSah;
    return data.slice(mulai, mulai + perHalamanSah);
  }, [data, halamanSah, perHalamanSah]);

  const dari = total === 0 ? 0 : (halamanSah - 1) * perHalamanSah + 1;
  const sampai = Math.min(halamanSah * perHalamanSah, total);

  return {
    barisHalaman,
    total,
    halaman: halamanSah,
    totalHalaman,
    perHalaman: perHalamanSah,
    dari,
    sampai,
    setHalaman,
    setPerHalaman,
    resetHalaman,
  };
}
