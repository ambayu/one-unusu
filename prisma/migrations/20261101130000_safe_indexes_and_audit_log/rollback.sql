-- =============================================================================
-- ROLLBACK : 20261101130000_safe_indexes_and_audit_log
-- JANGAN dijalankan otomatis oleh Prisma (bukan bagian dari migration.sql).
-- Gunakan hanya bila migrasi perlu dibatalkan secara manual.
-- PERINGATAN: DROP TABLE `audit_logs` menghapus data audit. Ekspor dulu:
--   SELECT * FROM audit_logs INTO OUTFILE '/tmp/audit_logs_backup.csv'
--   FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\n';
-- =============================================================================

-- 1. Kembalikan index yang digantikan
ALTER TABLE `permissions` ADD INDEX `permissions_resource_idx` (`resource`), ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `permissions` DROP INDEX `permissions_resource_action_idx`, ALGORITHM=INPLACE, LOCK=NONE;

-- 2. Lepas index pendukung (urutan dibalik dari migration.sql)
ALTER TABLE `banner_sliders` DROP INDEX `banner_sliders_active_urutan_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `berita` DROP INDEX `berita_kategori_publishedAt_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `berita` DROP INDEX `berita_publishedAt_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `layanan_kampus` DROP INDEX `layanan_kampus_kategori_active_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `layanan_kampus` DROP INDEX `layanan_kampus_active_urutan_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `sso_auth_tokens` DROP INDEX `sso_auth_tokens_expiresAt_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `sso_auth_tokens` DROP INDEX `sso_auth_tokens_userId_createdAt_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `sso_auth_tokens` DROP INDEX `sso_auth_tokens_clientId_isUsed_expiresAt_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `sso_apps` DROP INDEX `sso_apps_isActive_order_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `users` DROP INDEX `users_prodi_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `users` DROP INDEX `users_role_isActive_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `users` DROP INDEX `users_nidn_idx`, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `users` DROP INDEX `users_nim_idx`, ALGORITHM=INPLACE, LOCK=NONE;

-- 3. Hapus tabel audit (DATA HILANG - pastikan sudah diekspor)
DROP TABLE IF EXISTS `audit_logs`;

-- 4. Lepas kolom jejak (DATA HILANG pada kolom tersebut)
ALTER TABLE `sso_auth_tokens` DROP COLUMN `requestIp`;
ALTER TABLE `sso_auth_tokens` DROP COLUMN `usedAt`;
ALTER TABLE `users` DROP COLUMN `lastLoginAt`;

-- 5. Kolom `banner_sliders.gambarMobileUrl` (bagian rekonsiliasi drift)
ALTER TABLE `banner_sliders` DROP COLUMN `gambarMobileUrl`;

-- 6. CATATAN: pelebaran tipe TIDAK dibalik oleh rollback.
--    `banner_sliders.gambarUrl` (LONGTEXT) dan `berita.konten` (NULL-able)
--    sengaja dibiarkan pada tipe yang lebih longgar: menyempitkan kembali
--    berisiko memotong data yang sudah tersimpan. Bila benar-benar harus
--    dikembalikan, jalankan manual SETELAH memastikan tidak ada nilai
--    melebihi 191 karakter dan tidak ada `konten` bernilai NULL:
--      -- ALTER TABLE `banner_sliders` MODIFY COLUMN `gambarUrl` VARCHAR(191) NOT NULL;
--      -- ALTER TABLE `berita` MODIFY COLUMN `konten` LONGTEXT NOT NULL;
