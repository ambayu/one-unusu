import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedAccessControl, cleanupUnusedPermissions } from "./access-control.js";

const prisma = new PrismaClient();

try {
  console.log("Seeding katalog izin, peran sistem, dan pemetaan role pengguna...");
  await seedAccessControl(prisma);

  console.log("Membersihkan data izin yang tidak aktif / usang...");
  const cleanupResult = await cleanupUnusedPermissions(prisma);
  console.log(`Izin dibersihkan: ${cleanupResult.removedCount} (${cleanupResult.removedKeys.join(", ") || "tidak ada"})`);

  console.log("Selesai.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
