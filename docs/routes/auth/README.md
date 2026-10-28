# Autentikasi SSO - Overview

Rute `/login` adalah pintu masuk tunggal ke panel SSO. Halaman ini memakai layar terpisah: form login di sisi kiri, foto kampus di sisi kanan.

---

## Fitur Utama

- **Login terpusat**: mengirim `identifier` (NIM, NIDN, atau username) dan password ke `POST {API_BASE}/auth/login` melalui `loginSso`. `API_BASE` diambil dari `VITE_API_URL`, dengan default `http://localhost:5000/api`.
- **Penyimpanan sesi**: token disimpan di `localStorage` dengan kunci `one_unusu_token`, data pengguna di `one_unusu_user`.
- **Uji coba cepat**: tombol Mahasiswa, Dosen, dan Superadmin mengisi identifier akun demo pada form. Password tetap harus diketik.
- **Redirect**: setelah login berhasil, pengguna diarahkan ke `/dashboard`.

---

## Catatan Keamanan

1. Password tidak pernah disimpan di `localStorage`.
2. Pesan error tidak boleh membocorkan detail internal server. Gunakan pesan dari `res.data.message` atau pesan umum.
3. Akun demo hanya untuk lingkungan pengembangan dan wajib dinonaktifkan pada build produksi.
