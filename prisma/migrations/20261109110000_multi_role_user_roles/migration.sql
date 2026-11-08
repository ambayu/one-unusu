-- 1. Buat tabel junction `user_roles` untuk mendukung multi-role
CREATE TABLE `user_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_role_id_idx`(`role_id`),
    UNIQUE INDEX `user_roles_user_id_role_id_key`(`user_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Foreign key constraints untuk `user_roles`
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Backfill data: Salin seluruh penugasan `roleId` yang ada saat ini ke `user_roles`
INSERT INTO `user_roles` (`user_id`, `role_id`, `created_at`)
SELECT `id`, `roleId`, NOW()
FROM `users`
WHERE `roleId` IS NOT NULL;

-- 4. Lepaskan foreign key dan index lama di `users`
ALTER TABLE `users` DROP FOREIGN KEY `users_roleId_fkey`;
ALTER TABLE `users` DROP INDEX `users_roleId_isActive_idx`;

-- 5. Hapus kolom `roleId` dari `users`
ALTER TABLE `users` DROP COLUMN `roleId`;

-- 6. Tambahkan index `users_isActive_idx`
CREATE INDEX `users_isActive_idx` ON `users`(`isActive`);
