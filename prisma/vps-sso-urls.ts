import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { buildSsoAppDefinitions } from "../src/server/lib/ssoApps.js";

dotenv.config();

const prisma = new PrismaClient();

/**
 * Menyelaraskan urlRedirect aplikasi cabang dengan konfigurasi domain produksi (VPS).
 * Seluruh callback wajib dikonfigurasi melalui SSO_CALLBACK_URL_<suffix>.
 */
async function main() {
  const apps = buildSsoAppDefinitions(process.env, {
    publicBaseUrl: process.env.SEED_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "",
    prodiBaseUrl: process.env.SEED_PRODI_BASE_URL || process.env.PRODI_BASE_URL || "",
    mode: "vps",
  });
  for (const { clientId, urlRedirect } of apps) {
    const app = await prisma.ssoApp.findUnique({ where: { clientId } });
    if (!app) {
      console.log(`Lewati ${clientId}: belum terdaftar.`);
      continue;
    }

    await prisma.ssoApp.update({ where: { clientId }, data: { urlRedirect } });
    console.log(`[VPS] Callback diperbarui: ${clientId}`);
  }

  console.log("Penyelarasan URL callback VPS selesai!");
}

main()
  .catch((error) => {
    console.error("Gagal menyelaraskan urlRedirect VPS:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
