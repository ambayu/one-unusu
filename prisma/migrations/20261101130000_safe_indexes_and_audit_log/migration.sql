-- =============================================================================
-- Migration : 20261101130000_safe_indexes_and_audit_log
-- Project   : ONE UNUSU (MySQL 8, InnoDB, utf8mb4)
-- Sifat     : ADITIF. Tidak ada DROP TABLE / DROP COLUMN / rename kolom.
--             Satu-satunya operasi non-aditif adalah penghapusan index yang
--             sudah digantikan (permissions_resource_idx -> (resource, action)),
--             bersifat metadata-only dan instan untuk dibalik (lihat rollback.sql).
-- Tujuan    : 1. Index pendukung query nyata di src/server/index.ts
--             2. Tabel audit_logs (append-only) untuk tata kelola & forensik
--             3. Kolom jejak: users.lastLoginAt, sso_auth_tokens.usedAt/requestIp
-- Prasyarat : Backup logis sudah dibuat + script preflight dijalankan.
--             Jalankan HANYA setelah [APPROVAL_REQUIRED] disetujui.
-- Estimasi  : < 5 detik pada dataset saat ini (semua tabel < 10k baris).
-- Catatan   : ALGORITHM=INPLACE, LOCK=NONE mencegah blocking read/write.
--             Bila MySQL menolak hint tersebut, migrasi GAGAL AMAN sebelum
--             menyentuh data -> jalankan ulang tanpa hint (lihat docs).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. REKONSILIASI DRIFT (schema.prisma vs database saat ini)
--    Ditemukan oleh `npx tsx scripts/db/verify-migration-parity.ts`:
--    a. `banner_sliders.gambarMobileUrl` belum pernah dibuat oleh migrasi mana pun.
--    b. `banner_sliders.gambarUrl` masih VARCHAR(191) padahal schema @db.LongText
--       -> data URL base64 (>191 char) gagal dengan "Data too long for column".
--    c. `berita.konten` masih NOT NULL padahal schema `String?` (draf tanpa isi).
--    Semua langkah di bawah MELEBARKAN tipe atau MENAMBAH kolom: tidak ada
--    pemotongan data. (b) mengubah VARCHAR -> LONGTEXT sehingga memakai
--    ALGORITHM=COPY dan menahan write singkat pada `banner_sliders`
--    (tabel kecil, biasanya < 50 baris).
-- -----------------------------------------------------------------------------
ALTER TABLE `banner_sliders`
  ADD COLUMN `gambarMobileUrl` LONGTEXT NULL;

ALTER TABLE `banner_sliders`
  MODIFY COLUMN `gambarUrl` LONGTEXT NOT NULL;

ALTER TABLE `berita`
  MODIFY COLUMN `konten` LONGTEXT NULL;

-- -----------------------------------------------------------------------------
-- 1. KOLOM JEJAK (NULL-able, tanpa default -> kompatibel data lama)
-- -----------------------------------------------------------------------------
ALTER TABLE `users`
  ADD COLUMN `lastLoginAt` DATETIME(3) NULL;

ALTER TABLE `sso_auth_tokens`
  ADD COLUMN `usedAt` DATETIME(3) NULL,
  ADD COLUMN `requestIp` VARCHAR(45) NULL;

-- -----------------------------------------------------------------------------
-- 2. TABEL AUDIT LOG (append-only)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         INTEGER NOT NULL AUTO_INCREMENT,
  `actorId`    INTEGER NULL,
  `actorLabel` VARCHAR(191) NULL,
  `action`     VARCHAR(60) NOT NULL,
  `resource`   VARCHAR(60) NOT NULL,
  `resourceId` VARCHAR(64) NULL,
  `status`     VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  `ipAddress`  VARCHAR(45) NULL,
  `userAgent`  VARCHAR(255) NULL,
  `metadata`   JSON NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `audit_logs_createdAt_idx`(`createdAt`),
  INDEX `audit_logs_actorId_createdAt_idx`(`actorId`, `createdAt`),
  INDEX `audit_logs_resource_resourceId_idx`(`resource`, `resourceId`),
  INDEX `audit_logs_action_createdAt_idx`(`action`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `audit_logs_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. INDEX PENDUKUNG QUERY (satu index = satu pola query terverifikasi)
-- -----------------------------------------------------------------------------
-- Login SSO: WHERE username = ? OR nim = ? OR nidn = ?
ALTER TABLE `users` ADD INDEX `users_nim_idx` (`nim`), ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `users` ADD INDEX `users_nidn_idx` (`nidn`), ALGORITHM=INPLACE, LOCK=NONE;
-- Dashboard: COUNT(*) WHERE role = ? AND isActive = ?
ALTER TABLE `users` ADD INDEX `users_role_isActive_idx` (`role`, `isActive`), ALGORITHM=INPLACE, LOCK=NONE;
-- Filter daftar pengguna per prodi
ALTER TABLE `users` ADD INDEX `users_prodi_idx` (`prodi`), ALGORITHM=INPLACE, LOCK=NONE;

-- Portal: WHERE isActive = true ORDER BY `order` ASC
ALTER TABLE `sso_apps` ADD INDEX `sso_apps_isActive_order_idx` (`isActive`, `order`), ALGORITHM=INPLACE, LOCK=NONE;

-- Validasi token cabang: WHERE clientId = ? AND isUsed = false AND expiresAt > NOW()
ALTER TABLE `sso_auth_tokens` ADD INDEX `sso_auth_tokens_clientId_isUsed_expiresAt_idx` (`clientId`, `isUsed`, `expiresAt`), ALGORITHM=INPLACE, LOCK=NONE;
-- Riwayat SSO per user
ALTER TABLE `sso_auth_tokens` ADD INDEX `sso_auth_tokens_userId_createdAt_idx` (`userId`, `createdAt`), ALGORITHM=INPLACE, LOCK=NONE;
-- Job pembersihan: DELETE WHERE expiresAt < ?
ALTER TABLE `sso_auth_tokens` ADD INDEX `sso_auth_tokens_expiresAt_idx` (`expiresAt`), ALGORITHM=INPLACE, LOCK=NONE;

-- Matrix permission: ORDER BY resource ASC, action ASC
ALTER TABLE `permissions` ADD INDEX `permissions_resource_action_idx` (`resource`, `action`), ALGORITHM=INPLACE, LOCK=NONE;

-- Portal layanan: WHERE active = true ORDER BY urutan ASC
ALTER TABLE `layanan_kampus` ADD INDEX `layanan_kampus_active_urutan_idx` (`active`, `urutan`), ALGORITHM=INPLACE, LOCK=NONE;
-- Filter kategori layanan
ALTER TABLE `layanan_kampus` ADD INDEX `layanan_kampus_kategori_active_idx` (`kategori`, `active`), ALGORITHM=INPLACE, LOCK=NONE;

-- Arsip berita: ORDER BY publishedAt DESC
ALTER TABLE `berita` ADD INDEX `berita_publishedAt_idx` (`publishedAt`), ALGORITHM=INPLACE, LOCK=NONE;
-- Berita per kategori
ALTER TABLE `berita` ADD INDEX `berita_kategori_publishedAt_idx` (`kategori`, `publishedAt`), ALGORITHM=INPLACE, LOCK=NONE;

-- Banner portal: WHERE active = true ORDER BY urutan ASC
ALTER TABLE `banner_sliders` ADD INDEX `banner_sliders_active_urutan_idx` (`active`, `urutan`), ALGORITHM=INPLACE, LOCK=NONE;

-- -----------------------------------------------------------------------------
-- 4. SUPERSEDED INDEX (metadata-only, instan, reversible)
--    (resource) adalah prefix dari (resource, action) -> redundan.
--    Komentar blok ini bila tim memilih menunda pembersihan index.
-- -----------------------------------------------------------------------------
ALTER TABLE `permissions` DROP INDEX `permissions_resource_idx`, ALGORITHM=INPLACE, LOCK=NONE;
