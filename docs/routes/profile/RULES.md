# Profile Route — Rules

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
