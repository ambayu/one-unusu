# Autentikasi SSO - Rules

Aturan teknis dan desain untuk rute `/login`.

---

## 1. Aturan Layout

1. Halaman memakai dua kolom pada desktop (`lg:grid-cols-2`) dan satu kolom pada mobile. Form selalu tampil lebih dulu.
2. Panel kiri memakai permukaan putih, panel kanan memakai foto kampus dengan overlay gradien gelap untuk keterbacaan teks.
3. Seluruh input wajib punya label, `autoComplete`, dan state fokus yang terlihat (`focus:ring-1 focus:ring-[#166534]`).
4. Tombol submit wajib menampilkan state loading dan `disabled` saat proses berjalan.

---

## 2. Aturan Perilaku

1. Token disimpan dengan kunci `one_unusu_token`, data pengguna dengan kunci `one_unusu_user`.
2. Respons 401 atau 403 menampilkan pesan gagal login, bukan detail internal server.
3. Timeout dan kegagalan jaringan harus menampilkan pesan yang dapat ditindaklanjuti.
4. Rute `/dashboard` dilindungi `ProtectedRoute` di `App.tsx`, sehingga halaman ini tidak perlu mengecek token sendiri.
5. **JIT Auto-Provisioning & UX Progresif:** Jika akun belum tercatat di database lokal, sistem menguji kredensial ke API SIAKAD (`/auth/index.php`). Tombol login wajib menampilkan teks status progresif (`loadingStatusText`) agar pengguna terinformasi bahwa sistem sedang menyinkronkan data dari SIAKAD tanpa melempar galat penolakan palsu.
6. **Login selalu berakhir di panel.** Setelah login sukses, pengguna diarahkan ke `resolveLandingPath(role)`: `SUPERADMIN` → `/admin`, peran lain → `/dashboard`. Kelengkapan biodata **tidak** diperiksa di sini; gerbang biodata berada di `handleLaunchApp` pada Dashboard. Bila ada parameter `?next=` yang valid (path internal), tujuan itu yang dipakai.

---

## 2a. Kata Sandi Bawaan & Kewajiban Menggantinya (WAJIB)

Akun yang di-provision dari SIAKAD (`POST /api/admin/siakad/sync-dosen`,
`sync-mahasiswa`) memakai satu kata sandi bawaan yang sama untuk semua akun.
Nilai bawaannya `Unusu123!` dan dapat ditimpa lewat `DEFAULT_PASSWORD` di
environment (konstanta `KATA_SANDI_BAWAAN`).

Aturan:

1. **Setiap akun hasil provisioning wajib ditandai** `harusGantiPassword: true`
   saat dibuat.
2. **Login menghitung ulang kewajiban ini** dengan membandingkan hash tersimpan
   terhadap `KATA_SANDI_BAWAAN`, lalu mengirim `harusGantiPassword` pada respons
   `POST /api/auth/login` **dan** `GET /api/auth/me`. Dengan begitu akun lama yang
   belum sempat ditandai tetap terlindungi, dan akun yang sudah mengganti kata
   sandi tidak pernah diminta lagi.
3. **Portal menampilkan `ForcePasswordChangeModal`** (`src/client/components/`)
   yang **tidak dapat ditutup**: tanpa tombol batal, klik latar diabaikan,
   tombol `Escape` diblokir. Satu-satunya jalan keluar adalah mengganti kata
   sandi atau menekan "Keluar dari Akun".
4. **`PUT /api/auth/profile` wajib menolak** kata sandi baru yang sama dengan
   kata sandi saat ini maupun yang sama dengan `KATA_SANDI_BAWAAN`, lalu
   menulis `harusGantiPassword = false` dan `passwordDiubahAt`.
5. Modal harus menampilkan **username yang sedang aktif** (NIDN/NIM) agar
   pengguna menyadari bila ia masuk ke akun yang salah.

## 2b. Verifikasi Kata Sandi & Fallback SIAKAD (WAJIB)

1. **Hash lokal adalah sumber kebenaran.** `bcrypt.compare` terhadap
   `user.password` dijalankan lebih dulu.
2. **Fallback SIAKAD hanya memberi akses satu sesi dan DILARANG menimpa hash
   lokal.** Sebelumnya setiap fallback yang berhasil langsung menulis ulang
   `user.password` dengan kata sandi yang baru diketik. Karena NIDN dosen bukan
   rahasia, siapa pun yang mengetahui NIDN dapat masuk dengan kata sandi lemah
   mana pun yang diterima SIAKAD, lalu kata sandi lemah itu **menggantikan** kata
   sandi portal secara permanen.
3. **Peran hasil autentikasi eksternal harus sejalan** dengan peran akun lokal
   sebelum sesi diberikan; bila tidak sejalan, tolak dengan 403.
4. **JIT provisioning hanya boleh menghasilkan peran `DOSEN` atau `MAHASISWA`.**
   Dilarang memetakan peran SIAKAD bertanda "ADMIN" menjadi `ADMIN_SSO` atau
   peran administratif lain. Peran administratif hanya diberikan lewat panel
   Manajemen Pengguna oleh Superadmin.
5. Dilarang melakukan *fallback* ke peran `MAHASISWA` ketika peran hasil
   pemetaan tidak ditemukan — permintaan harus ditolak.

---

## 3. Aturan Visual

1. Palet memakai token Modern Green. Dilarang memakai token `brand` atau `gold` di halaman ini.
2. Ikon memakai Heroicons. Dilarang `lucide-react`.
3. Overlay foto hanya untuk keterbacaan teks, bukan dekorasi tambahan.
