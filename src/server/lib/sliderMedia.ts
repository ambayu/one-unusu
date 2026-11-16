import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import type { Request } from "express";

/**
 * Penyimpanan media slider hero (gambar & video) pada disk lokal server.
 *
 * MENGAPA BUKAN BASE64
 * --------------------
 * Versi sebelumnya membaca berkas dengan `FileReader.readAsDataURL()` lalu
 * menyimpan hasilnya langsung ke kolom `gambarUrl`. Cara itu tidak dapat dipakai
 * untuk video: base64 membengkak ~33%, satu baris dapat berisi puluhan megabyte,
 * dan `GET /api/sliders` mengirim SEMUA slide sekaligus sehingga beranda publik
 * menarik seluruh video sebelum halaman tampil.
 *
 * Media kini ditulis ke disk dan kolom database hanya menyimpan path relatif
 * (`/storage/slider/<berkas>`). Skema database tidak berubah.
 *
 * Berbeda dengan berkas dosen, media slider memang publik — isinya banner yang
 * ditampilkan di beranda. Karena itu penyajiannya lewat direktori statis, bukan
 * endpoint terproteksi.
 */

/** Batas ukuran satu berkas gambar. Disamakan dengan teks pada antarmuka. */
export const MAKS_UKURAN_GAMBAR_SLIDER = 5 * 1024 * 1024;

/** Batas ukuran satu berkas video. */
export const MAKS_UKURAN_VIDEO_SLIDER = 50 * 1024 * 1024;

/** Prefix path publik media slider, sekaligus penanda asal berkas. */
export const PREFIX_MEDIA_SLIDER = "/storage/slider/";

const EKSTENSI_VIDEO = [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".m4v"];
const EKSTENSI_GAMBAR = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

/**
 * Direktori penyimpanan. Dapat dipindahkan lewat `SLIDER_MEDIA_DIR` supaya
 * deployment produksi dapat menaruhnya di volume terpisah dari kode.
 */
export function direktoriMediaSlider(): string {
  return process.env.SLIDER_MEDIA_DIR
    ? path.resolve(process.env.SLIDER_MEDIA_DIR)
    : path.resolve(process.cwd(), "public", "storage", "slider");
}

/** Membuat direktori penyimpanan bila belum ada (dipanggil saat modul dimuat). */
export function pastikanDirektoriMediaSlider(): void {
  fs.mkdirSync(direktoriMediaSlider(), { recursive: true });
}

/** Menentukan ekstensi dari nama asli berkas, dibatasi daftar putih di bawah. */
function ekstensiTerpilih(nama: string): string {
  const ext = path.extname(nama).toLowerCase();
  return EKSTENSI_VIDEO.includes(ext) || EKSTENSI_GAMBAR.includes(ext) ? ext : "";
}

/** True bila berkas (menurut MIME atau ekstensi) adalah video. */
export function berkasVideo(originalname: string, mimetype: string): boolean {
  const ext = path.extname(originalname).toLowerCase();
  return String(mimetype || "").toLowerCase().startsWith("video/") || EKSTENSI_VIDEO.includes(ext);
}

/** Menghasilkan nama berkas di disk yang tidak dapat ditebak. */
function namaBerkasAcak(ext: string): string {
  return `${crypto.randomBytes(24).toString("hex")}${ext}`;
}

/**
 * Middleware multer: simpan media ke disk dengan nama acak, batasi 50 MB, dan
 * terima satu berkas pada field `berkas`.
 *
 * Nama berkas di disk ditentukan server, bukan klien, agar `originalname` yang
 * berisi `../` tidak dapat dipakai menulis keluar direktori penyimpanan.
 */
export const unggahMediaSlider = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = direktoriMediaSlider();
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename: (_req, file, cb) => {
      const ext = ekstensiTerpilih(file.originalname);
      if (!ext) {
        cb(new Error("Berkas harus berupa gambar (JPG, PNG, WebP) atau video (MP4, WebM)."), "");
        return;
      }
      cb(null, namaBerkasAcak(ext));
    },
  }),
  // Batas multer memakai nilai terbesar (video); pemeriksaan per jenis media
  // dilakukan setelah unggahan karena ukuran akhir belum diketahui saat filter.
  limits: { fileSize: MAKS_UKURAN_VIDEO_SLIDER, files: 1 },
  fileFilter: (_req: Request, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    const video = mime.startsWith("video/") || EKSTENSI_VIDEO.includes(ext);
    const gambar = mime.startsWith("image/") || EKSTENSI_GAMBAR.includes(ext);
    if (!video && !gambar) {
      cb(new Error("Berkas harus berupa gambar (JPG, PNG, WebP) atau video (MP4, WebM)."));
      return;
    }
    cb(null, true);
  },
}).single("berkas");

/**
 * Memeriksa ukuran berkas setelah multer selesai.
 * Mengembalikan pesan galat, atau `null` bila berkas sah.
 */
export function periksaUkuranMediaSlider(file: Express.Multer.File | undefined): string | null {
  if (!file) return null;
  if (berkasVideo(file.originalname, file.mimetype)) {
    return file.size > MAKS_UKURAN_VIDEO_SLIDER
      ? "Ukuran video melebihi 50 MB. Perpendek durasi atau perkecil berkasnya."
      : null;
  }
  return file.size > MAKS_UKURAN_GAMBAR_SLIDER
    ? "Ukuran gambar melebihi 5 MB. Perkecil berkas terlebih dahulu."
    : null;
}

/** Mengubah berkas tersimpan menjadi path siap pakai oleh peramban. */
export function urlMediaSlider(file: Express.Multer.File): string {
  return `${PREFIX_MEDIA_SLIDER}${file.filename}`;
}

/** Menghapus berkas fisik tanpa melempar galat bila sudah tidak ada. */
export function hapusMediaSliderFisik(namaBerkasDiDisk: string): void {
  const dir = direktoriMediaSlider();
  const target = path.resolve(dir, namaBerkasDiDisk);

  // Pengaman: path hasil resolve wajib tetap berada di dalam direktori slider.
  if (path.dirname(target) !== dir) return;

  fs.promises.unlink(target).catch(() => {
    // Berkas sudah hilang atau tidak dapat dihapus; baris tetap diproses oleh
    // pemanggil. Kegagalan pembersihan disk tidak boleh menggagalkan aksi.
  });
}

/**
 * Mengambil nama berkas di disk dari nilai kolom yang tersimpan.
 *
 * Mengembalikan null bila nilai tidak berawalan path slider. Nilai lama berupa
 * data URL base64 atau URL luar dilewati, sehingga tidak ada berkas lain yang
 * ikut terhapus.
 */
export function namaBerkasMediaDariUrl(nilai: string | null | undefined): string | null {
  if (typeof nilai !== "string" || !nilai.startsWith(PREFIX_MEDIA_SLIDER)) return null;
  const nama = nilai.slice(PREFIX_MEDIA_SLIDER.length);
  // Nama hasil server selalu 48 karakter hex + ekstensi yang diizinkan.
  if (!/^[a-f0-9]{48}\.(mp4|webm|ogg|ogv|mov|m4v|jpg|jpeg|png|webp|gif|avif)$/.test(nama)) return null;
  return nama;
}
