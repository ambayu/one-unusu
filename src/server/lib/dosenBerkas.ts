import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import type { Request } from "express";

/**
 * Penyimpanan berkas PDF dosen pada disk lokal server.
 *
 * Berkas sengaja TIDAK disajikan sebagai static file publik. Nama file di disk
 * berupa nilai acak sehingga tidak dapat ditebak, dan akses ke isinya selalu
 * melewati endpoint terproteksi yang memeriksa pemilik berkas. Dengan begitu,
 * dokumen pribadi dosen (ijazah, SK, sertifikat) tidak bisa dibuka hanya karena
 * seseorang mengetahui ID barisnya.
 */

/** Batas ukuran satu berkas PDF. Disamakan dengan teks pada antarmuka. */
export const MAKS_UKURAN_BERKAS = 10 * 1024 * 1024;

/** Prefix URL publik untuk mengunduh berkas lewat endpoint terproteksi. */
export const PREFIX_URL_BERKAS = "/api/berkas-dosen/file";

export const MIME_PDF = "application/pdf";

/**
 * Direktori penyimpanan. Dapat dipindahkan lewat `BERKAS_DOSEN_DIR` supaya
 * deployment produksi dapat menaruhnya di volume terpisah dari kode.
 */
export function direktoriBerkasDosen(): string {
  return process.env.BERKAS_DOSEN_DIR
    ? path.resolve(process.env.BERKAS_DOSEN_DIR)
    : path.resolve(process.cwd(), "uploads", "berkas-dosen");
}

/**
 * Membuat direktori penyimpanan bila belum ada.
 *
 * Dipanggil saat modul dimuat agar kegagalan konfigurasi penyimpanan terdeteksi
 * saat server start, bukan saat dosen pertama kali mengunggah berkas.
 */
export function pastikanDirektoriBerkas(): void {
  fs.mkdirSync(direktoriBerkasDosen(), { recursive: true });
}

/** Menghasilkan nama berkas di disk yang tidak dapat ditebak. */
function namaBerkasAcak(): string {
  return `${crypto.randomBytes(24).toString("hex")}.pdf`;
}

/**
 * Validasi isi berkas: 4 byte pertama setiap PDF adalah `%PDF`.
 *
 * `mimetype` dari klien hanya berupa klaim; berkas ber-ekstensi `.pdf` dapat
 * saja berisi apa pun. Pemeriksaan signature memastikan yang disimpan benar
 * PDF, bukan skrip atau arsip yang disamarkan.
 */
export function berkasBerisiPdf(fileBuffer: Buffer): boolean {
  return fileBuffer.length >= 5 && fileBuffer.subarray(0, 4).toString("latin1") === "%PDF";
}

/**
 * Middleware multer: simpan ke disk sementara dengan nama acak, batasi 10 MB,
 * dan terima satu berkas pada field `file`.
 *
 * Nama file di disk ditentukan server, bukan klien, agar `originalname` yang
 * berisi `../` tidak dapat dipakai menulis keluar direktori penyimpanan.
 */
export const unggahBerkasPdf = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = direktoriBerkasDosen();
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename: (_req, _file, cb) => cb(null, namaBerkasAcak()),
  }),
  limits: { fileSize: MAKS_UKURAN_BERKAS, files: 1 },
  fileFilter: (_req: Request, file, cb) => {
    if (file.mimetype !== MIME_PDF) {
      cb(new Error("Hanya berkas PDF yang diizinkan."));
      return;
    }
    cb(null, true);
  },
}).single("file");

/** Menghapus berkas fisik tanpa melempar galat bila sudah tidak ada. */
export function hapusBerkasFisik(namaBerkasDiDisk: string): void {
  const target = path.resolve(direktoriBerkasDosen(), namaBerkasDiDisk);
  const dir = direktoriBerkasDosen();

  // Pengaman: path hasil resolve wajib tetap berada di dalam direktori berkas.
  if (path.dirname(target) !== dir) return;

  fs.promises.unlink(target).catch(() => {
    // Berkas sudah hilang atau tidak dapat dihapus; data baris tetap dihapus
    // oleh pemanggil. Kegagalan pembersihan disk tidak boleh menggagalkan aksi.
  });
}

/**
 * Mengambil nama berkas di disk dari nilai `fileUrl` yang tersimpan.
 *
 * Mengembalikan null bila URL tidak berawalan endpoint berkas, sehingga baris
 * lama yang masih menyimpan URL lain tidak pernah dihapus dari disk.
 */
export function namaBerkasDariUrl(fileUrl: string): string | null {
  const prefix = `${PREFIX_URL_BERKAS}/`;
  if (!fileUrl.startsWith(prefix)) return null;

  const nama = fileUrl.slice(prefix.length);
  if (!/^[a-f0-9]{48}\.pdf$/.test(nama)) return null;

  return nama;
}
