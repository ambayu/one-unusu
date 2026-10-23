-- CreateTable
CREATE TABLE `fakultas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NULL,
    `dekan` VARCHAR(191) NULL,
    `deskripsi` TEXT NULL,
    `visi` TEXT NULL,
    `misi` TEXT NULL,
    `icon` VARCHAR(191) NULL DEFAULT 'GraduationCap',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fakultas_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prodi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `jenjang` VARCHAR(191) NOT NULL DEFAULT 'S1',
    `akreditasi` VARCHAR(191) NULL DEFAULT 'Baik',
    `kaprodi` VARCHAR(191) NULL,
    `deskripsi` TEXT NULL,
    `fakultasId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `prodi_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `layanan_kampus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `kategori` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `urlTarget` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL DEFAULT 'ExternalLink',
    `isExternal` BOOLEAN NOT NULL DEFAULT false,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `berita` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `ringkasan` TEXT NULL,
    `konten` LONGTEXT NOT NULL,
    `kategori` VARCHAR(191) NOT NULL DEFAULT 'Pengumuman',
    `penulis` VARCHAR(191) NULL DEFAULT 'Humas UNUSU',
    `gambar` VARCHAR(191) NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `berita_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banner_sliders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(191) NOT NULL,
    `subjudul` VARCHAR(191) NULL,
    `gambarUrl` VARCHAR(191) NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `prodi` ADD CONSTRAINT `prodi_fakultasId_fkey` FOREIGN KEY (`fakultasId`) REFERENCES `fakultas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
