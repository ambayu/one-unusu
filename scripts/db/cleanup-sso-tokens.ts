/**
 * HOUSEKEEPING TOKEN SSO — ONE UNUSU
 * -----------------------------------------------------------------------------
 * Menghapus `sso_auth_tokens` yang sudah kedaluwarsa secara BERTAHAP (batched),
 * sehingga tidak menahan lock lama dan memanfaatkan index `expiresAt`.
 *
 * DEFAULT = DRY RUN (hanya menghitung). Tidak ada baris yang dihapus tanpa flag.
 *
 * Pemakaian:
 *   npx tsx scripts/db/cleanup-sso-tokens.ts                 # dry run
 *   npx tsx scripts/db/cleanup-sso-tokens.ts --apply         # hapus sungguhan
 *   npx tsx scripts/db/cleanup-sso-tokens.ts --apply --days=7 --batch=2000
 *
 * Token kedaluwarsa tidak diperlukan lagi: tiket SSO hanya hidup 5 menit dan
 * bersifat single-use. Retensi tambahan (default 1 hari) menjaga jejak forensik
 * jangka pendek untuk investigasi replay attack.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const daysArg = args.find((a) => a.startsWith("--days="));
const batchArg = args.find((a) => a.startsWith("--batch="));

const retentionDays = Math.max(1, Number(daysArg?.split("=")[1] ?? 1));
const batchSize = Math.min(10000, Math.max(100, Number(batchArg?.split("=")[1] ?? 2000)));
const MAX_BATCHES = 100; // pengaman agar tidak berjalan tanpa henti

async function main() {
  const [countRow] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) AS c
       FROM sso_auth_tokens
      WHERE expiresAt < NOW() - INTERVAL ${retentionDays} DAY`
  );
  const total = Number(countRow?.c ?? 0);

  console.log("=== CLEANUP sso_auth_tokens ===");
  console.log(`Mode            : ${apply ? "APPLY (menghapus)" : "DRY RUN (tidak menghapus)"}`);
  console.log(`Retensi         : ${retentionDays} hari setelah expiresAt`);
  console.log(`Batch size      : ${batchSize}`);
  console.log(`Kandidat hapus  : ${total} baris\n`);

  if (!apply || total === 0) {
    if (!apply && total > 0) {
      console.log("Jalankan ulang dengan --apply untuk benar-benar menghapus.");
    }
    return;
  }

  let deleted = 0;
  for (let i = 0; i < MAX_BATCHES; i += 1) {
    // DELETE ... ORDER BY expiresAt LIMIT n -> memakai index expiresAt dan
    // membatasi durasi lock per transaksi.
    const affected = await prisma.$executeRawUnsafe(
      `DELETE FROM sso_auth_tokens
        WHERE expiresAt < NOW() - INTERVAL ${retentionDays} DAY
        ORDER BY expiresAt
        LIMIT ${batchSize}`
    );
    deleted += Number(affected ?? 0);
    console.log(`  batch ${i + 1}: terhapus ${affected} (total ${deleted}/${total})`);
    if (!affected) break;
  }

  console.log(`\nSelesai. Total terhapus: ${deleted} baris.`);
}

main()
  .catch((error) => {
    console.error("Cleanup gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
