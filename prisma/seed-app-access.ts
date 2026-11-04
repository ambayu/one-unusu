import { PrismaClient, UserRole } from "@prisma/client";

/**
 * Pemetaan aplikasi cabang → peran pengelola bawaan.
 *
 * Sumber tunggal untuk seed kunci admin per aplikasi (`UserAppAccess`).
 * Nilainya harus selaras dengan `targetRoles` pada registry aplikasi di
 * `prisma/seed.ts`, sehingga admin unit hanya terkunci ke aplikasinya sendiri.
 */
export const DEFAULT_APP_ADMIN_ROLE: Record<string, string> = {
  "unusu-lms": "ADMIN_LMS",
  "lppm-unusu": "ADMIN_LPPM",
  "lpm-unusu": "ADMIN_LPM",
  "esurat-unusu": "ADMIN_ESURAT",
  "sdm-sarpras-unusu": "ADMIN_SARPRAS",
  "unusu-akreditasi": "ADMIN_AKREDITASI",
};

export interface SeedAppAccessResult {
  created: number;
  skipped: number;
  apps: Array<{ clientId: string; role: string; userIds: number[] }>;
}

/**
 * Menyiapkan kunci admin bawaan: setiap akun dengan peran pengelola aplikasi
 * mendapat baris `UserAppAccess` aktif hanya untuk aplikasinya sendiri.
 *
 * Idempotent — memakai upsert pada unique `[userId, appId]`, jadi menjalankan
 * seed berulang tidak menggandakan kunci dan tidak mencabut kunci tambahan
 * yang sudah diberikan lewat panel admin.
 */
export async function seedAppAccess(prisma: PrismaClient): Promise<SeedAppAccessResult> {
  const result: SeedAppAccessResult = { created: 0, skipped: 0, apps: [] };

  const apps = await prisma.ssoApp.findMany({
    where: { clientId: { in: Object.keys(DEFAULT_APP_ADMIN_ROLE) } },
    select: { id: true, clientId: true },
  });

  for (const app of apps) {
    const role = DEFAULT_APP_ADMIN_ROLE[app.clientId];
    if (!role) continue;

    const admins = await prisma.user.findMany({
      where: { role: role as UserRole, isActive: true },
      select: { id: true },
    });

    if (admins.length === 0) {
      result.apps.push({ clientId: app.clientId, role, userIds: [] });
      continue;
    }

    for (const admin of admins) {
      const existing = await prisma.userAppAccess.findUnique({
        where: { userId_appId: { userId: admin.id, appId: app.id } },
        select: { id: true },
      });

      if (existing) {
        result.skipped += 1;
        continue;
      }

      await prisma.userAppAccess.create({
        data: {
          userId: admin.id,
          appId: app.id,
          isActive: true,
          note: `Seed: pengelola bawaan ${app.clientId} (${role})`,
        },
      });
      result.created += 1;
    }

    result.apps.push({ clientId: app.clientId, role, userIds: admins.map((admin) => admin.id) });
  }

  return result;
}
