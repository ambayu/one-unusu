import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedAccessControl } from "./access-control.js";

const prisma = new PrismaClient();

try {
  console.log("Seeding katalog izin, peran sistem, dan pemetaan role pengguna...");
  await seedAccessControl(prisma);
  console.log("Selesai.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
