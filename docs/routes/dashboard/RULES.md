# Dashboard Route — Rules

Dokumentasi aturan khusus rute `/dashboard` (Portal SSO Gateway).

---

## 1. Template & Komponen yang Digunakan
- **Template**: Dashboard Template (`DashboardLayout`)
- **Shared Components**: `SidebarLayout`, `AppCardSkeleton`, `StatusBadge`, Heroicons v2.
- **Warna Spesifik**:
  - Welcome Card: `#F0FDF4` dengan border `#D8E5DC`
  - App Card Container: `#FFFFFF` dengan border `#D8E5DC`
  - App Icon Container: `#DCFCE7` dengan border `#BBF7D0`

---

## 2. Aturan Bisnis & Integrasi
1. Mengambil data paralel via `Promise.all([fetchMe(), fetchSsoApps()])`.
2. Jika respons unauthorized (401/403), hapus `one_unusu_token` dan `one_unusu_user` dari `localStorage`, lalu redirect ke `/login`.
3. Membuka aplikasi menggunakan `GET /api/sso/app-client/:clientId/v2/redirect` melalui `getSsoRedirectV2`, dengan state loading interaktif `redirectingAppId`. Seluruh kartu aplikasi aktif menampilkan tombol **Buka Aplikasi**; apabila pengguna tidak memiliki izin ke aplikasi tersebut (`isAllowed === false` atau HTTP 403), tampilkan `NotificationModal` hijau bertajuk **Akses Ditolak** dengan pesan `"Akses ditolak. Anda tidak memiliki akses ke aplikasi ini."` tanpa menampilkan nama peran pengguna.
4. **Gerbang biodata pada `handleLaunchApp`**: bila `isBiodataComplete(user)` bernilai `false` (email atau nomor WhatsApp kosong), jangan minta tiket SSO. Alihkan ke `/profil` dengan `state: { requiredBio: true }` agar halaman biodata menampilkan notifikasi modal.
5. Jika profil civitas belum memiliki email atau WhatsApp, tampilkan warning banner pengingat biodata (tidak memblokir akses dashboard).

## 3. Aturan Identitas Civitas
1. Daftar identitas wajib menyesuaikan peran: `MAHASISWA` (NIM, prodi, fakultas, status), `DOSEN` (NIDN/NUP, homebase, fakultas, status), `SUPERADMIN` (username, unit kerja, hak akses, status).
2. Daftar identitas ditampilkan sebagai `dl` dua kolom (`grid-cols-1 sm:grid-cols-2`), tanpa kartu per item dan tanpa ikon per baris.
2. Status aktif diambil dari `user.isActive`, bukan nilai tetap.
3. Nilai yang belum tersedia ditampilkan sebagai `Belum tersedia`. Dilarang memakai nama, NIM, atau prodi contoh.
4. NIM, NIDN, dan username wajib memakai `font-mono`.
