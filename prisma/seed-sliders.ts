import { PrismaClient } from "@prisma/client";

export const DEFAULT_HERO_SLIDERS = [
  {
    judul: "Penerimaan Mahasiswa Baru TA 2026/2027",
    subjudul: "Jadilah Generasi Aswaja Unggul dan Mandiri",
    urutan: 1,
    gambarUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop",
    linkUrl: "https://pmb.unusu.ac.id",
    active: true,
  },
  {
    judul: "Transformasi Kampus Digital Terintegrasi",
    subjudul: "Portal Layanan Satu Pintu Civitas Akademika",
    urutan: 2,
    gambarUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop",
    linkUrl: "/dashboard",
    active: true,
  },
  {
    judul: "Penguatan Riset & Pengabdian Masyarakat",
    subjudul: "LPPM UNUSU Mendorong Publikasi Ilmiah Bereputasi",
    urutan: 3,
    gambarUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1200&auto=format&fit=crop",
    linkUrl: "/lppm",
    active: true,
  },
  {
    judul: "Penjaminan Mutu & Akreditasi Program Studi",
    subjudul: "Komitmen Berkelanjutan Menuju Standar Mutu Unggul",
    urutan: 4,
    gambarUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop",
    linkUrl: "/lpm",
    active: true,
  },
];

export async function seedSliders(prisma: PrismaClient) {
  for (const slider of DEFAULT_HERO_SLIDERS) {
    const existing = await prisma.bannerSlider.findFirst({
      where: { urutan: slider.urutan },
    });

    if (existing) {
      await prisma.bannerSlider.update({
        where: { id: existing.id },
        data: slider,
      });
    } else {
      await prisma.bannerSlider.create({
        data: slider,
      });
    }
  }
}
