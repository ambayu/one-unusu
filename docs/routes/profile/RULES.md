# Profile Route - Rules

Dokumentasi aturan teknis dan desain untuk rute `/profil` (Biodata Civitas).

---

## 1. Aturan Form Section Layout (Part 10.8)
- Seluruh kelompok field kontak dan keamanan **wajib dibungkus di dalam kartu putih ber-radius 16px dengan border `#D8E5DC`**.
- Dilarang meletakkan input atau label langsung di atas background canvas tanpa card container.

---

## 2. Aturan Pasfoto Formal 3x4
- Pasfoto resmi wajib berukuran rasio 3x4 dengan background merah pekat `#b91c1c` (Solid Crimson Red).
- Pengguna dapat memilih file gambar, memotong (crop) di browser melalui modal canvas HTML5, dan menyimpannya langsung ke database.

---

## 3. Adaptasi Peran
- `MAHASISWA`: Menampilkan kartu khusus Data Akademik (NIM, Prodi S1, Fakultas).
- `DOSEN`: Menampilkan kartu khusus Data Ketenagaan (NIDN/NUP, Homebase Prodi, Fakultas Induk).
- `SUPERADMIN`: Menampilkan kartu Otoritas Sistem & Unit Kerja PUSTIK UNUSU.

---

## 4. Aturan Akses Biodata
1. Halaman ini **tidak lagi** menjadi tujuan pertama setelah login. Pengguna masuk ke panel terlebih dahulu.
2. Rute ini menjadi tujuan pengalihan ketika pengguna membuka aplikasi SSO dengan biodata belum lengkap (`state.requiredBio = true`).
3. Saat `state.requiredBio` aktif dan email atau nomor WhatsApp masih kosong, tampilkan `NotificationModal` bertipe `info` sekali (dapat ditutup) **dan** warning banner persisten di atas kartu.
4. Kelengkapan biodata dihitung oleh `isBiodataComplete()` di `src/client/lib/biodata.ts`; dilarang menduplikasi logika `!email || !noHp` di tempat lain.

---

## 5. Aturan Email Unik & Pesan Galat

Kolom `users.email` ber-UNIQUE. Karena itu email termasuk **galat pengguna**, bukan galat sistem, dan pesannya wajib menyebut sebabnya.

1. **Email sudah dipakai akun lain** wajib dijawab server dengan **HTTP 409** dan pesan `"Email sudah digunakan oleh akun lain. Gunakan alamat email yang berbeda."`
   - Dilarang membiarkannya jatuh ke `catch` umum sebagai **HTTP 500** dengan pesan `"Gagal memperbarui profil."` - itu menyatakan server rusak padahal server sehat.
2. **Pemeriksaan duplikat dilakukan sebelum penulisan**, dengan membandingkan email tanpa membedakan huruf besar/kecil (`Email@x.com` dan `email@x.com` dianggap sama, karena begitulah pengguna memahaminya).
   - Pemeriksaan ini **tidak boleh** memakai `mode: "insensitive"` pada filter Prisma: opsi itu tidak ada untuk provider MySQL dan hanya akan gagal saat dijalankan. Bandingkan huruf kecil di memori.
3. **Akun sendiri tidak boleh dianggap bentrok**: mengirim ulang email sendiri (walau berbeda kapitalisasi) wajib berhasil.
4. **Jaring pengaman balapan**: bila dua permintaan lolos pemeriksaan bersamaan, `P2002` dari UNIQUE constraint tetap harus dijawab **409**, bukan 500.
5. **Judul notifikasi** ditentukan status HTTP: galat `4xx` memakai judul **"Periksa Kembali Data Anda"**, sedangkan `5xx`/jaringan memakai **"Kesalahan Sistem"**. Dilarang memakai judul "Kesalahan Sistem" untuk galat validasi.
6. Pesan dari server (`err.response.data.message`) wajib diteruskan apa adanya; jangan diganti teks generik.

---

## 6. Dependensi
- `src/client/lib/pesanGalat.ts` - tipe `GalatPermintaan`.
- `src/server/index.ts` - `PUT /api/auth/profile`.
- `src/client/pages/Profile.tsx` - `handleSubmit`, blok `catch`.
