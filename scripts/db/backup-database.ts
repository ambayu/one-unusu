/**
 * BACKUP LOGIS — ONE UNUSU
 * -----------------------------------------------------------------------------
 * Membuat dump SQL sebelum migrasi dijalankan. Wajib ada sebelum DDL dieksekusi
 * (lihat docs/database/SCHEMA_MIGRATION_PLAN.md §4 tahap 1).
 *
 * Pemakaian:
 *   npx tsx scripts/db/backup-database.ts
 *   npx tsx scripts/db/backup-database.ts --out=backups/pre_migration.sql
 *
 * Password TIDAK pernah ditulis ke argumen proses maupun ke layar: dikirim ke
 * mysqldump lewat variabel lingkungan MYSQL_PWD.
 */
import "dotenv/config";
import { mkdirSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}

const parsed = new URL(url);
const database = parsed.pathname.replace(/^\//, "");
const outArg = process.argv.find((a) => a.startsWith("--out="));
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outPath = outArg
  ? outArg.split("=")[1]
  : join("backups", `${database}_${stamp}.sql`);

mkdirSync(dirname(outPath), { recursive: true });

const args = [
  "--single-transaction", // konsisten tanpa mengunci tabel InnoDB
  "--quick",
  "--routines",
  "--triggers",
  "--default-character-set=utf8mb4",
  `--host=${parsed.hostname}`,
  `--port=${parsed.port || "3306"}`,
  `--user=${decodeURIComponent(parsed.username)}`,
  "--result-file=" + outPath,
  database,
];

console.log(`Membuat backup ${database} -> ${outPath}`);
const result = spawnSync("mysqldump", args, {
  env: { ...process.env, MYSQL_PWD: decodeURIComponent(parsed.password) },
  encoding: "utf8",
});

if (result.error) {
  console.error("Gagal menjalankan mysqldump:", result.error.message);
  console.error("Pastikan mysqldump ada di PATH (contoh Laragon: bin/mysql/mysql-8.0.30-winx64/bin).");
  process.exit(1);
}
if (result.status !== 0) {
  console.error("mysqldump keluar dengan kode", result.status);
  console.error(result.stderr);
  process.exit(1);
}

if (!existsSync(outPath)) {
  console.error("File backup tidak terbentuk.");
  process.exit(1);
}

const size = statSync(outPath).size;
if (size < 1024) {
  console.error(`File backup terlalu kecil (${size} byte) — periksa manual sebelum migrasi.`);
  process.exit(1);
}

console.log(`Selesai. Ukuran: ${(size / 1024).toFixed(1)} KB`);
console.log("Verifikasi cepat: cari baris 'CREATE TABLE' di dalam file backup.");
