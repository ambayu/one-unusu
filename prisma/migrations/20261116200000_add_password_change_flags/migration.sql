-- Menambahkan kolom penanda kewajiban ganti kata sandi.
--
-- `harus_ganti_password` dipakai untuk memaksa pengguna yang masih memakai
-- kata sandi bawaan segera menggantinya sebelum bisa memakai portal.
-- `password_diubah_at` mencatat kapan perubahan terakhir dilakukan.
--
-- Kolom ini sudah lebih dulu ada di `prisma/schema.prisma` dan dipakai oleh
-- kode server, tetapi belum pernah dibuatkan migrasinya. Akibatnya server
-- produksi menjalankan kode yang menyentuh kolom yang tidak ada di database,
-- dan permintaan ganti kata sandi gagal.
ALTER TABLE `users`
  ADD COLUMN `harus_ganti_password` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `password_diubah_at` DATETIME(3) NULL;
