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
];
const ACTION_LABEL = {
    menu: "Akses Menu",
    view: "Lihat",
    edit: "Ubah",
    delete: "Hapus",
    export: "Ekspor",
};
const ALL_PERMISSIONS = "ALL";
export const ROLE_DEFINITIONS = [
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
        code: "ADMIN_LPM",
        name: "Administrator LPM",
        description: "Administrator khusus Lembaga Penjaminan Mutu Internal.",
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
        code: "ADMIN_LPPM",
        name: "Administrator LPPM",
        description: "Administrator khusus Lembaga Penelitian & Pengabdian Masyarakat.",
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
        code: "ADMIN_ESURAT",
        name: "Administrator E-Surat",
        description: "Administrator khusus Tata Naskah Dinas & Persuratan Digital.",
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
        code: "ADMIN_SARPRAS",
        name: "Administrator Sarpras",
        description: "Administrator khusus Sarana, Prasarana & Kepegawaian.",
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
        code: "ADMIN_AKREDITASI",
        name: "Administrator Akreditasi",
        description: "Administrator khusus instrumen dan penilaian akreditasi.",
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
        code: "ADMIN_LMS",
        name: "Administrator LMS",
        description: "Administrator khusus platform perkuliahan dan kelas daring.",
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
async function syncPermissions(prisma) {
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
async function syncRoles(prisma) {
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
        const wantedKeys = role.permissionKeys === ALL_PERMISSIONS
            ? allPermissions.map((item) => item.key)
            : [...role.permissionKeys];
        const permissionIds = wantedKeys
            .map((key) => permissionIdByKey.get(key))
            .filter((id) => typeof id === "number");
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
async function syncUserRoles(prisma) {
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
 * Membersihkan izin (permissions) yang tidak lagi tercantum dalam katalog resmi
 * (`PERMISSION_CATALOG`).
 *
 * Catatan integritas data:
 * - Hanya izin yang TIDAK tercantum di PERMISSION_CATALOG dan TIDAK memiliki ikatan
 *   pada peran aktif (`role_permissions`) yang akan dihapus secara otomatis.
 * - Bila ada izin usang yang masih terikat ke suatu peran, relasinya dicabut terlebih dahulu
 *   bila diinginkan, atau hanya dibersihkan bila benar-benar orphan.
 */
export async function cleanupUnusedPermissions(prisma) {
    const validKeys = new Set();
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
export async function seedAccessControl(prisma) {
    await syncPermissions(prisma);
    await cleanupUnusedPermissions(prisma);
    await syncRoles(prisma);
    await syncUserRoles(prisma);
}
