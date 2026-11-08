import { PrismaClient } from "@prisma/client";

/** Tiga tingkat izin masuk yang berlaku untuk setiap aplikasi cabang. */
export const TINGKAT_MASUK = ["admin", "dosen", "mahasiswa"] as const;
export type TingkatMasuk = (typeof TINGKAT_MASUK)[number];

/**
 * Aksi izin masuk, diturunkan dari `TINGKAT_MASUK`.
 *
 * Dipisahkan sebagai konstanta agar katalog izin dan pemeriksaan akses
 * memakai ejaan kunci yang SAMA (`masuk_admin`, bukan `admin`). Ketidakcocokan
 * di sini pernah membuat proses pembersihan izin menghapus izin masuk yang baru
 * saja dibuat.
 */
export const AKSI_MASUK = TINGKAT_MASUK.map((t) => `masuk_${t}`);

/**
 * Daftar aplikasi cabang yang izin masuknya ikut di-seed.
 *
 * `clientId` HARUS sama dengan kolom `sso_apps.clientId` supaya kunci izin
 * dapat diturunkan kembali dari registry aplikasi (lihat `kunciIzinMasuk`).
 * Aplikasi baru yang didaftarkan lewat panel akan otomatis mendapat izin
 * masuknya karena disinkronkan dari tabel `sso_apps`, bukan dari daftar ini.
 */
export const APP_PERMISSION_RESOURCES = [
  { resource: "unusu-lms", label: "LMS UNUSU", actions: AKSI_MASUK },
  { resource: "lppm-unusu", label: "LPPM UNUSU", actions: AKSI_MASUK },
  { resource: "lpm-unusu", label: "LPM UNUSU", actions: AKSI_MASUK },
  { resource: "esurat-unusu", label: "E-Surat UNUSU", actions: AKSI_MASUK },
  { resource: "sdm-sarpras-unusu", label: "SDM & Sarpras UNUSU", actions: AKSI_MASUK },
  { resource: "unusu-akreditasi", label: "Akreditasi UNUSU", actions: AKSI_MASUK },
  { resource: "lms-unusu", label: "e-Learning UNUSU", actions: AKSI_MASUK },
  { resource: "prodi-unusu", label: "Prodi UNUSU", actions: AKSI_MASUK },
] as const;

/**
 * Sumber tunggal katalog izin & definisi peran sistem.
 * Dipakai oleh `prisma/seed.ts` dan `prisma/seed-access.ts` supaya
 * katalog tidak pernah berbeda antar jalur seeding.
 */
export const PERMISSION_CATALOG = [
  { resource: "dashboard", label: "Dashboard SSO", actions: ["menu", "view"] },
  { resource: "profile", label: "Biodata Pengguna", actions: ["menu", "view", "edit"] },
  { resource: "application", label: "Registrasi SSO", actions: ["menu", "view", "edit", "delete"] },
  { resource: "non_sso", label: "Aplikasi Non-SSO", actions: ["menu", "view", "edit", "delete"] },
  { resource: "slider", label: "Slider Hero", actions: ["menu", "view", "edit", "delete"] },
  { resource: "user", label: "Manajemen Pengguna", actions: ["menu", "view", "edit", "delete"] },
  { resource: "permission", label: "Izin", actions: ["menu", "view", "edit"] },
  { resource: "role", label: "Peran", actions: ["menu", "view", "edit", "delete"] },

  // --- IZIN SELURUH APLIKASI CABANG -------------------------------------
  // Inilah pengganti `sso_apps.targetRoles`. Setiap aplikasi cabang punya
  // tepat tiga kunci izin masuk, yaitu kunci `<clientId>:masuk_admin`,
  // `<clientId>:masuk_dosen`, dan `<clientId>:masuk_mahasiswa`. Peran tidak
  // lagi disebut di kode aplikasi cabang; yang menentukan siapa boleh masuk
  // adalah izin yang dilekatkan pada peran lewat tabel `role_permissions`.
  // Daftarnya dibangkitkan dari `APP_PERMISSION_RESOURCES` di atas agar
  // tidak pernah berbeda antara seed, sinkronisasi aplikasi, dan portal.
  ...APP_PERMISSION_RESOURCES,
] as const;

const ACTION_LABEL: Record<string, string> = {
  menu: "Akses Menu",
  view: "Lihat",
  edit: "Ubah",
  delete: "Hapus",
  export: "Ekspor",
  masuk_admin: "Masuk sebagai Administrator",
  masuk_dosen: "Masuk sebagai Dosen",
  masuk_mahasiswa: "Masuk sebagai Mahasiswa",
};

/**
 * Kunci izin masuk untuk satu aplikasi cabang.
 * @example kunciIzinMasuk("lpm-unusu", "admin") // "lpm-unusu:masuk_admin"
 */
export function kunciIzinMasuk(clientId: string, tingkat: TingkatMasuk): string {
  return `${clientId}:masuk_${tingkat}`;
}

/** Seluruh kunci izin masuk sebuah aplikasi (admin, dosen, mahasiswa). */
export function semuaKunciIzinMasuk(clientId: string): string[] {
  return TINGKAT_MASUK.map((tingkat) => kunciIzinMasuk(clientId, tingkat));
}

/**
 * Tingkat masuk yang melekat pada peran sistem saat penyemaian awal.
 *
 * Peran aplikasi (`ADMIN_LMS`, `ADMIN_LPPM`, dst.) sudah dihapus. Daftar peran
 * kini sepenuhnya dikelola Superadmin lewat panel Peran & Izin, sehingga peran
 * khusus sebuah aplikasi dibuat sebagai peran biasa dan cukup diberi izin
 * masuk `<clientId>:masuk_admin` — tanpa perlu menambah nilai enum di kode.
 *
 * Peta ini hanya cetak biru penyemaian: peran yang kode-nya tidak ada di sini
 * (semua peran buatan Superadmin) tidak mendapat izin apa pun secara otomatis.
 *
 *  - SUPERADMIN : administrator platform, masuk sebagai admin di semua aplikasi.
 *  - ADMIN_SSO  : pengelola portal, juga masuk sebagai admin di semua aplikasi.
 *  - DOSEN      : masuk sebagai dosen di semua aplikasi.
 *  - MAHASISWA  : masuk sebagai mahasiswa di semua aplikasi.
 */
export const IZIN_MASUK_BAWAAN: Record<string, readonly TingkatMasuk[]> = {
  SUPERADMIN: ["admin", "dosen", "mahasiswa"],
  ADMIN_SSO: ["admin", "dosen", "mahasiswa"],
  DOSEN: ["dosen"],
  MAHASISWA: ["mahasiswa"],
};

/**
 * Tingkat masuk bawaan sebuah peran.
 *
 * `clientId` sengaja TIDAK dipakai lagi untuk menyaring: dulu dipakai agar
 * `ADMIN_<APP>` hanya berwenang atas aplikasinya sendiri, tetapi peran aplikasi
 * sudah tidak ada. Pembatasan sekarang dilakukan dengan memilih izin mana yang
 * diberikan kepada sebuah peran.
 */
export function tingkatMasukBawaan(kodePeran: string): TingkatMasuk[] {
  return [...(IZIN_MASUK_BAWAAN[kodePeran] ?? [])];
}

/**
 * Menerjemahkan peran menjadi tingkat izin masuk.
 *
 * Hanya rujukan dokumentasi. Keputusan akses selalu dibaca dari tabel
 * `role_permissions`, bukan dari pemetaan ini.
 */
export function tingkatDariPeran(kodePeran: string): TingkatMasuk[] {
  return tingkatMasukBawaan(kodePeran);
}

const ALL_PERMISSIONS = "ALL" as const;

interface RoleDefinition {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionKeys: readonly string[] | typeof ALL_PERMISSIONS;
}

export const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    code: "SUPERADMIN",
    name: "Super Administrator",
    description: "Pemegang kendali penuh atas registry SSO, akun civitas, izin, dan peran.",
    isSystem: true,
    permissionKeys: ALL_PERMISSIONS,
  },
  {
    code: "ADMIN_SSO",
    name: "Administrator ONE UNUSU",
    description: "Administrator panel SSO dan master data kampus.",
    isSystem: true,
    permissionKeys: ALL_PERMISSIONS,
  },
  {
    code: "DOSEN",
    name: "Dosen",
    description: "Akses dashboard dan biodata pribadi.",
    isSystem: true,
    permissionKeys: [
      "dashboard:menu",
      "dashboard:view",
      "profile:menu",
      "profile:view",
      "profile:edit",
    ],
  },
  {
    code: "MAHASISWA",
    name: "Mahasiswa",
    description: "Akses dashboard dan biodata pribadi.",
    isSystem: true,
    permissionKeys: [
      "dashboard:menu",
      "dashboard:view",
      "profile:menu",
      "profile:view",
      "profile:edit",
    ],
  },
];

async function syncPermissions(prisma: PrismaClient): Promise<void> {
  for (const group of PERMISSION_CATALOG) {
    for (const action of group.actions) {
      const key = `${group.resource}:${action}`;
      const label = `${group.label} · ${ACTION_LABEL[action] ?? action}`;

      await prisma.permission.upsert({
        where: { key },
        update: { resource: group.resource, action, label },
        create: { key, resource: group.resource, action, label },
      });
    }
  }
}

async function syncRoles(prisma: PrismaClient): Promise<void> {
  const allPermissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permissionIdByKey = new Map(allPermissions.map((item) => [item.key, item.id]));

  for (const role of ROLE_DEFINITIONS) {
    const savedRole = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description, isSystem: role.isSystem },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
    });

    const wantedKeys =
      role.permissionKeys === ALL_PERMISSIONS
        ? allPermissions.map((item) => item.key)
        : [...role.permissionKeys];

    const permissionIds = wantedKeys
      .map((key) => permissionIdByKey.get(key))
      .filter((id): id is number => typeof id === "number");

    if (permissionIds.length === 0) {
      continue;
    }

    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: savedRole.id, permissionId })),
      skipDuplicates: true,
    });

    // Peran sistem selalu mengikuti katalog di atas: izin yang tidak lagi
    // tercantum dicabut, supaya penyempitan hak akses benar-benar berlaku
    // saat seed dijalankan ulang (bukan hanya menambah).
    await prisma.rolePermission.deleteMany({
      where: { roleId: savedRole.id, permissionId: { notIn: permissionIds } },
    });
  }

  await syncIzinMasukAplikasi(prisma);
}

/**
 * Memastikan setiap aplikasi cabang di `sso_apps` memiliki tiga izin masuk
 * (`:masuk_admin`, `:masuk_dosen`, `:masuk_mahasiswa`) dan melekatkannya pada
 * peran yang sesuai.
 *
 * Dipanggil setelah `syncRoles` supaya peran sudah ada. Aman dijalankan
 * berulang: `upsert` dan `skipDuplicates` membuat operasi ini idempoten.
 *
 * Catatan penting: pemeriksaan "sudah diatur" dilakukan PER PERAN, bukan per
 * aplikasi. Versi sebelumnya melewati seluruh aplikasi begitu satu peran saja
 * sudah memegang izin masuknya — akibatnya SUPERADMIN yang lebih dulu terisi
 * membuat DOSEN dan MAHASISWA tidak pernah mendapat izinnya.
 *
 * Izin bawaan hanya ditambahkan bila peran tersebut BELUM memegang izin masuk
 * aplikasi ini, sehingga perubahan yang dilakukan administrator lewat halaman
 * Peran & Izin tidak tertimpa saat seeder dijalankan ulang.
 */
async function syncIzinMasukAplikasi(prisma: PrismaClient): Promise<void> {
  const [apps, roles] = await Promise.all([
    prisma.ssoApp.findMany({ select: { clientId: true, nameApp: true } }),
    prisma.role.findMany({ select: { id: true, code: true } }),
  ]);

  if (apps.length === 0 || roles.length === 0) return;

  const actionByTingkat: Record<TingkatMasuk, string> = {
    admin: "masuk_admin",
    dosen: "masuk_dosen",
    mahasiswa: "masuk_mahasiswa",
  };

  for (const app of apps) {
    const permissionIdByTingkat = new Map<TingkatMasuk, number>();

    for (const tingkat of TINGKAT_MASUK) {
      const key = kunciIzinMasuk(app.clientId, tingkat);
      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          resource: app.clientId,
          action: actionByTingkat[tingkat],
          label: `${app.nameApp} · ${ACTION_LABEL[actionByTingkat[tingkat]]}`,
        },
      });
      permissionIdByTingkat.set(tingkat, permission.id);
    }

    const semuaId = Array.from(permissionIdByTingkat.values());

    // Izin masuk aplikasi ini sudah dipegang peran mana saja?
    const pemegang = await prisma.rolePermission.findMany({
      where: { permissionId: { in: semuaId } },
      select: { roleId: true },
    });
    const peranSudahPunya = new Set(pemegang.map((row) => row.roleId));

    const data: { roleId: number; permissionId: number }[] = [];
    for (const role of roles) {
      // Peran ini sudah diatur administrator → jangan ditambah otomatis.
      if (peranSudahPunya.has(role.id)) continue;

      for (const tingkat of tingkatMasukBawaan(role.code)) {
        const permissionId = permissionIdByTingkat.get(tingkat);
        if (permissionId) data.push({ roleId: role.id, permissionId });
      }
    }

    if (data.length > 0) {
      await prisma.rolePermission.createMany({ data, skipDuplicates: true });
    }
  }
}

/**
 * Memberi setiap pengguna peran bawaan bila belum punya peran sama sekali.
 *
 * Tanpa peran, pengguna tidak memegang izin apa pun dan tidak dapat membuka
 * satu aplikasi pun. Penautan peran berikutnya dilakukan Superadmin lewat
 * panel Manajemen Pengguna; fungsi ini hanya mencegah akun yatim, tidak pernah
 * mengubah peran yang sudah ditautkan.
 */
async function syncUserRoles(prisma: PrismaClient): Promise<void> {
  const roles = await prisma.role.findMany({ select: { id: true, code: true } });
  const roleIdByCode = new Map(roles.map((role) => [role.code, role.id]));

  const penggunaTanpaPeran = await prisma.user.findMany({
    where: { roleId: null },
    select: { id: true, nim: true, nidn: true },
  });

  for (const user of penggunaTanpaPeran) {
    // NIM menandai mahasiswa, NIDN menandai dosen; sisanya akun staf.
    const kode = user.nim ? "MAHASISWA" : user.nidn ? "DOSEN" : "MAHASISWA";
    const targetRoleId = roleIdByCode.get(kode);
    if (!targetRoleId) continue;

    await prisma.user.update({ where: { id: user.id }, data: { roleId: targetRoleId } });
  }
}

/**
 * Membersihkan izin (permissions) yang tidak lagi tercantum dalam katalog resmi
 * (`PERMISSION_CATALOG`).
 *
 * Catatan integritas data:
 * - Hanya izin yang TIDAK tercantum di PERMISSION_CATALOG dan TIDAK memiliki ikatan
 *   pada peran aktif (`role_permissions`) yang akan dihapus secara otomatis.
 * - Bila ada izin usang yang masih terikat ke suatu peran, relasinya dicabut terlebih dahulu
 *   bila diinginkan, atau hanya dibersihkan bila benar-benar orphan.
 */
export async function cleanupUnusedPermissions(prisma: PrismaClient): Promise<{
  removedCount: number;
  removedKeys: string[];
}> {
  const validKeys = new Set<string>();
  for (const group of PERMISSION_CATALOG) {
    for (const action of group.actions) {
      validKeys.add(`${group.resource}:${action}`);
    }
  }

  // Cari izin di database yang kuncinya tidak ada di katalog resmi
  const obsoletePermissions = await prisma.permission.findMany({
    where: {
      key: {
        notIn: Array.from(validKeys),
      },
    },
    select: {
      id: true,
      key: true,
      _count: {
        select: { roles: true },
      },
    },
  });

  if (obsoletePermissions.length === 0) {
    return { removedCount: 0, removedKeys: [] };
  }

  const obsoleteIds = obsoletePermissions.map((p) => p.id);
  const removedKeys = obsoletePermissions.map((p) => p.key);

  // Bersihkan relasi rolePermission untuk permission yang sudah dihapus dari katalog resmi
  await prisma.rolePermission.deleteMany({
    where: {
      permissionId: { in: obsoleteIds },
    },
  });

  // Hapus baris permissions yang usang
  await prisma.permission.deleteMany({
    where: {
      id: { in: obsoleteIds },
    },
  });

  return {
    removedCount: obsoleteIds.length,
    removedKeys,
  };
}

/**
 * Idempotent: hanya menambah data yang belum ada, tidak menghapus izin
 * yang sudah diberikan lewat panel admin, dan membersihkan izin orphan yang tidak digunakan.
 */
export async function seedAccessControl(prisma: PrismaClient): Promise<void> {
  await syncPermissions(prisma);
  await cleanupUnusedPermissions(prisma);
  await syncRoles(prisma);
  await syncUserRoles(prisma);
}
