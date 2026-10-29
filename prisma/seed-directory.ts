import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedDirectory } from "./directory.js";

const prisma = new PrismaClient();

try {
  console.log("Seeding direktori aplikasi non-SSO...");
  await seedDirectory(prisma);
  console.log("Selesai.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
