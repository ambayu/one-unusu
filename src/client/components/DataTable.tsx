import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { OPSI_PER_HALAMAN, usePagination } from '../lib/usePagination';

/**
 * Satu kolom pada DataTable.
 *
 * Kolom digambarkan sebagai data, bukan ditulis sebagai JSX di setiap halaman.
 * Dengan begitu kerangka tabel, jarak, ukuran huruf, dan perilaku responsif
 * hanya diatur di satu tempat.
 */
export interface KolomTabel<T> {
  /** Kunci unik kolom; dipakai React sebagai key. */
  key: string;
  /** Judul yang tampil di kepala tabel. */
  judul: React.ReactNode;
  /** Menggambar isi sel untuk satu baris. */
  sel: (baris: T, indeks: number) => React.ReactNode;
  /** Kelas tambahan untuk <th> dan <td>, mis. lebar atau perataan. */
  kelas?: string;
  /** Rata tengah untuk kolom aksi. */
  rataTengah?: boolean;
  /** Sembunyikan kolom pada layar sempit tanpa menghapusnya dari data. */
  sembunyikanDiPonsel?: boolean;
}

export interface DataTableProps<T> {
  kolom: KolomTabel<T>[];
  data: T[];
  /** Kunci unik tiap baris; wajib agar React tidak salah memasangkan baris. */
  kunciBaris: (baris: T) => string | number;
  /** Isi tampilan saat data kosong. Bila tidak diisi, dipakai pesan bawaan. */
  kosong?: React.ReactNode;
  /** Aktifkan pagination. Bila false, seluruh baris ditampilkan sekaligus. */
  berpaginasi?: boolean;
  perHalamanAwal?: number;
  /** Teks ringkasan di kiri bawah, mis. "Menampilkan 1-10 dari 42 pengguna". */
  labelRingkasan?: (dari: number, sampai: number, total: number) => string;
  /** Lebar minimum tabel agar kolom tidak berhimpitan di layar kecil. */
  lebarMinimal?: string;
  /** Baris diklik (opsional). */
  onBarisKlik?: (baris: T) => void;
  /**
   * Tampilkan kolom "No." di paling kiri. Bawaan: aktif.
   *
   * Nomornya melanjutkan antar halaman (halaman 2 dimulai dari 11, bukan 1),
   * karena dihitung dari posisi baris pada data utuh - bukan dari indeks
   * potongan halaman.
   */
  tampilkanNomor?: boolean;
  /** Judul kolom nomor. */
  judulNomor?: string;
}

/**
 * Daftar nomor halaman yang ditampilkan, dengan elipsis bila terlalu banyak.
 * Selalu menampilkan halaman pertama, terakhir, dan tetangga halaman aktif.
 */
function nomorHalaman(halaman: number, totalHalaman: number): (number | '...')[] {
  if (totalHalaman <= 7) {
    return Array.from({ length: totalHalaman }, (_, i) => i + 1);
  }
  const hasil: (number | '...')[] = [1];
  const mulai = Math.max(2, halaman - 1);
  const akhir = Math.min(totalHalaman - 1, halaman + 1);

  if (mulai > 2) hasil.push('...');
  for (let i = mulai; i <= akhir; i += 1) hasil.push(i);
  if (akhir < totalHalaman - 1) hasil.push('...');
  hasil.push(totalHalaman);
  return hasil;
}

/**
 * Tabel data standar panel admin.
 *
 * Dipakai sebagai acuan seluruh tabel agar tampilannya seragam: kepala tabel
 * hijau, garis pemisah lembut, keadaan kosong terpusat, dan pagination di kaki
 * tabel. Halaman cukup mendeklarasikan kolom dan isinya.
 */
export function DataTable<T>({
  kolom,
  data,
  kunciBaris,
  kosong,
  berpaginasi = true,
  perHalamanAwal,
  labelRingkasan,
  lebarMinimal = '720px',
  onBarisKlik,
  tampilkanNomor = true,
  judulNomor = 'No.',
}: DataTableProps<T>): React.ReactElement {
  const paginasi = usePagination(data, { perHalaman: perHalamanAwal });
  const baris = berpaginasi ? paginasi.barisHalaman : data;
  const jumlahKolom = kolom.length + (tampilkanNomor ? 1 : 0);

  // Nomor urut melanjutkan antar halaman. `paginasi.dari` adalah nomor posisi
  // baris pertama pada halaman aktif (berbasis 1); untuk tabel tanpa pagination
  // nilainya tidak dipakai karena `dari` tetap 1 dan baris = seluruh data.
  const nomorAwal = berpaginasi ? paginasi.dari : 1;

  const ringkasan =
    labelRingkasan?.(paginasi.dari, paginasi.sampai, paginasi.total) ??
    `Menampilkan ${paginasi.dari}-${paginasi.sampai} dari ${paginasi.total} baris`;

  return (
    <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-sm overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs" style={{ minWidth: lebarMinimal }}>
          <thead className="bg-[#F0FDF4] border-b border-[#D8E5DC] text-[#166534]">
            <tr>
              {tampilkanNomor && (
                <th
                  scope="col"
                  className="py-3 px-4 text-[12.5px] font-bold tracking-wide whitespace-nowrap text-center w-[56px]"
                >
                  {judulNomor}
                </th>
              )}
              {kolom.map((k) => (
                <th
                  key={k.key}
                  scope="col"
                  className={`py-3 px-4 text-[12.5px] font-bold tracking-wide whitespace-nowrap ${
                    k.rataTengah ? 'text-center' : ''
                  } ${k.sembunyikanDiPonsel ? 'hidden md:table-cell' : ''} ${k.kelas ?? ''}`}
                >
                  {k.judul}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E5DC]/50">
            {baris.length === 0 ? (
              <tr>
                <td colSpan={jumlahKolom} className="py-10 text-center">
                  {kosong ?? (
                    <p className="text-xs font-semibold text-[#475569]">Belum ada data</p>
                  )}
                </td>
              </tr>
            ) : (
              baris.map((item, indeks) => (
                <tr
                  key={kunciBaris(item)}
                  onClick={onBarisKlik ? () => onBarisKlik(item) : undefined}
                  className={`transition-colors ${
                    onBarisKlik ? 'cursor-pointer ' : ''
                  }hover:bg-[#F0FDF4]`}
                >
                  {tampilkanNomor && (
                    <td className="py-3 px-4 text-center text-[11.5px] font-semibold text-[#94A3B8] tabular-nums">
                      {nomorAwal + indeks}
                    </td>
                  )}
                  {kolom.map((k) => (
                    <td
                      key={k.key}
                      className={`py-3 px-4 ${k.rataTengah ? 'text-center' : ''} ${
                        k.sembunyikanDiPonsel ? 'hidden md:table-cell' : ''
                      } ${k.kelas ?? ''}`}
                    >
                      {k.sel(item, indeks)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {berpaginasi && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-[#D8E5DC] bg-[#F8FAF9]">
          <span className="text-[11px] text-[#64748B]" role="status" aria-live="polite">
            {ringkasan}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-[11px] text-[#64748B]">
              <span>Baris</span>
              <select
                value={paginasi.perHalaman}
                onChange={(e) => paginasi.setPerHalaman(Number(e.target.value))}
                aria-label="Jumlah baris per halaman"
                className="px-2 py-1 text-[11.5px] font-semibold bg-white border border-[#D8E5DC] rounded-[7px] text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
              >
                {OPSI_PER_HALAMAN.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <nav className="inline-flex items-center gap-1" aria-label="Navigasi halaman">
              <button
                type="button"
                onClick={() => paginasi.setHalaman(paginasi.halaman - 1)}
                disabled={paginasi.halaman <= 1}
                aria-label="Halaman sebelumnya"
                className="p-1.5 rounded-[7px] border border-[#D8E5DC] bg-white text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#475569] transition"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
              </button>

              {nomorHalaman(paginasi.halaman, paginasi.totalHalaman).map((n, i) =>
                n === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-[#94A3B8]">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => paginasi.setHalaman(n)}
                    aria-current={n === paginasi.halaman ? 'page' : undefined}
                    aria-label={`Halaman ${n}`}
                    className={`min-w-[28px] h-[28px] px-1.5 rounded-[7px] text-[11.5px] font-semibold border transition ${
                      n === paginasi.halaman
                        ? 'bg-[#166534] text-white border-[#166534]'
                        : 'bg-white text-[#475569] border-[#D8E5DC] hover:bg-[#F0FDF4] hover:text-[#166534]'
                    }`}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => paginasi.setHalaman(paginasi.halaman + 1)}
                disabled={paginasi.halaman >= paginasi.totalHalaman}
                aria-label="Halaman berikutnya"
                className="p-1.5 rounded-[7px] border border-[#D8E5DC] bg-white text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#475569] transition"
              >
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
