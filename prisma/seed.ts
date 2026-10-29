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

/**
 * Konfigurasi seed khusus lingkungan. Tidak ada nilai default untuk password:
 * seed menolak berjalan bila env belum diset, supaya tidak pernah ada akun
 * dengan kata sandi bawaan di server produksi.
 */
const PUBLIC_BASE_URL = requireEnv("SEED_PUBLIC_BASE_URL").replace(/\/+$/, "");
const ADMIN_PASSWORD = requireEnv("SEED_ADMIN_PASSWORD");

/** Akun demo (dosen & mahasiswa) hanya dibuat bila variabel ini diset. */
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "";

async function main() {
  console.log("Seeding data ONE UNUSU SSO & Portal...");

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);
  const demoPasswordHash = DEMO_PASSWORD
    ? await bcrypt.hash(DEMO_PASSWORD, saltRounds)
    : null;

  // ==========================================
  // 1. SEED MASTER AKUN PENGGUNA (SSO USERS)
  // ==========================================
  console.log("Creating default SSO Users...");

  // Superadmin
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      password: adminPasswordHash,
      role: "SUPERADMIN",
      isActive: true,
    },
    create: {
      username: "admin",
      password: adminPasswordHash,
      nama: "Super Administrator ONE UNUSU",
      email: "admin@unusu.ac.id",
      noHp: "081234567890",
      role: "SUPERADMIN",
      prodi: "Pusat Teknologi Informasi dan Komunikasi",
      fakultas: "Rektorat UNUSU",
      isActive: true,
    },
  });

  // Akun demo hanya untuk lingkungan uji. Di produksi dibiarkan kosong
  // supaya tidak ada kredensial bersama di server.
  if (demoPasswordHash) {
  // Dosen (Login menggunakan NIDN)
  await prisma.user.upsert({
    where: { username: "0102038901" },
    update: {
      password: demoPasswordHash,
      role: "DOSEN",
      isActive: true,
    },
    create: {
      username: "0102038901",
      password: demoPasswordHash,
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
      password: demoPasswordHash,
      role: "MAHASISWA",
      isActive: true,
    },
    create: {
      username: "2201010045",
      password: demoPasswordHash,
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
      urlRedirect: `${PUBLIC_BASE_URL}/lppm/sso/callback`,
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
      urlRedirect: `${PUBLIC_BASE_URL}/lpm/sso/callback`,
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
      urlRedirect: `${PUBLIC_BASE_URL}/esurat/sso/callback`,
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
      urlRedirect: `${PUBLIC_BASE_URL}/sarpras/sso/callback`,
      targetRoles: JSON.stringify(["DOSEN", "SUPERADMIN"]),
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
      targetRoles: JSON.stringify(["DOSEN", "SUPERADMIN"]),
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

  const PERMISSION_CATALOG = [
    { resource: "dashboard", label: "Dashboard SSO", actions: ["menu", "view"] },
    { resource: "profile", label: "Biodata Pengguna", actions: ["menu", "view", "edit"] },
    { resource: "application", label: "Registrasi SSO", actions: ["menu", "view", "edit", "delete"] },
    { resource: "user", label: "Manajemen Pengguna", actions: ["menu", "view", "edit", "delete"] },
    { resource: "permission", label: "Izin", actions: ["menu", "view", "edit"] },
    { resource: "role", label: "Peran", actions: ["menu", "view", "edit", "delete"] },
    { resource: "directory", label: "Direktori Publik", actions: ["menu", "view", "edit", "delete"] },
  ] as const;

  const ACTION_LABEL: Record<string, string> = {
    menu: "Akses Menu",
    view: "Lihat",
    edit: "Ubah",
    delete: "Hapus",
  };

  for (const group of PERMISSION_CATALOG) {
    for (const action of group.actions) {
      const key = `${group.resource}:${action}`;
      await prisma.permission.upsert({
        where: { key },
        update: {
          resource: group.resource,
          action,
          label: `${group.label} · ${ACTION_LABEL[action]}`,
        },
        create: {
          key,
          resource: group.resource,
          action,
          label: `${group.label} · ${ACTION_LABEL[action]}`,
        },
      });
    }
  }

  const allPermissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permissionIdByKey = new Map(allPermissions.map((item) => [item.key, item.id]));

  const roleDefinitions = [
    {
      code: "SUPERADMIN",
      name: "Super Administrator",
      description: "Pemegang kendali penuh atas registry SSO, akun civitas, izin, dan peran.",
      isSystem: true,
      permissionKeys: allPermissions.map((item) => item.key),
    },
    {
      code: "DOSEN",
      name: "Dosen",
      description: "Akses dashboard, biodata pribadi, dan katalog aplikasi terintegrasi.",
      isSystem: true,
      permissionKeys: [
        "dashboard:menu",
        "dashboard:view",
        "profile:menu",
        "profile:view",
        "profile:edit",
        "application:menu",
        "application:view",
      ],
    },
    {
      code: "MAHASISWA",
      name: "Mahasiswa",
      description: "Akses dashboard, biodata pribadi, dan katalog aplikasi terintegrasi.",
      isSystem: true,
      permissionKeys: [
        "dashboard:menu",
        "dashboard:view",
        "profile:menu",
        "profile:view",
        "profile:edit",
        "application:menu",
        "application:view",
      ],
    },
  ];

  for (const role of roleDefinitions) {
    const savedRole = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: savedRole.id } });

    const permissionIds = role.permissionKeys
      .map((key) => permissionIdByKey.get(key))
      .filter((id): id is number => typeof id === "number");

    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: savedRole.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }

  const roleByCode = new Map(
    (await prisma.role.findMany({ select: { id: true, code: true } })).map((role) => [role.code, role.id])
  );

  await prisma.user.updateMany({
    where: { username: "admin" },
    data: { role: "SUPERADMIN", roleId: roleByCode.get("SUPERADMIN") ?? null },
  });
  await prisma.user.updateMany({
    where: { username: "0102038901" },
    data: { role: "DOSEN", roleId: roleByCode.get("DOSEN") ?? null },
  });
  await prisma.user.updateMany({
    where: { username: "2201010045" },
    data: { role: "MAHASISWA", roleId: roleByCode.get("MAHASISWA") ?? null },
  });

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
