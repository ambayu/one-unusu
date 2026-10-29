import { PrismaClient } from "@prisma/client";

/**
 * Direktori aplikasi non-SSO (tabel `LayananKampus`). Dipakai dashboard pada
 * blok "Portal Informasi & Direktori Publik" dan panel admin `/admin/direktori`.
 *
 * `icon` mengikuti daftar `AVAILABLE_ICONS` di `src/client/pages/admin/DirektoriPublik.tsx`.
 */
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
] as const;

/**
 * Idempotent: entri dicari berdasarkan `nama` lalu diperbarui, sehingga
 * seeding berulang tidak menghasilkan duplikat dan tidak menghapus entri
 * lain yang ditambahkan lewat panel admin.
 */
export async function seedDirectory(prisma: PrismaClient): Promise<void> {
  for (const entry of DIRECTORY_ENTRIES) {
    const existing = await prisma.layananKampus.findFirst({
      where: { nama: entry.nama },
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
