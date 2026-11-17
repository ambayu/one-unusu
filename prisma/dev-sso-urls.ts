import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { LOCAL_DEV_CALLBACKS } from "../src/server/lib/ssoApps";

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
async function main() {
  for (const [clientId, urlRedirect] of Object.entries(LOCAL_DEV_CALLBACKS)) {
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
