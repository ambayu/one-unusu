/**
 * MIGRATION PARITY CHECK — ONE UNUSU (STATIS, TANPA DATABASE)
 * -----------------------------------------------------------------------------
 * Membandingkan `prisma/schema.prisma` dengan seluruh berkas migrasi di
 * `prisma/migrations/**\/migration.sql`.
 *
 * Yang dideteksi (drift):
 *   1. Model/tabel yang belum punya `CREATE TABLE`.
 *   2. Kolom yang belum pernah ditambahkan oleh migrasi mana pun.
 *   3. `@@index` / `@@unique` di schema yang tidak pernah dibuat oleh migrasi.
 *   4. Index di migrasi yang tidak lagi dideklarasikan di schema (index yatim).
 *
 * Script ini TIDAK menyentuh database dan TIDAK menjalankan Prisma Client,
 * sehingga aman dijalankan kapan pun (termasuk di CI sebelum approval DDL).
 *
 * Pemakaian:
 *   npx tsx scripts/db/verify-migration-parity.ts
 *
 * Exit code: 0 = schema & migrasi selaras, 1 = ada drift.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCHEMA_PATH = join(ROOT, "prisma", "schema.prisma");
const MIGRATIONS_DIR = join(ROOT, "prisma", "migrations");

type TableSpec = {
  model: string;
  table: string;
  columns: string[]; // nama kolom skalar (bukan relasi)
  indexes: string[][]; // daftar kolom untuk @@index
  uniques: string[][]; // daftar kolom untuk @@unique / @unique
};

type SqlSpec = {
  tables: Map<string, Set<string>>; // table -> kolom
  indexes: Map<string, string[]>; // "table::col1,col2" -> nama index
  indexNames: Map<string, string>; // nama index -> "table::col1,col2"
  tablesWithoutPk: Set<string>; // tabel AUTO_INCREMENT tanpa PRIMARY KEY (MySQL error 1075)
};

function stripComments(line: string): string {
  return line.replace(/\/\/.*$/, "").trimEnd();
}

function parseSchema(): Map<string, TableSpec> {
  const source = readFileSync(SCHEMA_PATH, "utf8");
  const models = new Map<string, TableSpec>();

  const blocks = [...source.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
  // Nama model dikumpulkan lebih dulu: hanya field bertipe model (= relasi)
  // yang dilewati, sedangkan tipe skalar (String, Int, Boolean, DateTime,
  // enum) WAJIB dihitung sebagai kolom.
  const modelNames = new Set(blocks.map((block) => block[1]));

  for (const block of blocks) {
    const model = block[1];
    const body = block[2];
    const lines = body.split(/\r?\n/).map((line) => stripComments(line)).filter(Boolean);

    let table = model;
    const columns: string[] = [];
    const indexes: string[][] = [];
    const uniques: string[][] = [];

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      const mapMatch = line.match(/@@map\("([^"]+)"\)/);
      if (mapMatch) {
        table = mapMatch[1];
        continue;
      }

      const indexMatch = line.match(/@@index\(\[([^\]]+)\]\)/);
      if (indexMatch) {
        indexes.push(
          indexMatch[1]
            .split(",")
            .map((c) => c.trim().replace(/[`"']/g, "").replace(/\s+(asc|desc)$/i, ""))
        );
        continue;
      }

      const uniqueMatch = line.match(/@@unique\(\[([^\]]+)\]\)/);
      if (uniqueMatch) {
        uniques.push(uniqueMatch[1].split(",").map((c) => c.trim().replace(/[`"']/g, "")));
        continue;
      }

      if (line.startsWith("@@")) continue;

      // field: `nama  Tipe?  @attr`
      const fieldMatch = line.match(/^(\w+)\s+([\w.[\]()]+)(\?|\[\])?/);
      if (!fieldMatch) continue;
      const [, name, type] = fieldMatch;
      const baseType = type.replace(/\[\]$/, "");

      // Relasi (tipe = nama model) tidak menghasilkan kolom pada model pemilik;
      // kolom FK dibuat oleh field skalar pasangannya (mis. `roleId Int`).
      // `SsoAuthToken[]` / `UserAppAccess[]` juga relasi list, bukan kolom.
      if (modelNames.has(baseType)) continue;

      columns.push(name);

      if (line.includes("@unique") && !line.includes("@@")) {
        uniques.push([name]);
      }
    }

    models.set(table, { model, table, columns, indexes, uniques });
  }

  return models;
}

function readMigrationFiles(): string[] {
  if (!statSync(MIGRATIONS_DIR).isDirectory()) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((entry) => {
      const full = join(MIGRATIONS_DIR, entry);
      return statSync(full).isDirectory();
    })
    .sort()
    .map((entry) => join(MIGRATIONS_DIR, entry, "migration.sql"))
    .filter((file) => {
      try {
        return statSync(file).isFile();
      } catch {
        return false;
      }
    });
}

function splitColumns(raw: string): string[] {
  return raw
    .split(",")
    .map((c) => c.trim().replace(/[`"']/g, "").replace(/\s+(asc|desc)$/i, ""))
    .filter(Boolean);
}

function parseSql(files: string[]): SqlSpec {
  const tables = new Map<string, Set<string>>();
  const indexes = new Map<string, string[]>();
  const indexNames = new Map<string, string>();
  const tablesWithoutPk = new Set<string>();

  const addColumn = (table: string, column: string) => {
    if (!tables.has(table)) tables.set(table, new Set());
    tables.get(table)!.add(column);
  };
  const addIndex = (table: string, name: string, cols: string[]) => {
    const key = `${table}::${cols.join(",")}`;
    indexes.set(key, cols);
    indexNames.set(name, key);
  };

  for (const file of files) {
    const sql = readFileSync(file, "utf8");

    // CREATE TABLE `x` ( ... );
    for (const match of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?`(\w+)`\s*\(([\s\S]*?)\n\)\s*(?:DEFAULT|ENGINE|;)/g)) {
      const table = match[1];
      if (!tables.has(table)) tables.set(table, new Set());
      let hasPk = false;
      let hasAutoIncrement = false;

      for (const line of match[2].split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("--")) continue;
        if (/AUTO_INCREMENT/i.test(trimmed)) hasAutoIncrement = true;

        const inlineIndex = trimmed.match(/^(?:UNIQUE )?INDEX `(\w+)`\s*\(([^)]+)\)/i);
        if (inlineIndex) {
          addIndex(table, inlineIndex[1], splitColumns(inlineIndex[2]));
          continue;
        }
        if (/^PRIMARY KEY/i.test(trimmed)) {
          hasPk = true;
          continue;
        }
        if (/^CONSTRAINT/i.test(trimmed) || /^FOREIGN KEY/i.test(trimmed)) {
          continue;
        }
        const colMatch = trimmed.match(/^`(\w+)`\s+\w/);
        if (colMatch) addColumn(table, colMatch[1]);
      }

      // MySQL menolak (error 1075) tabel ber-AUTO_INCREMENT tanpa PRIMARY KEY.
      if (hasAutoIncrement && !hasPk) tablesWithoutPk.add(table);
    }

    // ALTER TABLE `x` ADD [UNIQUE] INDEX `y` (`a`, `b`) [,...];
    for (const match of sql.matchAll(/ALTER TABLE `(\w+)`\s+ADD (?:UNIQUE )?INDEX `(\w+)`\s*\(([^)]+)\)/gi)) {
      addIndex(match[1], match[2], splitColumns(match[3]));
    }

    // CREATE [UNIQUE] INDEX `y` ON `x` (`a`);
    for (const match of sql.matchAll(/CREATE (?:UNIQUE )?INDEX `(\w+)` ON `(\w+)`\s*\(([^)]+)\)/gi)) {
      addIndex(match[2], match[1], splitColumns(match[3]));
    }

    // ALTER TABLE `x` ADD COLUMN `c` ... (bisa multi-kolom dalam satu statement)
    for (const match of sql.matchAll(/ALTER TABLE `(\w+)`\s+([\s\S]*?);/g)) {
      const table = match[1];
      for (const col of match[2].matchAll(/ADD COLUMN `(\w+)`/gi)) {
        addColumn(table, col[1]);
      }
    }

    // ALTER TABLE `x` DROP INDEX `y`;
    for (const match of sql.matchAll(/ALTER TABLE `(\w+)`\s+DROP INDEX `(\w+)`/gi)) {
      const key = indexNames.get(match[2]);
      if (key) {
        indexes.delete(key);
        indexNames.delete(match[2]);
      }
    }

    // DROP TABLE `x`;
    for (const match of sql.matchAll(/DROP TABLE (?:IF EXISTS )?`(\w+)`/gi)) {
      tables.delete(match[1]);
    }
  }

  return { tables, indexes, indexNames, tablesWithoutPk };
}

function main(): void {
  const schema = parseSchema();
  const files = readMigrationFiles();
  const sql = parseSql(files);

  const problems: string[] = [];
  const notes: string[] = [];

  console.log("=== MIGRATION PARITY CHECK (statis, tanpa database) ===");
  console.log(`Schema    : prisma/schema.prisma (${schema.size} model)`);
  console.log(`Migrasi   : ${files.length} berkas\n`);

  for (const spec of schema.values()) {
    const sqlColumns = sql.tables.get(spec.table);

    if (!sqlColumns) {
      problems.push(`[TABEL] ${spec.model} -> tabel \`${spec.table}\` belum pernah dibuat migrasi.`);
      continue;
    }

    for (const column of spec.columns) {
      if (!sqlColumns.has(column)) {
        problems.push(`[KOLOM] ${spec.table}.${column} ada di schema tetapi belum ada di migrasi.`);
      }
    }

    const declared: string[][] = [...spec.indexes, ...spec.uniques];
    for (const cols of declared) {
      const key = `${spec.table}::${cols.join(",")}`;
      const exists =
        sql.indexes.has(key) ||
        // index komposit yang diawali kolom yang sama (prefix) tetap dianggap tertutup
        [...sql.indexes.keys()].some((k) => k.startsWith(`${spec.table}::`) && k.slice(spec.table.length + 2).split(",").join(",") === cols.join(","));
      if (!exists) {
        problems.push(`[INDEX] ${spec.table}(${cols.join(", ")}) dideklarasikan di schema tetapi tidak ada di migrasi.`);
      }
    }

    const declaredKeys = new Set(declared.map((cols) => `${spec.table}::${cols.join(",")}`));
    for (const key of sql.indexes.keys()) {
      if (!key.startsWith(`${spec.table}::`)) continue;
      if (declaredKeys.has(key)) continue;
      notes.push(`[INDEX YATIM] ${key.replace("::", "(").replace(/,/g, ", ")} ) ada di migrasi tetapi tidak di schema.`);
    }
  }

  for (const table of sql.tables.keys()) {
    if (![...schema.values()].some((spec) => spec.table === table)) {
      notes.push(`[TABEL YATIM] \`${table}\` dibuat migrasi tetapi tidak ada model di schema.`);
    }
  }

  // Tabel ber-AUTO_INCREMENT tanpa PRIMARY KEY pasti gagal saat deploy (MySQL 1075).
  for (const table of sql.tablesWithoutPk) {
    problems.push(
      `[PRIMARY KEY] \`${table}\` memakai AUTO_INCREMENT tanpa PRIMARY KEY -> MySQL error 1075 saat migrate deploy.`
    );
  }

  if (problems.length) {
    console.log("--- DRIFT YANG HARUS DIPERBAIKI ---");
    problems.forEach((p) => console.log(`  ${p}`));
    console.log("");
  }
  if (notes.length) {
    console.log("--- CATATAN (index/tabel di luar schema) ---");
    notes.forEach((n) => console.log(`  ${n}`));
    console.log("");
  }

  if (!problems.length && !notes.length) {
    console.log("Hasil: SELARAS. Setiap model, kolom, dan index di schema punya jejak migrasi.");
  } else if (!problems.length) {
    console.log("Hasil: SELARAS untuk objek wajib. Catatan di atas bersifat informatif.");
  } else {
    console.log(`Hasil: ${problems.length} drift ditemukan. Migrasi BELUM boleh diajukan sebelum diperbaiki.`);
    process.exitCode = 1;
  }
}

main();
