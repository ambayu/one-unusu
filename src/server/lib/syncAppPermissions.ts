import { PrismaClient } from "@prisma/client";
import { TINGKAT_MASUK, TingkatMasuk, tingkatMasukBawaan } from "./accessControl.js";

export async function syncAppLoginPermissions(prisma: PrismaClient): Promise<void> {
  const roles = await prisma.role.findMany({ select: { id: true, code: true } });

  const labelByTingkat: Record<TingkatMasuk, string> = {
    admin: "Masuk sebagai Administrator",
    dosen: "Masuk sebagai Dosen",
    mahasiswa: "Masuk sebagai Mahasiswa",
  };

  const permissionIdByTingkat = new Map<TingkatMasuk, number>();
  for (const tingkat of TINGKAT_MASUK) {
    const key = `masuk_${tingkat}`;
    const perm = await prisma.permission.upsert({
      where: { key },
      update: {
        resource: "akses",
        action: `masuk_${tingkat}`,
        label: `Akses Aplikasi · ${labelByTingkat[tingkat]}`,
      },
      create: {
        key,
        resource: "akses",
        action: `masuk_${tingkat}`,
        label: `Akses Aplikasi · ${labelByTingkat[tingkat]}`,
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

  console.log("Berhasil menyinkronkan izin masuk global untuk peran civitas.");
}
