-- Migration: kunci admin per aplikasi (UserAppAccess)
-- Tabel ini menyimpan izin eksplisit pengguna terhadap aplikasi cabang SSO.
-- Aman dijalankan berulang (idempotent) pada MySQL 8.

CREATE TABLE IF NOT EXISTS `user_app_accesses` (
  `id`          INTEGER NOT NULL AUTO_INCREMENT,
  `userId`      INTEGER NOT NULL,
  `appId`       INTEGER NOT NULL,
  `isActive`    BOOLEAN NOT NULL DEFAULT true,
  `grantedById` INTEGER NULL,
  `note`        VARCHAR(255) NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `user_app_accesses_userId_appId_key`(`userId`, `appId`),
  INDEX `user_app_accesses_userId_idx`(`userId`),
  INDEX `user_app_accesses_appId_idx`(`appId`),
  PRIMARY KEY (`id`),

  CONSTRAINT `user_app_accesses_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_app_accesses_appId_fkey`
    FOREIGN KEY (`appId`) REFERENCES `sso_apps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
