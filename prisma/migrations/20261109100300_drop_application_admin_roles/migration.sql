-- Menghapus peran administrator per aplikasi (ADMIN_LPM, ADMIN_LPPM, dst.).
--
-- Peran ini memaksa setiap aplikasi baru menambah nilai enum lewat migrasi,
-- padahal yang menentukan akses hanyalah izin masuk `<clientId>:masuk_admin`.
-- Mulai sekarang Superadmin membuat peran sendiri di panel Peran & Izin dan
-- menautkannya ke pengguna; SUPERADMIN tetap memegang seluruh izin sehingga
-- dapat masuk ke semua aplikasi.
--
-- Pengguna yang masih memakai peran ini dipindahkan ke SUPERADMIN agar tidak
-- kehilangan akses secara diam-diam; Superadmin dapat menautkan ulang peran
-- yang lebih sempit sesudahnya.

UPDATE `users` u
JOIN `roles` r ON r.`id` = u.`roleId`
JOIN `roles` s ON s.`code` = 'SUPERADMIN'
SET u.`roleId` = s.`id`
WHERE r.`code` LIKE 'ADMIN\_%' AND r.`code` <> 'ADMIN_SSO';

DELETE FROM `roles`
WHERE `code` IN ('ADMIN_LPM', 'ADMIN_LPPM', 'ADMIN_ESURAT', 'ADMIN_SARPRAS', 'ADMIN_AKREDITASI', 'ADMIN_LMS', 'ADMIN_PRODI');