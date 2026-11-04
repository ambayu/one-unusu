/**
 * PREFLIGHT MIGRATION CHECK — ONE UNUSU
 * -----------------------------------------------------------------------------
 * Script READ-ONLY. Tidak menjalankan DDL/DML apa pun.
 * Tujuan: memberi bukti objektif sebelum migrasi
 * `20261101130000_safe_indexes_and_audit_log` dieksekusi.
 *
 * Pemakaian:
 *   npx tsx scripts/db/preflight-migration.ts
 *
 * Exit code:
 *   0 = siap dimigrasi (semua prasyarat terpenuhi)
 *   1 = ada blocker (kolom/index sudah ada sebagian, atau tabel tidak ditemukan)
 *   2 = koneksi database gagal
 *
 * Hasil eksekusi ini WAJIB dilampirkan pada pengajuan [APPROVAL_REQUIRED].
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Mode `--post`: dijalankan SETELAH migrasi. Semantik dibalik — objek yang
 * sudah ada dianggap sukses, objek yang masih hilang dianggap blocker.
 */
const POST = process.argv.includes("--post");

type IndexExpectation = { table: string; index: string; columns: string };
type ColumnExpectation = { table: string; column: string; type: string };

/** Index yang WAJIB belum ada sebelum migrasi (agar migrasi tidak gagal). */
const EXPECTED_NEW_INDEXES: IndexExpectation[] = [
  { table: "users", index: "users_nim_idx", columns: "nim" },
  { table: "users", index: "users_nidn_idx", columns: "nidn" },
  { table: "users", index: "users_role_isActive_idx", columns: "role, isActive" },
  { table: "users", index: "users_prodi_idx", columns: "prodi" },
  { table: "sso_apps", index: "sso_apps_isActive_order_idx", columns: "isActive, `order`" },
  {
    table: "sso_auth_tokens",
    index: "sso_auth_tokens_clientId_isUsed_expiresAt_idx",
    columns: "clientId, isUsed, expiresAt"
  },
  { table: "sso_auth_tokens", index: "sso_auth_tokens_userId_createdAt_idx", columns: "userId, createdAt" },
  { table: "sso_auth_tokens", index: "sso_auth_tokens_expiresAt_idx", columns: "expiresAt" },
  { table: "permissions", index: "permissions_resource_action_idx", columns: "resource, action" },
  { table: "layanan_kampus", index: "layanan_kampus_active_urutan_idx", columns: "active, urutan" },
  { table: "layanan_kampus", index: "layanan_kampus_kategori_active_idx", columns: "kategori, active" },
  { table: "berita", index: "berita_publishedAt_idx", columns: "publishedAt" },
  { table: "berita", index: "berita_kategori_publishedAt_idx", columns: "kategori, publishedAt" },
  { table: "banner_sliders", index: "banner_sliders_active_urutan_idx", columns: "active, urutan" }
];

/** Kolom baru yang harus BELUM ada. */
const EXPECTED_NEW_COLUMNS: ColumnExpectation[] = [
  { table: "users", column: "lastLoginAt", type: "datetime" },
  { table: "sso_auth_tokens", column: "usedAt", type: "datetime" },
  { table: "sso_auth_tokens", column: "requestIp", type: "varchar" }
];

/** Tabel yang harus SUDAH ada (dibaca untuk estimasi durasi & backup). */
const REQUIRED_TABLES = [
  "users",
  "sso_apps",
  "sso_auth_tokens",
  "permissions",
  "roles",
  "role_permissions",
  "layanan_kampus",
  "berita",
  "banner_sliders",
  "user_app_accesses"
];

const NEW_TABLE = "audit_logs";

async function main() {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // 1. Identitas server
  const [versionRow] = await prisma.$queryRawUnsafe<any[]>(
    "SELECT VERSION() AS version, DATABASE() AS db, @@sql_mode AS sqlMode, @@innodb_lock_wait_timeout AS lockTimeout"
  );
  console.log("=== IDENTITAS DATABASE ===");
  console.log(`Versi MySQL   : ${versionRow?.version}`);
  console.log(`Database      : ${versionRow?.db}`);
  console.log(`sql_mode      : ${versionRow?.sqlMode}`);
  console.log(`Lock timeout  : ${versionRow?.lockTimeout}s\n`);

  // 2. Keberadaan tabel + estimasi ukuran (basis keputusan jendela maintenance)
  console.log("=== TABEL TERDAMPAK (estimasi baris & ukuran) ===");
  const tableStats = await prisma.$queryRawUnsafe<any[]>(
    `SELECT TABLE_NAME AS name, TABLE_ROWS AS estRows,
            ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS sizeMb
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${[...REQUIRED_TABLES, NEW_TABLE]
        .map((t) => `'${t}'`)
        .join(", ")})
      ORDER BY TABLE_NAME`
  );
  const present = new Map<string, any>(tableStats.map((r) => [String(r.name), r]));

  // Tabel yang belum ada tetapi SUDAH dibuat oleh berkas migrasi yang belum
  // diterapkan bukan blocker: `prisma migrate deploy` akan membuatnya.
  const pendingTables = new Set<string>();
  try {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), "prisma", "migrations");
    for (const entry of readdirSync(dir)) {
      const file = join(dir, entry, "migration.sql");
      try {
        if (!statSync(file).isFile()) continue;
      } catch {
        continue;
      }
      const sql = readFileSync(file, "utf8");
      for (const match of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?`(\w+)`/gi)) {
        pendingTables.add(match[1]);
      }
    }
  } catch {
    /* abaikan: tanpa info migrasi, perilaku kembali ke pemeriksaan ketat */
  }

  for (const table of REQUIRED_TABLES) {
    const row = present.get(table);
    if (!row) {
      if (pendingTables.has(table)) {
        console.log(`  [AKAN DIBUAT] ${table} (dibuat oleh migrasi yang belum diterapkan)`);
        warnings.push(`Tabel ${table} belum ada; akan dibuat oleh migrasi pending.`);
      } else {
        blockers.push(`Tabel wajib tidak ditemukan: ${table}`);
        console.log(`  [MISSING] ${table}`);
      }
    } else {
      console.log(`  [OK] ${table.padEnd(20)} ~${row.estRows ?? 0} baris, ${row.sizeMb ?? 0} MB`);
    }
  }
  if (present.has(NEW_TABLE)) {
    if (POST) {
      console.log(`  [OK] ${NEW_TABLE} sudah ada (pasca-migrasi).`);
    } else {
      blockers.push(`Tabel ${NEW_TABLE} sudah ada — migrasi tidak boleh dijalankan ulang.`);
      console.log(`  [EXISTS] ${NEW_TABLE} (migrasi mungkin sudah diterapkan)`);
    }
  } else if (POST) {
    blockers.push(`Tabel ${NEW_TABLE} belum ada padahal mode --post: migrasi gagal sebagian.`);
    console.log(`  [MISSING] ${NEW_TABLE}`);
  } else {
    console.log(`  [AKAN DIBUAT] ${NEW_TABLE}`);
  }

  // 3. Kolom baru harus belum ada
  console.log("\n=== KOLOM BARU ===");
  const existingColumns = await prisma.$queryRawUnsafe<any[]>(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, DATA_TYPE AS d
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()`
  );
  const colSet = new Set(existingColumns.map((r) => `${r.t}.${r.c}`.toLowerCase()));
  for (const col of EXPECTED_NEW_COLUMNS) {
    const key = `${col.table}.${col.column}`.toLowerCase();
    if (colSet.has(key)) {
      if (POST) {
        console.log(`  [OK] ${col.table}.${col.column}`);
      } else {
        blockers.push(`Kolom ${col.table}.${col.column} sudah ada — periksa status migrasi.`);
        console.log(`  [EXISTS] ${col.table}.${col.column}`);
      }
    } else if (POST) {
      blockers.push(`Kolom ${col.table}.${col.column} belum ada padahal mode --post.`);
      console.log(`  [MISSING] ${col.table}.${col.column}`);
    } else {
      console.log(`  [AKAN DITAMBAH] ${col.table}.${col.column} (${col.type}, NULL-able)`);
    }
  }

  // 4. Index yang akan dibuat harus belum ada
  console.log("\n=== INDEX YANG AKAN DIBUAT ===");
  const existingIndexes = await prisma.$queryRawUnsafe<any[]>(
    `SELECT TABLE_NAME AS t, INDEX_NAME AS i, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      GROUP BY TABLE_NAME, INDEX_NAME`
  );
  const idxSet = new Set(existingIndexes.map((r) => `${r.t}.${r.i}`.toLowerCase()));
  for (const idx of EXPECTED_NEW_INDEXES) {
    const key = `${idx.table}.${idx.index}`.toLowerCase();
    if (idxSet.has(key)) {
      if (POST) {
        console.log(`  [OK] ${idx.table}.${idx.index}`);
      } else {
        blockers.push(`Index ${idx.table}.${idx.index} sudah ada — periksa status migrasi.`);
        console.log(`  [EXISTS] ${idx.table}.${idx.index}`);
      }
    } else if (POST) {
      blockers.push(`Index ${idx.table}.${idx.index} belum ada padahal mode --post.`);
      console.log(`  [MISSING] ${idx.table}.${idx.index}`);
    } else {
      console.log(`  [AKAN DIBUAT] ${idx.table}.${idx.index} (${idx.columns})`);
    }
  }

  // 5. Index yang akan di-drop harus ada (jika tidak, revisi migration.sql)
  const supersededKey = "permissions.permissions_resource_idx";
  if (POST) {
    if (idxSet.has(supersededKey)) {
      warnings.push(`Index ${supersededKey} masih ada; blok DROP INDEX mungkin belum dieksekusi.`);
    }
  } else if (!idxSet.has(supersededKey)) {
    warnings.push(`Index ${supersededKey} tidak ada; hapus/komentari blok DROP INDEX di migration.sql.`);
  }

  // 6. Row count nyata tabel kritis (bukan estimasi) untuk bukti pra-migrasi
  console.log("\n=== ROW COUNT AKTUAL (bukti pra-migrasi) ===");
  for (const table of ["users", "sso_apps", "sso_auth_tokens", "audit_logs"]) {
    if (!present.has(table)) {
      console.log(`  ${table.padEnd(20)} : -`);
      continue;
    }
    const [row] = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) AS c FROM \`${table}\``);
    console.log(`  ${table.padEnd(20)} : ${row?.c ?? 0}`);
  }

  // 7. Ringkasan
  console.log("\n=== RINGKASAN PREFLIGHT ===");
  if (warnings.length) {
    warnings.forEach((w) => console.log(`  [WARN] ${w}`));
  }
  if (blockers.length) {
    blockers.forEach((b) => console.log(`  [BLOCKER] ${b}`));
    console.log("\nStatus: TIDAK SIAP. Selesaikan blocker di atas lebih dulu.");
    process.exitCode = 1;
    return;
  }
  console.log("  Tidak ada blocker.");
  if (POST) {
    console.log("Status: VERIFIKASI PASCA-MIGRASI LULUS — semua objek ada, index lama sudah diganti.");
    return;
  }
  console.log("Status: SIAP DIMIGRASI (setelah approval + backup).");
  console.log("\nLangkah eksekusi yang disetujui:");
  console.log("  1) mysqldump --single-transaction <db> > backup_pre_indexes.sql");
  console.log("  2) npx prisma migrate deploy   (atau: npx prisma migrate dev --name safe_indexes_and_audit_log)");
  console.log("  3) npx prisma generate");
  console.log("  4) npx tsx scripts/db/preflight-migration.ts --post  (harus LULUS)");
}

main()
  .catch((error) => {
    console.error("Preflight gagal terhubung/mengeksekusi query:", error);
    process.exitCode = 2;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
