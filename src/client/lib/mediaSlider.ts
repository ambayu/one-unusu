/**
 * Utilitas media slider hero — dipakai panel admin dan halaman publik.
 *
 * MENGAPA BERKAS, BUKAN BASE64
 * ----------------------------
 * Versi lama membaca berkas dengan `FileReader.readAsDataURL()` lalu menyimpan
 * hasilnya (string `data:image/jpeg;base64,...`) langsung ke kolom database.
 * Cara itu tidak dapat dipakai untuk video:
 *
 *   1. Base64 membengkak sekitar 33% dibanding berkas aslinya, sehingga video
 *      berdurasi pendek saja menjadi belasan megabyte teks di dalam satu baris.
 *   2. `GET /api/sliders` mengembalikan SELURUH slide sekaligus, sehingga
 *      beranda publik menarik puluhan megabyte sebelum halaman tampil.
 *   3. Kolom `VarChar` pada aplikasi lain memotong data tanpa galat yang jelas.
 *
 * Karena itu media kini diunggah sebagai berkas: server menulisnya ke
 * `public/storage/slider/` dan yang disimpan di kolom hanya **path**-nya
 * (`/storage/slider/abc123.mp4`). Skema database tidak berubah.
 *
 * Data lama yang masih berupa base64 TETAP terbaca: `sumberMedia()` meneruskan
 * nilai `data:` apa adanya, jadi gambar lama tidak perlu dimigrasi.
 */

/** Batas ukuran berkas gambar (byte). Harus sama dengan batas di server. */
export const BATAS_GAMBAR_BYTE = 5 * 1024 * 1024;

/** Batas ukuran berkas video (byte). Server memeriksa ulang nilai yang sama. */
export const BATAS_VIDEO_BYTE = 50 * 1024 * 1024;

/** Jenis media yang dikenali slider. */
export const JENIS_MEDIA = {
  GAMBAR: 'gambar',
  VIDEO: 'video',
} as const;

export type JenisMedia = (typeof JENIS_MEDIA)[keyof typeof JENIS_MEDIA];

/** Ekstensi video yang diterima. `mp4` dan `webm` diputar semua peramban modern. */
const EKSTENSI_VIDEO = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v'];

/** Ekstensi gambar yang diterima. */
const EKSTENSI_GAMBAR = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

const berkasVideo = (ekstensi: string) => EKSTENSI_VIDEO.includes(ekstensi);
const berkasGambar = (ekstensi: string) => EKSTENSI_GAMBAR.includes(ekstensi);

/**
 * Menentukan jenis media dari sebuah sumber.
 *
 * Sumber dapat berupa path (`/storage/slider/x.mp4`), URL penuh, atau data URL
 * lama (`data:image/png;base64,...`). Pengenalannya memakai ekstensi dan MIME
 * pada data URL — bukan tebakan dari nama kolom.
 */
export function jenisMedia(sumber?: string | null): JenisMedia {
  if (typeof sumber !== 'string' || !sumber) return JENIS_MEDIA.GAMBAR;

  // Data URL lama: `data:image/png;base64,...` atau `data:video/mp4;base64,...`
  if (sumber.startsWith('data:')) {
    return sumber.startsWith('data:video/') ? JENIS_MEDIA.VIDEO : JENIS_MEDIA.GAMBAR;
  }

  // Buang query/hash agar `/x.mp4?v=2` tetap dikenali.
  const bersih = sumber.split('?')[0].split('#')[0].toLowerCase();

  // Cocokkan ekstensi paling kanan saja, supaya nama folder tidak ikut dinilai.
  const ekstensi = bersih.slice(bersih.lastIndexOf('.') + 1);
  return berkasVideo(ekstensi) ? JENIS_MEDIA.VIDEO : JENIS_MEDIA.GAMBAR;
}

export interface HasilValidasi {
  sah: boolean;
  jenis: JenisMedia;
  pesan?: string;
}

/**
 * Memvalidasi berkas yang dipilih pengguna SEBELUM diunggah.
 *
 * Pemeriksaan di klien hanya untuk kenyamanan (galat cepat, tanpa menunggu
 * unggahan 50 MB). Server WAJIB memeriksa ulang — nilai dari peramban tidak
 * dapat dipercaya.
 */
export function validasiBerkasMedia(berkas?: File | null): HasilValidasi {
  if (!berkas || typeof berkas !== 'object') {
    return { sah: false, jenis: JENIS_MEDIA.GAMBAR, pesan: 'Tidak ada berkas yang dipilih.' };
  }

  const nama = String(berkas.name || '').toLowerCase();
  const ekstensi = nama.slice(nama.lastIndexOf('.') + 1);
  const mime = String(berkas.type || '').toLowerCase();

  const adalahVideo = mime.startsWith('video/') || berkasVideo(ekstensi);
  const adalahGambar = mime.startsWith('image/') || berkasGambar(ekstensi);

  if (!adalahVideo && !adalahGambar) {
    return {
      sah: false,
      jenis: JENIS_MEDIA.GAMBAR,
      pesan: 'Berkas harus berupa gambar (JPG, PNG, WebP) atau video (MP4, WebM).',
    };
  }

  const jenis = adalahVideo ? JENIS_MEDIA.VIDEO : JENIS_MEDIA.GAMBAR;
  const batas = jenis === JENIS_MEDIA.VIDEO ? BATAS_VIDEO_BYTE : BATAS_GAMBAR_BYTE;

  if (Number(berkas.size) > batas) {
    const mb = Math.round(batas / (1024 * 1024));
    return {
      sah: false,
      jenis,
      pesan:
        jenis === JENIS_MEDIA.VIDEO
          ? `Ukuran video melebihi ${mb} MB. Perpendek durasi atau perkecil berkasnya.`
          : `Ukuran gambar melebihi ${mb} MB. Perkecil berkas terlebih dahulu.`,
    };
  }

  return { sah: true, jenis };
}

/** Ringkasan jenis media untuk label di panel admin. */
export function labelJenisMedia(sumber?: string | null): string {
  return jenisMedia(sumber) === JENIS_MEDIA.VIDEO ? 'Video' : 'Gambar';
}
