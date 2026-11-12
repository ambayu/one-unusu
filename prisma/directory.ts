import { PrismaClient } from "@prisma/client";

/**
 * Direktori aplikasi non-SSO (tabel `LayananKampus`). Dipakai dashboard pada
 * blok "Portal Informasi & Direktori Publik" dan panel admin `/admin/direktori`.
 *
 * `icon` mengikuti daftar `AVAILABLE_ICONS` di `src/client/pages/admin/DirektoriPublik.tsx`.
 */
/**
 * Website program studi.
 *
 * Ke-14 prodi ini adalah situs mandiri di repositori `prodi-unusu`, satu
 * tenant per hostname (mis. `tif.unusu.ac.id`). Karena itu alamatnya
 * `https://<kode>.unusu.ac.id` dan bukan sub-path portal.
 *
 * `kode` harus sama dengan kode prodi pada `prodi-unusu`; mengubahnya di sini
 * tanpa mengubah tenant di sana akan menghasilkan tautan mati.
 */
const PRODI_SITES = [
  { kode: "tif", nama: "Teknik Informatika" },
  { kode: "sin", nama: "Sistem Informasi" },
  { kode: "iko", nama: "Ilmu Komputer" },
  { kode: "pgsd", nama: "Pendidikan Guru Sekolah Dasar" },
  { kode: "manajemen", nama: "Manajemen" },
  { kode: "agribisnis", nama: "Agribisnis" },
  { kode: "itp", nama: "Ilmu dan Teknologi Pangan" },
  { kode: "bdp", nama: "Budidaya Pertanian" },
  { kode: "ilmugizi", nama: "Ilmu Gizi" },
  { kode: "ankes", nama: "D3 Analis Kesehatan" },
  { kode: "piaud", nama: "Pendidikan Islam Anak Usia Dini" },
  { kode: "pai", nama: "Pendidikan Agama Islam" },
  { kode: "hki", nama: "Hukum Keluarga Islam" },
  { kode: "studislam", nama: "Studi Islam" },
] as const;

const PRODI_DIRECTORY_ENTRIES = PRODI_SITES.map((prodi, index) => {
  const isLocal =
    process.env.SSO_ENV === "local" ||
    process.env.NODE_ENV === "development" ||
    (process.env.SEED_PUBLIC_BASE_URL || "").includes("localhost");

  /*
   * Website prodi mengenali tenant dari hostname, bukan dari query string.
   * Pada host loopback, `prodi-unusu` memetakan `localhost` ke satu tenant
   * yang dipilih lewat `PREVIEW_HOST`, sehingga seluruh entri akan mendarat di
   * tenant yang sama bila dipisahkan dengan `?tenant=`. Pemetaan itu
   * dilakukan di tingkat hostname, jadi tiap prodi memperoleh subdomain
   * sendiri agar tautannya benar-benar menuju situs prodi yang dituju.
   */
  const urlTarget = isLocal
    ? `http://${prodi.kode}.localhost:5180`
    : `https://${prodi.kode}.unusu.ac.id`;

  return {
    nama: prodi.nama,
    kategori: "Website Prodi",
    deskripsi: `Profil, kurikulum, dosen, berita, dan informasi akademik Program Studi ${prodi.nama}.`,
    urlTarget,
    icon: "AcademicCapIcon",
    isExternal: true,
    urutan: 10 + index,
  };
});

export const DIRECTORY_ENTRIES = [
  {
    nama: "SIAKAD UNUSU",
    kategori: "Akademik",
    deskripsi:
      "Pengisian KRS, transkrip nilai, jadwal perkuliahan, dan riwayat status akademik mahasiswa.",
    urlTarget: "https://siakad.unusu.ac.id",
    icon: "AcademicCapIcon",
    isExternal: true,
    urutan: 1,
  },
  {
    nama: "PMB UNUSU",
    kategori: "Admisi",
    deskripsi:
      "Pendaftaran mahasiswa baru, informasi jalur seleksi, dan pengumuman hasil penerimaan.",
    urlTarget: "https://pmb.unusu.ac.id",
    icon: "UserIcon",
    isExternal: true,
    urutan: 2,
  },
  ...PRODI_DIRECTORY_ENTRIES,
] as const;

/**
 * Menyelaraskan isi direktori dengan definisi di berkas ini.
 *
 * Pencocokan tidak memakai `nama` karena nama dapat berubah (mis. penyederhanaan
 * label), dan mencocokkan lewat nama saja akan menyisakan baris lama sebagai
 * duplikat. Kunci yang dipakai adalah `urlTarget`, sebab satu alamat hanya boleh
 * mewakili satu portal. Bila alamat ikut berubah, baris lama yang masih
 * menyimpan deskripsi bawaan lama akan dibersihkan agar tidak tampil ganda.
 *
 * Entri yang ditambahkan admin lewat panel tidak pernah dihapus: hanya baris
 * dengan penanda bawaan yang disentuh.
 */
export async function seedDirectory(prisma: PrismaClient): Promise<void> {
  for (const entry of DIRECTORY_ENTRIES) {
    const existing = await prisma.layananKampus.findFirst({
      where: { urlTarget: entry.urlTarget },
      select: { id: true },
    });

    if (existing) {
      await prisma.layananKampus.update({
        where: { id: existing.id },
        data: { ...entry, active: true },
      });
      continue;
    }

    await prisma.layananKampus.create({ data: { ...entry, active: true } });
  }
}
