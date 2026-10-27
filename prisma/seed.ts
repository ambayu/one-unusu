import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

/**
 * Ambil kredensial SSO dari environment.
 * Tidak ada nilai default di sini: seed menolak berjalan bila variabel belum
 * diset, supaya client key tidak pernah kembali tersimpan di dalam repo.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Environment variable ${name} belum diset. Isi dulu di .env sebelum menjalankan seed.`
    );
  }
  return value;
}

const SSO_CLIENT_KEYS = {
  lmsUnusu: requireEnv("SSO_CLIENT_KEY_LMS_UNUSU"),
  lppmUnusu: requireEnv("SSO_CLIENT_KEY_LPPM_UNUSU"),
  lpmUnusu: requireEnv("SSO_CLIENT_KEY_LPM_UNUSU"),
  esuratUnusu: requireEnv("SSO_CLIENT_KEY_ESURAT_UNUSU"),
  sdmSarpras: requireEnv("SSO_CLIENT_KEY_SDM_SARPRAS"),
  unusuLms: requireEnv("SSO_CLIENT_KEY_UNUSU_LMS"),
  unusuAkreditasi: requireEnv("SSO_CLIENT_KEY_UNUSU_AKREDITASI"),
} as const;

async function main() {
  console.log("Seeding data ONE UNUSU SSO & Portal...");

  const saltRounds = 10;
  const defaultPasswordHash = await bcrypt.hash("password123", saltRounds);

  // ==========================================
  // 1. SEED MASTER AKUN PENGGUNA (SSO USERS)
  // ==========================================
  console.log("Creating default SSO Users...");

  // Superadmin
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      password: defaultPasswordHash,
      role: "SUPERADMIN",
      isActive: true,
    },
    create: {
      username: "admin",
      password: defaultPasswordHash,
      nama: "Super Administrator ONE UNUSU",
      email: "admin@unusu.ac.id",
      noHp: "081234567890",
      role: "SUPERADMIN",
      prodi: "Pusat Teknologi Informasi dan Komunikasi",
      fakultas: "Rektorat UNUSU",
      isActive: true,
    },
  });

  // Dosen (Login menggunakan NIDN)
  await prisma.user.upsert({
    where: { username: "0102038901" },
    update: {
      password: defaultPasswordHash,
      role: "DOSEN",
      isActive: true,
    },
    create: {
      username: "0102038901",
      password: defaultPasswordHash,
      nama: "Dr. H. Muhammad Ilyas, M.Kom.",
      email: "ilyas@unusu.ac.id",
      noHp: "081398765432",
      role: "DOSEN",
      nidn: "0102038901",
      prodi: "S1 Sistem Informasi",
      fakultas: "Fakultas Sains dan Teknologi",
      isActive: true,
    },
  });

  // Mahasiswa (Login menggunakan NIM)
  await prisma.user.upsert({
    where: { username: "2201010045" },
    update: {
      password: defaultPasswordHash,
      role: "MAHASISWA",
      isActive: true,
    },
    create: {
      username: "2201010045",
      password: defaultPasswordHash,
      nama: "Siti Rahmah",
      email: "siti.rahmah@mhs.unusu.ac.id",
      noHp: "082165432109",
      role: "MAHASISWA",
      nim: "2201010045",
      prodi: "S1 Sistem Informasi",
      fakultas: "Fakultas Sains dan Teknologi",
      isActive: true,
    },
  });

  // ==========================================
  // 2. SEED REGISTRY APLIKASI SSO (CABANG)
  // ==========================================
  console.log("Registering SSO Client Apps...");

  const ssoApps = [
    {
      clientId: "lms-unusu",
      clientKey: SSO_CLIENT_KEYS.lmsUnusu,
      nameApp: "LMS UNUSU",
      description: "Ruang Belajar Digital, Perkuliahan Online, Materi & Tugas Kuliah Terintegrasi.",
      icon: "BookOpenCheck",
      badge: "Pembelajaran",
      urlRedirect: "http://localhost:5174/sso/callback",
      targetRoles: JSON.stringify(["DOSEN", "MAHASISWA", "SUPERADMIN"]),
      order: 1,
      isActive: true,
    },
    {
      clientId: "lppm-unusu",
      clientKey: SSO_CLIENT_KEYS.lppmUnusu,
      nameApp: "LPPM UNUSU",
      description: "Portal Riset, Pengabdian Kepada Masyarakat, Publikasi Jurnal, dan Hibah Dosen.",
      icon: "FlaskConical",
      badge: "Penelitian",
      urlRedirect: "http://localhost:5178/sso/callback",
      targetRoles: JSON.stringify(["DOSEN", "SUPERADMIN"]),
      order: 2,
      isActive: true,
    },
    {
      clientId: "lpm-unusu",
      clientKey: SSO_CLIENT_KEYS.lpmUnusu,
      nameApp: "LPM UNUSU",
      description: "Lembaga Penjaminan Mutu, Audit Mutu Internal (AMI), & Instrumen Akreditasi.",
      icon: "Award",
      badge: "Penjaminan Mutu",
      urlRedirect: "http://localhost:5177/sso/callback",
      targetRoles: JSON.stringify(["DOSEN", "SUPERADMIN"]),
      order: 3,
      isActive: true,
    },
    {
      clientId: "esurat-unusu",
      clientKey: SSO_CLIENT_KEYS.esuratUnusu,
      nameApp: "E-Surat UNUSU",
      description: "Tata Naskah Dinas, Disposisi Digital, & Surat Keterangan Mahasiswa/Dosen.",
      icon: "MailCheck",
      badge: "Administrasi",
      urlRedirect: "http://localhost:5175/sso/callback",
      targetRoles: JSON.stringify(["DOSEN", "MAHASISWA", "SUPERADMIN"]),
      order: 4,
      isActive: true,
    },
    {
      clientId: "sdm-sarpras-unusu",
      clientKey: SSO_CLIENT_KEYS.sdmSarpras,
      nameApp: "SDM & Sarpras",
      description: "Manajemen Kepegawaian, Fasilitas Kampus, & Inventaris Sarana Prasarana.",
      icon: "Building2",
      badge: "Kepegawaian",
      urlRedirect: "http://localhost:3003/sso/callback",
      targetRoles: JSON.stringify(["DOSEN", "SUPERADMIN"]),
      order: 5,
      isActive: true,
    },
    {
      clientId: "unusu-lms",
      clientKey: SSO_CLIENT_KEYS.unusuLms,
      nameApp: "LMS UNUSU (Heru)",
      description: "Portal pembelajaran dosen & mahasiswa: kelas, materi, tugas, dan penilaian.",
      icon: "GraduationCap",
      badge: "Pembelajaran",
      urlRedirect: "http://localhost:3001/sso/callback",
      targetRoles: JSON.stringify(["DOSEN", "MAHASISWA", "SUPERADMIN"]),
      order: 6,
      isActive: true,
    },
    {
      clientId: "unusu-akreditasi",
      clientKey: SSO_CLIENT_KEYS.unusuAkreditasi,
      nameApp: "Akreditasi UNUSU",
      description: "Instrumen akreditasi, bukti dokumen, dan penilaian butir mutu program studi.",
      icon: "ClipboardCheck",
      badge: "Penjaminan Mutu",
      urlRedirect: "http://localhost:3002/sso/callback",
      targetRoles: JSON.stringify(["DOSEN", "SUPERADMIN"]),
      order: 7,
      isActive: true,
    },
  ];

  for (const app of ssoApps) {
    await prisma.ssoApp.upsert({
      where: { clientId: app.clientId },
      update: {
        clientKey: app.clientKey,
        nameApp: app.nameApp,
        description: app.description,
        icon: app.icon,
        badge: app.badge,
        urlRedirect: app.urlRedirect,
        targetRoles: app.targetRoles,
        order: app.order,
        isActive: app.isActive,
      },
      create: app,
    });
  }

  console.log("Seeding SSO Pengguna & Aplikasi Selesai dengan sukses! 🤍");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
