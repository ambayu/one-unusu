-- AlterTable: Menambahkan field biodata civitas akademika dari SIAKAD
ALTER TABLE `users` ADD COLUMN `alamat` TEXT NULL,
    ADD COLUMN `angkatan` VARCHAR(10) NULL,
    ADD COLUMN `asal_sekolah` VARCHAR(150) NULL,
    ADD COLUMN `jenis_kelamin` VARCHAR(20) NULL,
    ADD COLUMN `nama_ibu_kandung` VARCHAR(120) NULL,
    ADD COLUMN `nik` VARCHAR(30) NULL,
    ADD COLUMN `status_akademik` VARCHAR(50) NULL DEFAULT 'Aktif',
    ADD COLUMN `synced_at` DATETIME(3) NULL,
    ADD COLUMN `tanggal_lahir` VARCHAR(30) NULL,
    ADD COLUMN `tempat_lahir` VARCHAR(100) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_nik_key` ON `users`(`nik`);
