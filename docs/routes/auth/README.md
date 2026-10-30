# Autentikasi SSO - Overview

Rute `/login` adalah pintu masuk tunggal ke panel SSO. Halaman ini memakai layar terpisah: form login di sisi kiri, foto kampus di sisi kanan.

---

## Fitur Utama

- **Login terpusat**: mengirim `identifier` (NIM, NIDN, atau username) dan password ke `POST {API_BASE}/auth/login` melalui `loginSso`. `API_BASE` diambil dari `VITE_API_URL`, dengan default `http://localhost:5000/api`.
- **Penyimpanan sesi**: token sesi disimpan pada cookie `HttpOnly` yang dipasang server; hanya profil umum (`one_unusu_user`) yang disimpan di `localStorage`.
- **Redirect**: setelah login berhasil, `SUPERADMIN` diarahkan ke `/admin` dan peran lain ke `/dashboard`. Kelengkapan biodata diperiksa saat membuka aplikasi SSO, bukan pada langkah login.
- **Tanpa akun demo**: form login tidak menyediakan pintasan akun uji, dan seeder tidak lagi membuat akun dosen/mahasiswa contoh.

---

## Catatan Keamanan

1. Password tidak pernah disimpan di `localStorage`.
2. Pesan error tidak boleh membocorkan detail internal server. Gunakan pesan dari `res.data.message` atau pesan umum.
3. Akun demo hanya untuk lingkungan pengembangan dan wajib dinonaktifkan pada build produksi.
