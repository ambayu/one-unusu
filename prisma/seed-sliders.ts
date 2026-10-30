import { PrismaClient } from "@prisma/client";

export const DEFAULT_HERO_SLIDERS = [
  {
    judul: "Kampus Terpadu - Gedung Rektorat Gaperta",
    subjudul: "Pusat Layanan Terpadu & Administrasi Universitas",
    gambarUrl: "/assets/hero/hero-campus-1.png",
    gambarMobileUrl: "/assets/hero/hero-campus-1-mobile.png",
    urutan: 1,
    active: true,
  },
  {
    judul: "Aktivitas Akademik - Kolaborasi Mahasiswa",
    subjudul: "Ruang Terbuka Hijau & Fasilitas Diskusi Kampus",
    gambarUrl: "/assets/hero/hero-students-2.png",
    gambarMobileUrl: "/assets/hero/hero-students-2-mobile.png",
    urutan: 2,
    active: true,
  },
  {
    judul: "Fasilitas Teknologi - Laboratorium Komputasi",
    subjudul: "Infrastruktur Digital Modern Pendukung Pembelajaran",
    gambarUrl: "/assets/hero/hero-digital-3.png",
    gambarMobileUrl: "/assets/hero/hero-digital-3-mobile.png",
    urutan: 3,
    active: true,
  },
  {
    judul: "Pusat Literasi - Perpustakaan Kampus",
    subjudul: "Akses Sumber Belajar Fisik dan Repositori Daring",
    gambarUrl: "/assets/hero/hero-library-4.png",
    gambarMobileUrl: "/assets/hero/hero-library-4-mobile.png",
    urutan: 4,
    active: true,
  },
];

export async function seedSliders(prisma: PrismaClient) {
  const existingCount = await prisma.bannerSlider.count();
  if (existingCount > 0) {
    console.log(`  bannerSlider sudah terisi (${existingCount} data), seeding dilewati.`);
    return;
  }

  for (const s of DEFAULT_HERO_SLIDERS) {
    await prisma.bannerSlider.create({
      data: s,
    });
  }
  console.log(`  ${DEFAULT_HERO_SLIDERS.length} foto slider hero berhasil di-seed!`);
}

// Bila dijalankan langsung via tsx
if (process.argv[1]?.endsWith("seed-sliders.ts") || process.argv[1]?.endsWith("seed-sliders.js")) {
  const prisma = new PrismaClient();
  seedSliders(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
