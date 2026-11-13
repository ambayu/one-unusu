/**
 * Pemetaan galat permintaan (axios) menjadi pesan yang siap ditampilkan.
 *
 * Dipisahkan dari komponen agar bisa diuji terpisah dan dipakai ulang oleh
 * formulir lain (registrasi, lupa kata sandi, dsb.).
 *
 * Prinsipnya: pesan wajib menyebut penyebab yang sebenarnya. Jangan pernah
 * menampilkan "server tidak aktif" untuk kegagalan yang bukan masalah jaringan -
 * pengguna akan memeriksa hal yang salah.
 */

/** Bentuk galat axios yang kita baca; dibatasi pada field yang benar-benar dipakai. */
export interface GalatPermintaan {
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: { message?: unknown } | null;
  };
}

/**
 * Kode `code` dari axios yang menandakan koneksi tidak terbentuk sama sekali.
 * `ERR_BAD_RESPONSE` sengaja TIDAK masuk: itu berarti server menjawab, hanya
 * bentuknya tidak sesuai.
 *
 * `ERR_NETWORK` ambigu di sisi klien: bisa berarti server benar-benar mati,
 * BISA JUGA server sehat tetapi browser memblokir respons karena origin tidak
 * ada di CORS_ORIGIN. Keduanya tidak dapat dibedakan dari dalam browser, jadi
 * pesannya harus menyebut kedua kemungkinan - bukan memilih salah satu.
 */
const KODE_JARINGAN = new Set(['ERR_NETWORK', 'ERR_CONNECTION_REFUSED', 'ECONNREFUSED']);

const KODE_TIMEOUT = new Set(['ECONNABORTED', 'ETIMEDOUT']);

/**
 * Mengubah galat menjadi pesan bahasa Indonesia yang menjelaskan sebabnya.
 *
 * @param galat galat dari `catch` (biasanya dari axios)
 * @param pesanBawaan cadangan bila server membalas sukses-palsu tanpa pesan
 */
export function pesanGalatPermintaan(galat: GalatPermintaan, pesanBawaan: string): string {
  const status = galat?.response?.status;
  const pesanServer = galat?.response?.data?.message;

  // Pesan server selalu diutamakan bila ada dan berbentuk teks yang berguna.
  const dariServer =
    typeof pesanServer === 'string' && pesanServer.trim() ? pesanServer.trim() : undefined;

  if (galat?.code && KODE_TIMEOUT.has(galat.code)) {
    return 'Koneksi timeout. Server sedang sibuk atau tidak merespons. Silakan coba beberapa saat lagi.';
  }

  if (galat?.code && KODE_JARINGAN.has(galat.code)) {
    // ERR_NETWORK ambigu: server bisa benar-benar mati, atau server sehat namun
    // browser memblokir respons karena origin tidak terdaftar di CORS_ORIGIN
    // (kasus nyata: port Vite bergeser karena 5173 dipakai proyek lain).
    // Sebutkan keduanya agar penelusuran tidak berhenti pada tebakan tunggal.
    return 'Tidak ada respons yang dapat dibaca. Server mungkin tidak berjalan, atau alamat/port aplikasi ini belum diizinkan pada konfigurasi CORS_ORIGIN server.';
  }

  // Status HTTP hanya bermakna bila memang ada respons. Tanpa respons,
  // penyebabnya jaringan - sudah ditangani di atas.
  if (typeof status === 'number') {
    if (status === 401) {
      return dariServer || 'Kredensial tidak dikenali. Periksa kembali isian Anda.';
    }
    if (status === 403) {
      return dariServer || 'Permintaan ditolak server. Periksa konfigurasi alamat aplikasi (CORS).';
    }
    if (status === 404) {
      return dariServer || 'Alamat layanan tidak ditemukan. Periksa konfigurasi alamat API.';
    }
    if (status === 429) {
      return dariServer || 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
    }
    if (status === 400 || status === 422) {
      return dariServer || 'Data yang dikirim tidak valid. Periksa kembali isian formulir.';
    }
    if (status >= 500) {
      return dariServer || 'Server mengalami gangguan internal. Silakan hubungi administrator.';
    }
    // Server menjawab, tetapi tanpa keterangan yang bisa ditampilkan.
    return dariServer || `Server membalas kesalahan (HTTP ${status}) tanpa keterangan. Silakan hubungi administrator.`;
  }

  if (dariServer) return dariServer;

  // Tidak ada respons dan tidak ada kode jaringan yang dikenali. Tetap jangan
  // menuduh server mati tanpa bukti; sebutkan kemungkinan yang paling luas.
  return pesanBawaan;
}
