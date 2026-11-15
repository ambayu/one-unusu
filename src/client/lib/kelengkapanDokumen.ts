import type { DosenBerkasItem, DosenBerkasTipeItem } from '../services/api';

export interface RingkasanDokumen {
  /** Jumlah JENIS berkas yang aktif di sistem. */
  totalJenis: number;
  /** Jumlah JENIS yang sudah punya minimal satu berkas terunggah. */
  jenisTerisi: number;
  /** 0–100, dibulatkan. */
  persen: number;
  /** Berkas wajib yang belum diunggah (khusus jenis berstatus `isRequired`). */
  wajibKurang: DosenBerkasTipeItem[];
  /** Jenis opsional yang belum diunggah — dipakai sebagai saran pelengkapan. */
  opsionalKurang: DosenBerkasTipeItem[];
  /** Jumlah baris berkas (satu jenis bisa diunggah lebih dari sekali). */
  totalBerkas: number;
  lengkap: boolean;
}

/**
 * Menghitung kelengkapan dokumen dosen dari daftar jenis berkas.
 *
 * Kelengkapan dihitung per JENIS, bukan per baris: satu jenis dapat diunggah
 * berkali-kali (mis. perpanjangan SK), sehingga menghitung baris akan membuat
 * angka melebihi jumlah jenis yang tersedia. Aturan ini sama dengan yang
 * dipakai panel monitoring admin.
 *
 * `berkasList` hanya dipakai untuk menghitung jumlah baris; status terisi per
 * jenis dibaca dari `tipe.sudahDiunggah` yang sudah dihitung server.
 */
export function ringkasDokumenDosen(
  tipeList: DosenBerkasTipeItem[],
  berkasList: DosenBerkasItem[]
): RingkasanDokumen {
  const totalJenis = tipeList.length;
  const terisi = tipeList.filter((t) => t.sudahDiunggah);
  const jenisTerisi = terisi.length;

  const wajibKurang = tipeList.filter((t) => t.isRequired && !t.sudahDiunggah);
  const opsionalKurang = tipeList.filter((t) => !t.isRequired && !t.sudahDiunggah);

  return {
    totalJenis,
    jenisTerisi,
    persen: totalJenis ? Math.round((jenisTerisi / totalJenis) * 100) : 0,
    wajibKurang,
    opsionalKurang,
    totalBerkas: berkasList.length,
    lengkap: totalJenis > 0 && jenisTerisi === totalJenis,
  };
}
