import { PrismaClient } from "@prisma/client";
import { TINGKAT_MASUK, TingkatMasuk, kunciIzinMasuk, tingkatMasukBawaan } from "./accessControl.js";

export async function syncAppLoginPermissions(prisma: PrismaClient): Promise<void> {
  const apps = await prisma.ssoApp.findMany({
    where: { isActive: true },
    select: { clientId: true, nameApp: true }
  });

  const actionByTingkat: Record<TingkatMasuk, string> = {
    admin: "masuk_admin",
    dosen: "masuk_dosen",
    mahasiswa: "masuk_mahasiswa",
  };
  const labelByTingkat: Record<TingkatMasuk, string> = {
    admin: "Masuk sebagai Administrator",
    dosen: "Masuk sebagai Dosen",
    mahasiswa: "Masuk sebagai Mahasiswa",
  };

  const roles = await prisma.role.findMany({ select: { id: true, code: true } });

  for (const app of apps) {
    const permissionIdByTingkat = new Map<TingkatMasuk, number>();

    for (const tingkat of TINGKAT_MASUK) {
      const key = kunciIzinMasuk(app.clientId, tingkat);
      const perm = await prisma.permission.upsert({
        where: { key },
        update: {
          resource: app.clientId,
          action: actionByTingkat[tingkat],
          label: `${app.nameApp} · ${labelByTingkat[tingkat]}`,
        },
        create: {
          key,
          resource: app.clientId,
          action: actionByTingkat[tingkat],
          label: `${app.nameApp} · ${labelByTingkat[tingkat]}`,
        },
      });
      permissionIdByTingkat.set(tingkat, perm.id);
    }

    const data: { roleId: number; permissionId: number }[] = [];
    for (const role of roles) {
      for (const tingkat of tingkatMasukBawaan(role.code)) {
        const permissionId = permissionIdByTingkat.get(tingkat);
        if (permissionId) {
          data.push({ roleId: role.id, permissionId });
        }
      }
    }

    if (data.length > 0) {
      await prisma.rolePermission.createMany({ data, skipDuplicates: true });
    }
  }

  console.log(`Berhasil menyinkronkan izin masuk untuk ${apps.length} aplikasi SSO.`);
}
