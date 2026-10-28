# Admin Panel Route — Rules

Dokumentasi aturan teknis dan desain untuk rute `/admin` (Manajemen Sistem SSO).

---

## 1. Aturan Akses & Otoritas
- Hanya civitas dengan role `SUPERADMIN` yang dapat mengakses rute ini.
- Non-admin dialihkan otomatis kembali ke `/dashboard`.

---

## 2. Struktur Visual & Tabel Data
- Stats grid menggunakan 4 kartu operasional ber-border `#D8E5DC` dengan icon container warna fungsional.
- Tabel daftar aplikasi dan tabel akun civitas wajib menggunakan header `#F0FDF4` dengan teks `#166534` dan border pembatas `#D8E5DC`.
- Modal pendaftaran aplikasi baru dan penambahan akun menggunakan backdrop transparan gelap dan card ber-radius 16px.
