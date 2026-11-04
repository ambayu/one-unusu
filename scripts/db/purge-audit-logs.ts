/**
 * RETENSI AUDIT LOG — ONE UNUSU
 * -----------------------------------------------------------------------------
 * Menghapus `audit_logs` yang lebih tua dari masa retensi, BERTAHAP per batch
 * (memakai index `audit_logs_createdAt_idx`).
 *
 * DEFAULT = DRY RUN. Tidak ada baris yang dihapus tanpa `--apply`.
 *
 * Pemakaian:
 *   npx tsx scripts/db/purge-audit-logs.ts                      # dry run
 *   npx tsx scripts/db/purge-audit-logs.ts --apply              # retensi 180 hari
 *   npx tsx scripts/db/purge-audit-logs.ts --apply --days=365 --batch=1000
 *
 * Kebijakan: 180 hari sesuai docs/database/SCHEMA_MIGRATION_PLAN.md §6.
 * Sebelum `--apply` pada data yang masih dibutuhkan untuk audit eksternal,
 * ekspor lebih dulu (SELECT ... INTO OUTFILE atau panel ekspor audit).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const daysArg = args.find((a) => a.startsWith("--days="));
const batchArg = args.find((a) => a.startsWith("--batch="));

const retentionDays = Math.max(30, Number(daysArg?.split("=")[1] ?? 180));
const batchSize = Math.min(5000, Math.max(100, Number(batchArg?.split("=")[1] ?? 1000)));
const MAX_BATCHES = 200;

async function main() {
  const [countRow] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) AS c FROM audit_logs WHERE createdAt < NOW() - INTERVAL ${retentionDays} DAY`
  );
  const total = Number(countRow?.c ?? 0);

  console.log("=== RETENSI audit_logs ===");
  console.log(`Mode           : ${apply ? "APPLY (menghapus)" : "DRY RUN (tidak menghapus)"}`);
  console.log(`Retensi        : ${retentionDays} hari (minimum 30)`);
  console.log(`Batch size     : ${batchSize}`);
  console.log(`Kandidat hapus : ${total} baris\n`);

  if (!apply || total === 0) {
    if (!apply && total > 0) console.log("Jalankan ulang dengan --apply untuk menghapus.");
    return;
  }

  let deleted = 0;
  for (let i = 0; i < MAX_BATCHES; i += 1) {
    const affected = await prisma.$executeRawUnsafe(
      `DELETE FROM audit_logs
        WHERE createdAt < NOW() - INTERVAL ${retentionDays} DAY
        ORDER BY createdAt
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
    console.error("Retensi audit gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
