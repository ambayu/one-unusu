-- AlterTable
ALTER TABLE `users` ADD COLUMN `bidang_keahlian` VARCHAR(255) NULL,
    ADD COLUMN `biografi` TEXT NULL,
    ADD COLUMN `gelar_belakang` VARCHAR(50) NULL,
    ADD COLUMN `gelar_depan` VARCHAR(50) NULL,
    ADD COLUMN `google_scholar` VARCHAR(255) NULL,
    ADD COLUMN `jabatan_akademik` VARCHAR(100) NULL,
    ADD COLUMN `link_sinta` VARCHAR(255) NULL,
    ADD COLUMN `nip` VARCHAR(50) NULL,
    ADD COLUMN `orcid` VARCHAR(50) NULL,
    ADD COLUMN `pendidikan_terakhir` VARCHAR(50) NULL,
    ADD COLUMN `scopus_id` VARCHAR(50) NULL,
    ADD COLUMN `sinta_id` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `dosen_berkas_tipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(50) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `deskripsi` TEXT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dosen_berkas_tipe_kode_key`(`kode`),
    INDEX `dosen_berkas_tipe_isActive_urutan_idx`(`isActive`, `urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dosen_berkas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tipeId` INTEGER NOT NULL,
    `namaFile` VARCHAR(255) NOT NULL,
    `nomorDokumen` VARCHAR(100) NULL,
    `tahunSK` VARCHAR(4) NULL,
    `keterangan` TEXT NULL,
    `fileUrl` TEXT NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL DEFAULT 'application/pdf',
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploadedBy` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedBy` INTEGER NULL,
    `verificationNote` TEXT NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(3) NULL,

    INDEX `dosen_berkas_userId_isArchived_idx`(`userId`, `isArchived`),
    INDEX `dosen_berkas_tipeId_isVerified_idx`(`tipeId`, `isVerified`),
    INDEX `dosen_berkas_uploadedAt_idx`(`uploadedAt`),
    UNIQUE INDEX `dosen_berkas_userId_tipeId_uploadedAt_key`(`userId`, `tipeId`, `uploadedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_endpoints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `sourceApp` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'data',
    `exampleRequest` TEXT NULL,
    `exampleResponse` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_endpoints_endpoint_key`(`endpoint`),
    INDEX `api_endpoints_sourceApp_isActive_idx`(`sourceApp`, `isActive`),
    INDEX `api_endpoints_category_isActive_idx`(`category`, `isActive`),
    INDEX `api_endpoints_isPublic_idx`(`isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `appId` INTEGER NOT NULL,
    `allowedEndpoints` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `revokedAt` DATETIME(3) NULL,
    `revokedReason` VARCHAR(255) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `lastUsedIp` VARCHAR(45) NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_keys_key_key`(`key`),
    INDEX `api_keys_appId_isActive_idx`(`appId`, `isActive`),
    INDEX `api_keys_revoked_idx`(`revoked`),
    INDEX `api_keys_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_usage_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `keyId` INTEGER NOT NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `statusCode` INTEGER NOT NULL,
    `responseTime` INTEGER NOT NULL DEFAULT 0,
    `requestIp` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `errorMessage` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_usage_logs_keyId_createdAt_idx`(`keyId`, `createdAt`),
    INDEX `api_usage_logs_endpoint_createdAt_idx`(`endpoint`, `createdAt`),
    INDEX `api_usage_logs_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dosen_berkas` ADD CONSTRAINT `dosen_berkas_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dosen_berkas` ADD CONSTRAINT `dosen_berkas_tipeId_fkey` FOREIGN KEY (`tipeId`) REFERENCES `dosen_berkas_tipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `sso_apps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_usage_logs` ADD CONSTRAINT `api_usage_logs_keyId_fkey` FOREIGN KEY (`keyId`) REFERENCES `api_keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
