-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `noHp` VARCHAR(191) NULL,
    `role` ENUM('SUPERADMIN', 'DOSEN', 'MAHASISWA') NOT NULL DEFAULT 'MAHASISWA',
    `nim` VARCHAR(191) NULL,
    `nidn` VARCHAR(191) NULL,
    `fakultas` VARCHAR(191) NULL,
    `prodi` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sso_apps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clientId` VARCHAR(191) NOT NULL,
    `clientKey` VARCHAR(191) NOT NULL,
    `nameApp` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(191) NULL DEFAULT 'LayoutGrid',
    `badge` VARCHAR(191) NULL DEFAULT 'Akademik',
    `urlRedirect` VARCHAR(191) NOT NULL,
    `targetRoles` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sso_apps_clientId_key`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sso_auth_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(64) NOT NULL,
    `userId` INTEGER NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `appId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sso_auth_tokens_token_key`(`token`),
    INDEX `sso_auth_tokens_token_clientId_idx`(`token`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sso_auth_tokens` ADD CONSTRAINT `sso_auth_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sso_auth_tokens` ADD CONSTRAINT `sso_auth_tokens_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `sso_apps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
