import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { buildSsoAppDefinitions } from "../src/server/lib/ssoApps.js";

dotenv.config();

const prisma = new PrismaClient();

/**
 * Menyelaraskan urlRedirect aplikasi cabang dengan port pengembangan lokal.
 *
 * Callback env mengesampingkan port bawaan registry pengembangan.
 * Jalankan setelah seed bila menguji alur SSO antar aplikasi di lokal:
 *
 *   npm run prisma:sso-dev-urls
 */
async function main() {
  const apps = buildSsoAppDefinitions(process.env, {
    publicBaseUrl: process.env.SEED_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "",
    prodiBaseUrl: process.env.SEED_PRODI_BASE_URL || process.env.PRODI_BASE_URL || "",
    mode: "local",
  });
  for (const { clientId, urlRedirect } of apps) {
    const app = await prisma.ssoApp.findUnique({ where: { clientId } });
    if (!app) {
      console.log(`Lewati ${clientId}: belum terdaftar sebagai aplikasi SSO.`);
      continue;
    }

    await prisma.ssoApp.update({ where: { clientId }, data: { urlRedirect } });
    console.log(`Callback diperbarui: ${clientId}`);
  }
}

main()
  .catch((error) => {
    console.error("Gagal menyelaraskan urlRedirect aplikasi cabang:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
