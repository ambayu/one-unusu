-- Memindahkan otorisasi pengguna dari enum `role` ke relasi `roleId`.
--
-- Urutan penting: nilai enum disalin ke `roleId` SEBELUM kolom `role`
-- dihapus. Tanpa langkah ini seluruh pengguna kehilangan perannya dan tidak
-- dapat membuka satu aplikasi pun.
--
-- Pemetaan memakai `roles.code`, yang kodenya sama dengan nilai enum lama.
UPDATE `users` u
JOIN `roles` r ON r.`code` = u.`role`
SET u.`roleId` = r.`id`
WHERE u.`roleId` IS NULL;

-- Index lama mengacu ke kolom enum; harus dilepas sebelum kolomnya dihapus.
ALTER TABLE `users` DROP INDEX `users_role_isActive_idx`;

ALTER TABLE `users` DROP COLUMN `role`;

-- Index baru berbasis relasi peran.
CREATE INDEX `users_roleId_isActive_idx` ON `users`(`roleId`, `isActive`);