-- AlterTable: Penghitung kunjungan nyata untuk dashboard.
--
-- Tujuan: dashboard menampilkan aplikasi SSO dan direktori publik yang paling
-- sering dikunjungi di urutan depan (slider). Tanpa kolom ini urutan hanya bisa
-- diatur manual, bukan dihitung sistem.
--
-- Aman untuk tabel berisi data:
--   - hitCount punya DEFAULT 0, sehingga baris lama otomatis bernilai 0.
--   - lastUsedAt NULL diperbolehkan.
--   - Tidak ada UNIQUE, jadi tidak mungkin gagal karena duplikat.

ALTER TABLE `sso_apps`
    ADD COLUMN `hitCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastUsedAt` DATETIME(3) NULL;

CREATE INDEX `sso_apps_isActive_hitCount_idx` ON `sso_apps`(`isActive`, `hitCount`);

ALTER TABLE `layanan_kampus`
    ADD COLUMN `hitCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastUsedAt` DATETIME(3) NULL;

CREATE INDEX `layanan_kampus_active_hitCount_idx` ON `layanan_kampus`(`active`, `hitCount`);
