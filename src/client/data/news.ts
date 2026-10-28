import type { AgendaItem, NewsItem } from "./types";

export const sampleNews: NewsItem[] = [
  {
    id: "berita-1",
    title: "UNUSU Akselerasi Digitalisasi Kampus Menuju Smart Islamic University",
    excerpt: "Implementasi platform terpadu ONE UNUSU menyatukan layanan akademik, riset, dan administrasi dalam satu genggaman.",
    category: "Akademik",
    date: "2026-10-15",
    isSample: true,
  },
  {
    id: "berita-2",
    title: "Mahasiswa UNUSU Raih Prestasi Gemilang pada Kompetisi Inovasi Nasional",
    excerpt: "Karya inovatif mahasiswa dalam pengembangan teknologi pangan dan sains berhasil mendapatkan apresiasi tingkat nasional.",
    category: "Kemahasiswaan",
    date: "2026-10-10",
    isSample: true,
  },
  {
    id: "berita-3",
    title: "LPPM UNUSU Luncurkan Program Hibah Riset Kolaboratif dan Pengabdian",
    excerpt: "Mendorong peningkatan publikasi dosen dan solusi nyata bagi masyarakat Sumatera Utara.",
    category: "Penelitian",
    date: "2026-10-05",
    isSample: true,
  },
];

export const sampleAgenda: AgendaItem[] = [
  {
    id: "agenda-1",
    title: "Kuliah Umum & Stadium Generale Semester Ganjil",
    date: "2026-11-05",
    time: "09.00 - 12.00 WIB",
    location: "Aula Utama Kampus Gaperta",
    isSample: true,
  },
  {
    id: "agenda-2",
    title: "Sosialisasi Audit Mutu Internal (AMI) Siklus 2026",
    date: "2026-11-12",
    time: "13.30 - 16.00 WIB",
    location: "Ruang Rapat LPM UNUSU",
    isSample: true,
  },
  {
    id: "agenda-3",
    title: "Workshop Penulisan Jurnal Bereputasi Internasional",
    date: "2026-11-20",
    time: "09.00 - 15.00 WIB",
    location: "Lab Komputer Terpadu",
    isSample: true,
  },
];

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function parseIsoDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  return {
    day,
    year,
    monthName: MONTHS_ID[month - 1],
    monthShort: MONTHS_ID[month - 1].slice(0, 3),
  };
}

export function formatDateId(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return "Tanggal belum tersedia";
  const { day, monthName, year } = date;
  return `${day} ${monthName} ${year}`;
}
