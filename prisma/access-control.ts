import { PrismaClient } from "@prisma/client";

/**
 * Sumber tunggal katalog izin & definisi peran sistem.
 * Dipakai oleh `prisma/seed.ts` dan `prisma/seed-access.ts` supaya
 * katalog tidak pernah berbeda antar jalur seeding.
 */
export const PERMISSION_CATALOG = [
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
}

/**
 * Menyamakan `User.roleId` dengan peran sistem yang sesuai `User.role`.
 * Diperlukan karena semua otorisasi membaca izin lewat relasi role, bukan
 * lewat kolom enum `role`.
 */
async function syncUserRoles(prisma: PrismaClient): Promise<void> {
  const roles = await prisma.role.findMany({ select: { id: true, code: true } });
  const roleIdByCode = new Map(roles.map((role) => [role.code, role.id]));

  const users = await prisma.user.findMany({ select: { id: true, role: true, roleId: true } });

  for (const user of users) {
    const targetRoleId = roleIdByCode.get(user.role);

    if (!targetRoleId || user.roleId === targetRoleId) {
      continue;
    }

    await prisma.user.update({ where: { id: user.id }, data: { roleId: targetRoleId } });
  }
}

/**
 * Idempotent: hanya menambah data yang belum ada, tidak menghapus izin
 * yang sudah diberikan lewat panel admin.
 */
export async function seedAccessControl(prisma: PrismaClient): Promise<void> {
  await syncPermissions(prisma);
  await syncRoles(prisma);
  await syncUserRoles(prisma);
}
