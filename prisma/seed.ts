import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { seedAccessControl } from "./access-control.js";
import { seedDirectory } from "./directory.js";
import { seedSliders } from "./seed-sliders.js";
import { buildSsoAppDefinitions, seedSsoApps } from "../src/server/lib/ssoApps.js";

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

/**
 * Alamat Portal Prodi. Aplikasi ini berjalan di domain sendiri, jadi tidak
 * dapat diturunkan dari `SEED_PUBLIC_BASE_URL` seperti cabang lainnya.
 */
const PRODI_BASE_URL = requireEnv("SEED_PRODI_BASE_URL").replace(/\/+$/, "");

/** Registri aplikasi cabang — definisi bersama dengan endpoint sync server. */
const SSO_APPS = buildSsoAppDefinitions(process.env, {
  publicBaseUrl: PUBLIC_BASE_URL,
  prodiBaseUrl: PRODI_BASE_URL,
});

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

  // Akun platform saja. Administrator per aplikasi TIDAK lagi dibuat di sini:
  // Superadmin yang menautkan peran ke pengguna lewat panel Manajemen Pengguna,
  // dan peran khusus aplikasi dibuat di halaman Peran & Izin.
  const defaultAdminUsers = [
    {
      username: "admin",
      roleCode: "SUPERADMIN",
      nama: "Super Administrator ONE UNUSU",
      email: "admin@unusu.ac.id",
      prodi: "Pusat Teknologi Informasi dan Komunikasi",
      fakultas: "Rektorat UNUSU",
    },
    {
      username: "admin_sso",
      roleCode: "ADMIN_SSO",
      nama: "Administrator Portal SSO",
      email: "admin.sso@unusu.ac.id",
      prodi: "Pusat Teknologi Informasi dan Komunikasi",
      fakultas: "Rektorat UNUSU",
    },
  ];

  // Peran harus ada sebelum pengguna ditautkan; seedAccessControl membuatnya.
  // Karena itu penautan dilakukan pada langkah 4, setelah peran tersedia.

  // ==========================================
  // 2. SEED REGISTRY APLIKASI SSO (CABANG)
  // ==========================================
  console.log("Registering SSO Client Apps...");

  // Hapus aplikasi LMS lama jika masih ada
  await prisma.ssoApp.deleteMany({ where: { clientId: "lms-unusu" } }).catch(() => {});

  const { createdCount, updatedCount } = await seedSsoApps(prisma, SSO_APPS);
  console.log(`Registri aplikasi: ${createdCount} dibuat, ${updatedCount} diperbarui.`);

  // ==========================================
  // 3. SEED PERMISSIONS & ROLES (resource:action)
  // ==========================================
  console.log("Seeding permissions & roles...");
  await seedAccessControl(prisma);

  // ==========================================
  // 4. SEED AKUN & PENAUTAN PERAN
  // ==========================================
  // Dijalankan SETELAH peran tersedia, karena pengguna kini ditautkan lewat
  // `roleId` dan peran itu dibuat pada langkah sebelumnya.
  console.log("Seeding akun pengguna...");
  await seedUsers(prisma, defaultAdminUsers, adminPasswordHash);

  // ==========================================
  // 5. SEED DIREKTORI APLIKASI NON-SSO
  // ==========================================
  console.log("Seeding direktori aplikasi non-SSO...");
  await seedDirectory(prisma);

  // ==========================================
  // 6. SEED FOTO SLIDER HERO
  // ==========================================
  console.log("Seeding foto slider hero...");
  await seedSliders(prisma);

  console.log("Seeding SSO Pengguna & Aplikasi Selesai dengan sukses! 🤍");
}

interface SeedUser {
  username: string;
  roleCode: string;
  nama: string;
  email: string;
  prodi: string;
  fakultas: string;
}

/**
 * Membuat akun bawaan dan menautkannya ke peran lewat `roleId`.
 *
 * Password hanya ditulis saat akun dibuat; blok `update` tidak menyertakannya
 * supaya menjalankan ulang seed tidak menimpa kata sandi yang sudah diganti.
 * `roleId` sengaja TIDAK ditimpa pada akun yang sudah ada — kalau Superadmin
 * sudah mengganti peran seseorang lewat panel, seed tidak boleh mengembalikannya.
 */
async function seedUsers(
  prisma: PrismaClient,
  users: readonly SeedUser[],
  passwordHash: string
): Promise<void> {
  const roles = await prisma.role.findMany({ select: { id: true, code: true } });
  const roleIdByCode = new Map(roles.map((role) => [role.code, role.id]));

  for (const user of users) {
    const roleId = roleIdByCode.get(user.roleCode);
    if (!roleId) {
      console.warn(`  Peran ${user.roleCode} belum ada; akun ${user.username} dilewati.`);
      continue;
    }

    const existing = await prisma.user.findUnique({
      where: { username: user.username },
      select: { id: true, roleId: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          nama: user.nama,
          email: user.email,
          prodi: user.prodi,
          fakultas: user.fakultas,
          isActive: true,
          ...(existing.roleId === null ? { roleId } : {}),
        },
      });
      continue;
    }

    await prisma.user.create({
      data: {
        username: user.username,
        password: passwordHash,
        nama: user.nama,
        email: user.email,
        noHp: "081234567890",
        roleId,
        prodi: user.prodi,
        fakultas: user.fakultas,
        isActive: true,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
