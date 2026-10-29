import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

/**
 * Menyelaraskan urlRedirect aplikasi cabang dengan port pengembangan lokal.
 *
 * Nilai urlRedirect di produksi dibentuk dari SEED_PUBLIC_BASE_URL sehingga
 * selalu menunjuk domain tunggal. Di mesin lokal setiap aplikasi berjalan pada
 * port berbeda, jadi callback harus diarahkan ke port aplikasi masing-masing.
 * Jalankan setelah seed bila menguji alur SSO antar aplikasi di lokal:
 *
 *   npm run prisma:sso-dev-urls
 */
const DEV_CALLBACKS: Record<string, string> = {
  "unusu-lms": "http://localhost:3001/sso/callback",
  "lpm-unusu": "http://localhost:5177/sso/callback",
  "lppm-unusu": "http://localhost:5178/sso/callback",
  "esurat-unusu": "http://localhost:5175/sso/callback",
  "sdm-sarpras-unusu": "http://localhost:3003/sso/callback",
  "unusu-akreditasi": "http://localhost:3002/sso/callback",
};

async function main() {
  for (const [clientId, urlRedirect] of Object.entries(DEV_CALLBACKS)) {
    const app = await prisma.ssoApp.findUnique({ where: { clientId } });
    if (!app) {
      console.log(`Lewati ${clientId}: belum terdaftar sebagai aplikasi SSO.`);
      continue;
    }

    await prisma.ssoApp.update({ where: { clientId }, data: { urlRedirect } });
    console.log(`${clientId} -> ${urlRedirect}`);
  }
}

main()
  .catch((error) => {
    console.error("Gagal menyelaraskan urlRedirect aplikasi cabang:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
