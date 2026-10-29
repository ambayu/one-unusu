# Changelog - Autentikasi SSO

## [2026-10-30]

### Fixed
- **Login Superadmin gagal**: tombol pintasan "Uji Coba: Superadmin" pada `Login.tsx` mengisi kata sandi `AdminPassword123!`, sedangkan hash di database cocok dengan `password123`. Tombol kini memakai satu konstanta `DEMO_PASSWORD` yang sama untuk ketiga akun uji, sesuai `SEED_DEMO_PASSWORD`/`SEED_ADMIN_PASSWORD`.
- Label dan pesan validasi login menyebut hanya "NIM / NIDN", sehingga akun administrator yang memakai username dianggap tidak valid. Label, placeholder, dan pesan kini menyebut "NIM / NIDN / Username", termasuk pesan `POST /api/auth/login` di `src/server/index.ts`.

## [2026-10-29]

### Changed
- Palet halaman login diseragamkan ke token Modern Green: border input `#D8E5DC`, state aktif tombol `#14532D`, chip status memakai `#14532D` dan `#22C55E`, teks footer `#64748B`.
- Overlay foto kampus memakai `#14532D` dengan tiga tingkat opasitas, menggantikan `#062419`.
- Efek blur pada chip status dihapus karena tidak menambah keterbacaan.
