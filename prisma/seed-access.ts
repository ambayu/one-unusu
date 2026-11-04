import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedAccessControl, cleanupUnusedPermissions } from "./access-control.js";
import { seedAppAccess } from "./seed-app-access.js";

const prisma = new PrismaClient();

try {
  console.log("Seeding katalog izin, peran sistem, dan pemetaan role pengguna...");
  await seedAccessControl(prisma);

  console.log("Membersihkan data izin yang tidak aktif / usang...");
  const cleanupResult = await cleanupUnusedPermissions(prisma);
  console.log(`Izin dibersihkan: ${cleanupResult.removedCount} (${cleanupResult.removedKeys.join(", ") || "tidak ada"})`);

  console.log("Menyiapkan kunci admin aplikasi bawaan (UserAppAccess)...");
  const accessResult = await seedAppAccess(prisma);
  console.log(`Kunci akses admin: ${accessResult.created} dibuat, ${accessResult.skipped} sudah ada.`);

  console.log("Selesai.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
