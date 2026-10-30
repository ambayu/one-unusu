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
5. **Login selalu berakhir di panel.** Setelah login sukses, pengguna diarahkan ke `resolveLandingPath(role)`: `SUPERADMIN` → `/admin`, peran lain → `/dashboard`. Kelengkapan biodata **tidak** diperiksa di sini; gerbang biodata berada di `handleLaunchApp` pada Dashboard. Bila ada parameter `?next=` yang valid (path internal), tujuan itu yang dipakai.

---

## 3. Aturan Visual

1. Palet memakai token Modern Green. Dilarang memakai token `brand` atau `gold` di halaman ini.
2. Ikon memakai Heroicons. Dilarang `lucide-react`.
3. Overlay foto hanya untuk keterbacaan teks, bukan dekorasi tambahan.
