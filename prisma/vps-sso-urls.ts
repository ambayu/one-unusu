import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

/**
 * Menyelaraskan urlRedirect aplikasi cabang dengan konfigurasi domain produksi (VPS).
 * Menggunakan SEED_PUBLIC_BASE_URL (mis. https://portal.unusu.ac.id atau https://unusu.ac.id)
 * dan SEED_PRODI_BASE_URL untuk aplikasi multi-domain Prodi.
 */
async function main() {
  const publicBaseUrl = (process.env.SEED_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "https://unusu.ac.id").replace(/\/+$/, "");
  const prodiBaseUrl = (process.env.SEED_PRODI_BASE_URL || process.env.PRODI_BASE_URL || "https://prodi.unusu.ac.id").replace(/\/+$/, "");

  console.log(`Menyetel URL callback SSO untuk lingkungan VPS/Produksi...`);
  console.log(`Public Base URL: ${publicBaseUrl}`);
  console.log(`Prodi Base URL : ${prodiBaseUrl}`);

  const VPS_CALLBACKS: Record<string, string> = {
    "unusu-lms": `${publicBaseUrl}/lms/sso/callback`,
    "lppm-unusu": `${publicBaseUrl}/lppm/sso/callback`,
    "lpm-unusu": `${publicBaseUrl}/lpm/sso/callback`,
    "esurat-unusu": `${publicBaseUrl}/esurat/sso/callback`,
    "sdm-sarpras-unusu": `${publicBaseUrl}/sarpras/sso/callback`,
    "unusu-akreditasi": `${publicBaseUrl}/akreditasi/sso/callback`,
    "prodi-unusu": `${prodiBaseUrl}/sso/callback`,
  };

  for (const [clientId, urlRedirect] of Object.entries(VPS_CALLBACKS)) {
    const app = await prisma.ssoApp.findUnique({ where: { clientId } });
    if (!app) {
      console.log(`Lewati ${clientId}: belum terdaftar.`);
      continue;
    }

    await prisma.ssoApp.update({ where: { clientId }, data: { urlRedirect } });
    console.log(`[VPS] ${clientId} -> ${urlRedirect}`);
  }

  console.log("Penyelarasan URL callback VPS selesai!");
}

main()
  .catch((error) => {
    console.error("Gagal menyelaraskan urlRedirect VPS:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
