import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedAccessControl } from "../src/server/lib/accessControl.js";

const prisma = new PrismaClient();

try {
  console.log("Seeding katalog izin portal ONE UNUSU SSO dan peran sistem...");
  await seedAccessControl(prisma);
  console.log("Selesai menyinkronkan izin dan peran portal ONE UNUSU.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
