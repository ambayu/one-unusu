-- AlterTable: perbarui enum role pada tabel users agar memuat peran admin aplikasi cabang
ALTER TABLE `users` MODIFY COLUMN `role` ENUM(
  'SUPERADMIN',
  'DOSEN',
  'MAHASISWA',
  'ADMIN_SSO',
  'ADMIN_LPM',
  'ADMIN_LPPM',
  'ADMIN_ESURAT',
  'ADMIN_SARPRAS',
  'ADMIN_AKREDITASI',
  'ADMIN_LMS'
) NOT NULL DEFAULT 'MAHASISWA';
