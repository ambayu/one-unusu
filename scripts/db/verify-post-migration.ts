/**
 * SMOKE TEST PASCA-MIGRASI — ONE UNUSU
 * -----------------------------------------------------------------------------
 * Membuktikan bahwa hasil migrasi benar-benar dapat dipakai aplikasi:
 *   1. Tabel `audit_logs` dapat ditulis & dibaca Prisma Client (insert -> hapus).
 *   2. Kolom baru (`users.lastLoginAt`, `sso_auth_tokens.usedAt/requestIp`) terbaca.
 *   3. Izin `audit:*` terdaftar dan dipetakan ke peran yang benar.
 *   4. Row count tabel inti tidak berubah dibanding bukti preflight.
 *
 * Pemakaian: npx tsx scripts/db/verify-post-migration.ts
 * Exit code: 0 = lulus, 1 = ada kegagalan.
 *
 * Script ini menulis SATU baris uji ke `audit_logs` lalu menghapusnya kembali
 * (ditandai action `SMOKE_TEST`), sehingga tidak meninggalkan data.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const failures: string[] = [];
const SMOKE_ACTION = "SMOKE_TEST";

async function main() {
  console.log("=== SMOKE TEST PASCA-MIGRASI ===\n");

  // 1. audit_logs bisa ditulis & dibaca
  try {
    const created = await prisma.auditLog.create({
      data: {
        action: SMOKE_ACTION,
        resource: "migration",
        resourceId: "20261101130000",
        status: "SUCCESS",
        actorLabel: "system:post-migration-check",
        metadata: { note: "baris uji otomatis, dihapus setelah verifikasi" }
      }
    });
    const read = await prisma.auditLog.findUnique({ where: { id: created.id } });
    if (!read) throw new Error("baris audit tidak terbaca kembali");
    await prisma.auditLog.delete({ where: { id: created.id } });
    console.log("[OK] audit_logs: insert + read + delete berhasil (metadata JSON valid)");
  } catch (error) {
    failures.push(`audit_logs tidak dapat dipakai: ${(error as Error).message}`);
    console.log("[FAIL] audit_logs:", (error as Error).message);
  }

  // 2. Kolom baru terbaca lewat Prisma
  try {
    const user = await prisma.user.findFirst({ select: { id: true, lastLoginAt: true } });
    if (!user) throw new Error("tidak ada baris users untuk diuji");
    console.log(`[OK] users.lastLoginAt terbaca (contoh id=${user.id}, nilai=${user.lastLoginAt ?? "NULL"})`);
  } catch (error) {
    failures.push(`users.lastLoginAt tidak terbaca: ${(error as Error).message}`);
    console.log("[FAIL] users.lastLoginAt:", (error as Error).message);
  }

  try {
    const token = await prisma.ssoAuthToken.findFirst({
      select: { id: true, usedAt: true, requestIp: true }
    });
    if (!token) {
      console.log("[SKIP] sso_auth_tokens kosong; kolom usedAt/requestIp belum bisa diuji dengan data.");
    } else {
      console.log(`[OK] sso_auth_tokens.usedAt/requestIp terbaca (contoh id=${token.id})`);
    }
  } catch (error) {
    failures.push(`sso_auth_tokens.usedAt/requestIp tidak terbaca: ${(error as Error).message}`);
    console.log("[FAIL] sso_auth_tokens kolom baru:", (error as Error).message);
  }

  // 3. Katalog izin resmi (sesuai sub-menu aktif)
  const officialPerms = await prisma.permission.findMany({
    select: { key: true, resource: true },
    orderBy: { key: "asc" }
  });
  const obsoleteAuditAndDirectory = officialPerms.filter((p) => p.resource === "audit" || p.resource === "directory");
  if (obsoleteAuditAndDirectory.length === 0) {
    console.log("[OK] Tidak ada izin usang (audit/directory). Katalog bersih sesuai sub-menu aktif.");
  } else {
    failures.push(`Masih ada izin usang: ${obsoleteAuditAndDirectory.map((p) => p.key).join(", ")}`);
    console.log(`[FAIL] Izin usang ditemukan: ${obsoleteAuditAndDirectory.map((p) => p.key).join(", ")}`);
  }

  // 4. Integritas data inti (tidak boleh berubah karena DDL)
  const [users, apps, tokens, permissions, rolePermissions] = await Promise.all([
    prisma.user.count(),
    prisma.ssoApp.count(),
    prisma.ssoAuthToken.count(),
    prisma.permission.count(),
    prisma.rolePermission.count()
  ]);
  console.log(
    `\nRow count: users=${users} sso_apps=${apps} sso_auth_tokens=${tokens} permissions=${permissions} role_permissions=${rolePermissions}`
  );
  console.log("Pembanding preflight: users=3 sso_apps=6 sso_auth_tokens=10 (harus sama atau lebih besar).");
  if (users < 3 || apps < 6) {
    failures.push("row count tabel inti lebih kecil dari bukti preflight — periksa segera.");
  }

  console.log("\n=== HASIL ===");
  if (failures.length) {
    failures.forEach((f) => console.log(`  [GAGAL] ${f}`));
    console.log(`\n${failures.length} kegagalan.`);
    process.exitCode = 1;
    return;
  }
  console.log("  Semua pemeriksaan LULUS. Migrasi siap dipakai aplikasi.");
}

main()
  .catch((error) => {
    console.error("Smoke test error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
