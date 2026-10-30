import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { seedAccessControl } from "./access-control.js";
import { seedDirectory } from "./directory.js";
import { seedSliders } from "./seed-sliders.js";

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

/**
 * Konfigurasi seed khusus lingkungan.
 *
 * Kata sandi superadmin ditentukan di sini supaya seed cukup dijalankan tanpa
 * menyiapkan variabel tambahan. SEED_ADMIN_PASSWORD tetap dibaca bila ada,
 * untuk lingkungan yang ingin memakai kata sandi berbeda.
 *
 * Yang penting: kata sandi hanya dipakai saat akun benar-benar dibuat. Blok
 * update tidak menyertakan field password, sehingga menjalankan ulang seed
 * tidak menimpa kata sandi yang sudah diganti lewat panel admin.
 */
const PUBLIC_BASE_URL = requireEnv("SEED_PUBLIC_BASE_URL").replace(/\/+$/, "");
const DEFAULT_ADMIN_PASSWORD = "password123";
const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;

async function main() {
  console.log("Seeding data ONE UNUSU SSO & Portal...");

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

  // ==========================================
  // 1. SEED MASTER AKUN PENGGUNA (SSO USERS)
  // ==========================================
  console.log("Creating default SSO Users...");

  // Superadmin & Admin Spesifik Aplikasi
  const defaultAdminUsers = [
    {
      username: "admin",
      role: "SUPERADMIN" as const,
      nama: "Super Administrator ONE UNUSU",
      email: "admin@unusu.ac.id",
      prodi: "Pusat Teknologi Informasi dan Komunikasi",
      fakultas: "Rektorat UNUSU",
    },
    {
      username: "admin_sso",
      role: "ADMIN_SSO" as const,
      nama: "Administrator Portal SSO",
      email: "admin.sso@unusu.ac.id",
      prodi: "Pusat Teknologi Informasi dan Komunikasi",
      fakultas: "Rektorat UNUSU",
    },
    {
      username: "admin_lpm",
      role: "ADMIN_LPM" as const,
      nama: "Administrator LPM UNUSU",
      email: "admin.lpm@unusu.ac.id",
      prodi: "Lembaga Penjaminan Mutu",
      fakultas: "Rektorat UNUSU",
    },
    {
      username: "admin_lppm",
      role: "ADMIN_LPPM" as const,
      nama: "Administrator LPPM UNUSU",
      email: "admin.lppm@unusu.ac.id",
      prodi: "Lembaga Penelitian & Pengabdian",
      fakultas: "Rektorat UNUSU",
    },
    {
      username: "admin_esurat",
      role: "ADMIN_ESURAT" as const,
      nama: "Administrator E-Surat UNUSU",
      email: "admin.esurat@unusu.ac.id",
      prodi: "Bagian Tata Usaha & Kearsipan",
      fakultas: "Biro Administrasi Umum",
    },
    {
      username: "admin_sarpras",
      role: "ADMIN_SARPRAS" as const,
      nama: "Administrator SDM & Sarpras",
      email: "admin.sarpras@unusu.ac.id",
      prodi: "Bagian Sarana & Kepegawaian",
      fakultas: "Biro Administrasi Umum",
    },
    {
      username: "admin_akreditasi",
      role: "ADMIN_AKREDITASI" as const,
      nama: "Administrator Akreditasi",
      email: "admin.akreditasi@unusu.ac.id",
      prodi: "Pusat Penilaian Mutu & Akreditasi",
      fakultas: "Rektorat UNUSU",
    },
    {
      username: "admin_lms",
      role: "ADMIN_LMS" as const,
      nama: "Administrator LMS UNUSU",
      email: "admin.lms@unusu.ac.id",
      prodi: "Pusat Pembelajaran Digital",
      fakultas: "Biro Akademik",
    },
  ];

  for (const adminUser of defaultAdminUsers) {
    await prisma.user.upsert({
      where: { username: adminUser.username },
      update: {
        role: adminUser.role,
        nama: adminUser.nama,
        email: adminUser.email,
        prodi: adminUser.prodi,
        fakultas: adminUser.fakultas,
        isActive: true,
      },
      create: {
        username: adminUser.username,
        password: adminPasswordHash,
        nama: adminUser.nama,
        email: adminUser.email,
        noHp: "081234567890",
        role: adminUser.role,
        prodi: adminUser.prodi,
        fakultas: adminUser.fakultas,
        isActive: true,
      },
    });
  }

  // ==========================================
  // 2. SEED REGISTRY APLIKASI SSO (CABANG)
  // ==========================================
  console.log("Registering SSO Client Apps...");

  // Hapus aplikasi LMS lama jika masih ada
  await prisma.ssoApp.deleteMany({ where: { clientId: "lms-unusu" } }).catch(() => {});

  const ssoApps = [
    {
      clientId: "unusu-lms",
      clientKey: SSO_CLIENT_KEYS.unusuLms,
      nameApp: "LMS UNUSU",
      description: "Portal pembelajaran dosen & mahasiswa: kelas, materi, tugas, dan penilaian.",
      icon: "GraduationCap",
      badge: "Pembelajaran",
      urlRedirect: `${PUBLIC_BASE_URL}/lms/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_LMS", "DOSEN", "MAHASISWA", "SUPERADMIN"]),
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
      urlRedirect: `${PUBLIC_BASE_URL}/lppm/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_LPPM", "DOSEN", "SUPERADMIN"]),
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
      urlRedirect: `${PUBLIC_BASE_URL}/lpm/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_LPM", "DOSEN", "SUPERADMIN"]),
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
      urlRedirect: `${PUBLIC_BASE_URL}/esurat/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_ESURAT", "DOSEN", "MAHASISWA", "SUPERADMIN"]),
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
      urlRedirect: `${PUBLIC_BASE_URL}/sarpras/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_SARPRAS", "DOSEN", "SUPERADMIN"]),
      order: 5,
      isActive: true,
    },
    {
      clientId: "unusu-akreditasi",
      clientKey: SSO_CLIENT_KEYS.unusuAkreditasi,
      nameApp: "Akreditasi UNUSU",
      description: "Instrumen akreditasi, bukti dokumen, dan penilaian butir mutu program studi.",
      icon: "ClipboardCheck",
      badge: "Penjaminan Mutu",
      urlRedirect: `${PUBLIC_BASE_URL}/akreditasi/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_AKREDITASI", "DOSEN", "SUPERADMIN"]),
      order: 6,
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

  // ==========================================
  // 3. SEED PERMISSIONS & ROLES (resource:action)
  // ==========================================
  console.log("Seeding permissions & roles...");
  await seedAccessControl(prisma);

  // ==========================================
  // 4. SEED DIREKTORI APLIKASI NON-SSO
  // ==========================================
  console.log("Seeding direktori aplikasi non-SSO...");
  await seedDirectory(prisma);

  // ==========================================
  // 5. SEED FOTO SLIDER HERO
  // ==========================================
  console.log("Seeding foto slider hero...");
  await seedSliders(prisma);

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
