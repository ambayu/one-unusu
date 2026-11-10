import { PrismaClient } from "@prisma/client";

/** Tiga tingkat izin masuk yang berlaku untuk peluncur aplikasi SSO di portal. */
export const TINGKAT_MASUK = ["admin", "dosen", "mahasiswa"] as const;
export type TingkatMasuk = (typeof TINGKAT_MASUK)[number];

export function kunciIzinMasuk(clientId: string, tingkat: TingkatMasuk): string {
  return `${clientId}:masuk_${tingkat}`;
}

export function tingkatMasukBawaan(kodePeran: string): TingkatMasuk[] {
  if (kodePeran === "SUPERADMIN" || kodePeran === "ADMIN_SSO") return ["admin", "dosen", "mahasiswa"];
  if (kodePeran === "DOSEN") return ["dosen"];
  if (kodePeran === "MAHASISWA") return ["mahasiswa"];
  return [];
}

/**
 * Sumber tunggal katalog izin portal ONE UNUSU SSO & definisi peran sistem.
 * Izin di ONE UNUSU khusus mengatur portal SSO, modul administrasi kampus, dan navigasi.
 * Masing-masing aplikasi satelit (LPPM, LPM, Sarpras, dsb.) memiliki peran, izin, dan
 * matriks hak akses mandiri di database masing-masing.
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
  { resource: "superadmin", label: "Otoritas Superadmin", actions: ["access"] },
] as const;

const ACTION_LABEL: Record<string, string> = {
  menu: "Akses Menu",
  view: "Lihat",
  edit: "Ubah",
  delete: "Hapus",
  export: "Ekspor",
  access: "Akses Penuh",
};

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
    description: "Pemegang kendali penuh atas portal SSO, akun civitas, izin, dan peran.",
    isSystem: true,
    permissionKeys: ALL_PERMISSIONS,
  },
  {
    code: "ADMIN_SSO",
    name: "Administrator ONE UNUSU",
    description: "Administrator panel SSO dan konten portal kampus.",
    isSystem: true,
    permissionKeys: ALL_PERMISSIONS,
  },
  {
    code: "DOSEN",
    name: "Dosen",
    description: "Akses dashboard SSO dan biodata pribadi.",
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
    description: "Akses dashboard SSO dan biodata pribadi.",
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
    code: "TENDIK",
    name: "Tenaga Kependidikan",
    description: "Akses dashboard SSO dan biodata pribadi.",
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

    const targetKeys =
      role.permissionKeys === ALL_PERMISSIONS
        ? allPermissions.map((item) => item.key)
        : role.permissionKeys;

    for (const key of targetKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: savedRole.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: savedRole.id,
          permissionId,
        },
      });
    }
  }
}

/**
 * Pembersihan izin lama: menghapus izin yang tidak lagi terdaftar di PERMISSION_CATALOG
 * (misal izin-izin masuk aplikasi cabang lama) dan melepas relasi peran terkait.
 */
async function cleanObsoletePermissions(prisma: PrismaClient): Promise<void> {
  const validKeys = new Set<string>();
  for (const group of PERMISSION_CATALOG) {
    for (const action of group.actions) {
      validKeys.add(`${group.resource}:${action}`);
    }
  }

  // Lindungi izin masuk aplikasi cabang agar tidak terhapus
  const apps = await prisma.ssoApp.findMany({ select: { clientId: true } });
  for (const app of apps) {
    validKeys.add(`${app.clientId}:masuk_admin`);
    validKeys.add(`${app.clientId}:masuk_dosen`);
    validKeys.add(`${app.clientId}:masuk_mahasiswa`);
  }

  const obsolete = await prisma.permission.findMany({
    where: {
      key: {
        notIn: Array.from(validKeys),
      },
    },
    select: { id: true, key: true },
  });

  if (obsolete.length > 0) {
    const obsoleteIds = obsolete.map((p) => p.id);
    await prisma.rolePermission.deleteMany({
      where: { permissionId: { in: obsoleteIds } },
    });
    await prisma.permission.deleteMany({
      where: { id: { in: obsoleteIds } },
    });
  }
}

export async function seedAccessControl(prisma: PrismaClient): Promise<void> {
  await syncPermissions(prisma);
  await syncRoles(prisma);
  await cleanObsoletePermissions(prisma);
}
