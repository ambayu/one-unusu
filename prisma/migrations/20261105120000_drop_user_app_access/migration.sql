-- =============================================================================
-- Migration : 20261105120000_drop_user_app_access
-- Project   : ONE UNUSU (MySQL 8, InnoDB, utf8mb4)
-- Sifat     : DESTRUKTIF (DROP TABLE). Hanya menghapus tabel allowlist yang
--             sudah tidak dipakai kode maupun seeder.
-- Tujuan    : Menyatukan otorisasi aplikasi cabang pada satu sumber:
--             `sso_apps.targetRoles` di portal + konstanta `ALLOWED_SSO_ROLES`
--             pada server masing-masing aplikasi cabang.
-- Prasyarat : Backup logis (`npm run db:backup`) sudah dibuat.
-- =============================================================================

DROP TABLE `user_app_accesses`;
