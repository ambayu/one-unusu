# SSO ONE UNUSU — Katalog Masalah, Sebab, dan Solusi

Dokumen ini adalah **rujukan tunggal** ketika login SSO gagal di aplikasi mana pun
dalam ekosistem UNUSU. Setiap entri ditulis berdasarkan kejadian nyata: gejala
yang terlihat pengguna, sebab teknis yang sebenarnya, cara memastikan diagnosis,
dan perbaikan yang sudah terbukti.

Aturan wajibnya ada di [`PROJECT_RULES.md`](./PROJECT_RULES.md) bagian *SSO*.
Dokumen ini menjelaskan **mengapa** aturan itu ada.

---

## 0. Cara memakai dokumen ini

1. Catat **gejala persis** yang dilihat pengguna (teks pesan, URL, halaman).
2. Cari entri dengan gejala yang sama pada tabel ringkas di bawah.
3. Jalankan langkah **pembuktian** sebelum mengubah kode. Tanpa bukti, perbaikan
   mudah salah sasaran — beberapa masalah punya gejala yang mirip tetapi sebabnya
   berbeda total.
4. Terapkan **solusi**, lalu jalankan **verifikasi**.

---

## 1. Tabel ringkas

| # | Gejala yang terlihat | Sebab sebenarnya | Lompat ke |
|---|---|---|---|
| 1 | "Gagal menghubungi server untuk memverifikasi tiket SSO" | Bundel produksi memuat `baseURL: http://localhost:<port>/api` | [§2](#2-gagal-menghubungi-server-untuk-memverifikasi-tiket-sso) |
| 2 | Login berhasil lalu terlempar kembali ke `/login` | Tiket ditukar **dua kali** paralel (React StrictMode / render ulang) | [§3](#3-login-berhasil-lalu-terlempar-kembali-ke-login) |
| 3 | Halaman callback kosong / putih, tanpa pesan apa pun | Router ber-`basename` tidak cocok dengan path callback | [§4](#4-halaman-callback-kosong-atau-rusak-setelah-redirect) |
| 4 | Konsol: *"MIME type 'text/html' is not executable"* | Aset `.js` dibalas HTML karena `base` Vite salah | [§5](#5-konsol-mime-type-texthtml-is-not-executable) |
| 5 | "Parameter tiket autentikasi SSO tidak lengkap" | Tiket hilang karena komponen terpasang ulang setelah `replaceState` | [§6](#6-parameter-tiket-autentikasi-sso-tidak-lengkap) |
| 6 | Login portal masuk ke **akun lain** (mis. Super Admin) | Halaman login memercayai `localStorage`, bukan verifikasi server | [§7](#7-login-masuk-ke-akun-yang-salah) |
| 7 | Modal wajib ganti kata sandi muncul lalu hilang sendiri | Endpoint `/auth/me` dan `/login` tidak sepakat soal status kata sandi | [§8](#8-modal-wajib-ganti-kata-sandi-muncul-lalu-hilang) |
| 8 | Setelah ganti kata sandi, kata sandi bawaan masih bisa dipakai | Fallback SIAKAD belum dihentikan untuk akun yang sudah ganti | [§9](#9-kata-sandi-bawaan-masih-bisa-dipakai-setelah-diganti) |
| 9 | Server gagal build: kolom Prisma tidak dikenali | Client Prisma basi / migrasi tidak pernah dibuat | [§10](#10-kolom-prisma-tidak-dikenali-saat-build) |
| 10 | Tiket terbit di database tetapi `dipakai=false` selamanya | Browser tidak pernah mengirim `POST /api/auth/sso` | [§11](#11-tiket-terbit-tetapi-tidak-pernah-dibakar) |

---

## 2. "Gagal menghubungi server untuk memverifikasi tiket SSO"

**Gejala.** Pengguna mendarat di `/sso/callback` lalu melihat layar kegagalan
dengan pesan tersebut. Tidak ada permintaan ke backend di log nginx.

**Sebab.** Bundel produksi memuat alamat API yang menunjuk ke komputer pengunjung:

```js
baseURL: "http://localhost:5011/api"   // salah
```

Ini terjadi ketika `VITE_API_URL` **tidak ada** di `.env` server, sehingga Vite
memakai nilai cadangan di kode sumber. Browser kemudian mencoba menghubungi
`localhost:5011` milik pengguna — tidak ada server di sana — dan permintaan gagal
di lapisan jaringan sebelum sempat keluar ke server kampus.

**Pembuktian.**

```bash
# 1. Apakah VITE_API_URL ada di .env server?
grep -E '^VITE_API_URL' /var/www/unusu/<app>/.env

# 2. Apakah bundel produksi tercemar?
grep -o 'http://localhost:[0-9]*/api' /var/www/unusu/<app>/dist/assets/*.js
```

Bila perintah kedua mengeluarkan hasil, diagnosis terkonfirmasi.

**Solusi.**

1. Kode: nilai cadangan **wajib** jalur relatif, bukan localhost.

   ```ts
   const BASE_URL = import.meta.env.VITE_API_URL || '/api';
   ```

   Tambahkan penjaga agar kesalahan konfigurasi terlihat di konsol:

   ```ts
   if (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(BASE_URL)) {
     console.error(`[APP] VITE_API_URL mengarah ke ${BASE_URL}. Perbaiki .env server.`);
   }
   ```

2. Server: tambahkan `VITE_API_URL="/api"` ke `.env`, lalu build ulang.

**Verifikasi.**

```bash
JS=$(ls dist/assets/*.js | head -1)
grep -o 'http://localhost:[0-9]*/api' "$JS"   # harus kosong
```

**Catatan.** Gejala ini pernah menimpa **BAKSA** dan **BAKSI** secara bersamaan.
Karena itu pengaman di atas dipasang di **seluruh** aplikasi, bukan hanya yang
sedang bermasalah.

---

## 3. Login berhasil lalu terlempar kembali ke `/login`

**Gejala.** Pengguna sempat melihat dashboard, lalu sepersekian detik kemudian
kembali ke halaman masuk.

**Sebab.** Tiket SSO bersifat **sekali pakai**, tetapi ditukar **dua kali**
hampir bersamaan:

```nginx
POST /api/auth/sso  → 200   (menang, tiket dibakar)
POST /api/auth/sso  → 499   (dibatalkan karena komponen dilepas)
```

Request kedua ditolak, dan UI sempat membaca keadaan gagal tersebut sehingga
sesi dibersihkan. Penyebab paling umum adalah **React StrictMode**, yang memang
menjalankan `useEffect` dua kali di mode pengembangan.

**Pembuktian.** Cari dua request `auth/sso` dengan waktu hampir sama:

```bash
grep 'auth/sso' /var/log/nginx/access.log | tail -20
```

Bila status `200` dan `499`/`4xx` muncul pada detik yang sama untuk pengguna yang
sama, diagnosis terkonfirmasi. Periksa juga `sso_auth_tokens`: tiket tercatat
`isUsed = true` meski pengguna merasa gagal.

**Solusi.** Tiga hal harus dikerjakan bersamaan:

1. **Penanda sekali jalan** pada komponen callback.

   ```tsx
   const sudahJalan = useRef(false);
   // ...
   if (sudahJalan.current) return;
   sudahJalan.current = true;
   ```

2. **Tiket disimpan di memori modul**, karena `replaceState` sudah membersihkan
   address bar sebelum efek kedua berjalan.

   ```ts
   let TIKET_TERAKHIR: string | null = null;
   ```

3. **Hapus penanda `cancelled` pada alur sukses.** Pola lama membuang hasil tukar
   yang berhasil saat komponen terpasang ulang, sehingga pengguna tidak pernah
   dipindahkan ke dashboard.

**Verifikasi.** Login ulang, lalu pastikan hanya ada **satu** baris
`POST /api/auth/sso` di log untuk sesi tersebut.

**Catatan.** Pola ini pernah menjadi penyebab kegagalan **LPM** dan **LPPM**.
Karena itu guard `useRef` diterapkan ke seluruh aplikasi, bukan hanya yang gagal.

---

## 4. Halaman callback kosong atau rusak setelah redirect

**Gejala.** Pengguna sampai di `/sso/callback` tetapi halaman kosong, atau
dibelokkan ke alamat berawalan ganda seperti `/lppm/sso/callback`.

**Sebab.** Aplikasi dibangun untuk hidup di **subfolder**, sementara nginx
memetakan domainnya ke **akar**:

```ts
const PROD_BASE = '/lppm/';   // build menaruh rute di /lppm/*
```

```nginx
lppm.unusu.ac.id → 127.0.0.1:6006   # melayani akar
```

Database ONE mencatat `urlRedirect = https://lppm.unusu.ac.id/sso/callback`
(tanpa `/lppm`). Backend lalu me-redirect `/sso/callback` ke `/lppm/sso/callback`,
tetapi router ber-`basename=/lppm` mencari rute di bawah awalan itu sehingga
tidak ada yang cocok.

**Pembuktian.**

```bash
# Apakah callback dibelokkan?
curl -sk -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  https://127.0.0.1/sso/callback -H 'Host: <host>'

# Apakah redirect berasal dari Express, bukan nginx?
curl -sk -D- -o /dev/null https://127.0.0.1/sso/callback -H 'Host: <host>' | grep -i 'x-powered-by'
```

Header `X-Powered-By: Express` menandakan backend aplikasi yang membelokkan.

**Solusi.** Samakan ketiga lapisan pada **akar** domain:

1. `vite.config` → `PROD_BASE = '/'`
2. Hapus pengalihan paksa ke awalan di backend (`res.redirect(302, '/lppm' + ...)`)
3. Biarkan `urlRedirect` di database ONE tetap tanpa awalan

**Verifikasi.**

```bash
curl -sk -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  https://127.0.0.1/sso/callback -H 'Host: <host>'
# harus "200" tanpa redirect_url
```

**Pengecualian yang sah.** Aplikasi yang memang dirancang di subpath, seperti
**Akreditasi** (`one.unusu.ac.id/akreditasi/`), tidak boleh diubah dengan aturan
ini. Periksa `urlRedirect`-nya lebih dulu — bila sudah memuat awalan yang sama
dengan `base` build, konfigurasinya sudah benar.

---

## 5. Konsol: MIME type 'text/html' is not executable

**Gejala.** Halaman kosong. Di konsol browser muncul pesan bahwa berkas `.js`
tidak dapat dieksekusi karena bertipe `text/html`.

**Sebab.** `base` Vite tidak cocok dengan cara nginx melayani aset. Browser
meminta `/sarpras/assets/index-xxx.js`, server tidak menemukan berkasnya, lalu
SPA fallback membalas `index.html`. Berkas HTML dikirim untuk permintaan `.js`.

**Pembuktian.**

```bash
# Awali dengan kata "var" / "function" bila benar JavaScript.
curl -sk https://127.0.0.1/sarpras/assets/index-xxx.js -H 'Host: <host>' | head -c 60
```

Bila yang keluar `<!doctype html>`, diagnosis terkonfirmasi.

**Solusi.** Samakan `base` build dengan lokasi aset yang benar-benar dilayani
server, sama seperti §4. Setelah build, pastikan `index.html` merujuk aset pada
awalan yang dapat diambil.

**Verifikasi.** Ambil URL aset dari `index.html` hasil build, lalu minta langsung
ke server — isinya harus kode JavaScript, bukan HTML.

---

## 6. "Parameter tiket autentikasi SSO tidak lengkap"

**Gejala.** Pesan ini muncul padahal URL saat mendarat jelas membawa `?token=`.

**Sebab.** Kode callback membersihkan address bar lebih dulu:

```ts
window.history.replaceState(null, '', window.location.pathname);
```

Setelah itu komponen terpasang ulang (StrictMode, atau render ulang karena state
berubah). Pada pemasangan kedua, query sudah tidak ada — tiket tampak hilang.

**Solusi.** Simpan tiket yang terbaca dari URL ke memori modul **sebelum**
address bar dibersihkan:

```ts
const tokenDariUrl = new URLSearchParams(window.location.search).get('token');
if (tokenDariUrl && tokenDariUrl.length <= 256) {
  TIKET_TERAKHIR = tokenDariUrl;
}
window.history.replaceState(null, '', window.location.pathname);

const token = tokenDariUrl || TIKET_TERAKHIR;
```

**Verifikasi.** Muat callback dengan tiket sah; pesan tidak boleh muncul dan
tiket harus terpakai tepat satu kali.

---

## 7. Login masuk ke akun yang salah

**Gejala.** Pengguna mengetik akun A, tetapi masuk sebagai akun B — sering kali
akun dengan hak paling tinggi yang pernah dipakai di browser itu.

**Sebab.** Halaman login **mengalihkan pengguna sebelum memverifikasi apa pun**:

```tsx
const existingUserStr = localStorage.getItem('one_unusu_user');
if (existingUserStr) {
  navigate(resolveLandingPath(JSON.parse(existingUserStr)));  // ← langsung pindah
}
```

`localStorage` menyimpan sisa sesi akun sebelumnya. Kredensial yang baru diketik
**tidak pernah dikirim ke server** — login tidak pernah benar-benar dieksekusi.

**Pembuktian.** Periksa `lastLoginAt` akun yang bersangkutan:

```sql
SELECT username, lastLoginAt FROM users WHERE username = '...';
```

Bila `lastLoginAt` bernilai `NULL` padahal pengguna merasa sudah login, artinya
permintaan login memang tidak pernah terjadi.

**Solusi.** Verifikasi sesi ke server, jangan menebak dari cache:

```tsx
const res = await fetchMe();
if (res.data?.status && res.data.data) {
  localStorage.setItem('one_unusu_user', JSON.stringify(res.data.data));
  navigate(nextPath ?? resolveLandingPath(res.data.data), { replace: true });
} else {
  localStorage.removeItem('one_unusu_user');
  localStorage.removeItem('one_unusu_token');
}
```

**Verifikasi.** Kosongkan `localStorage`, login sebagai akun berperan rendah, lalu
pastikan panel menampilkan identitas dan menu sesuai peran tersebut.

**Aturan turunan.** Cache pengguna **boleh** dipakai untuk mempercepat tampilan,
tetapi **tidak boleh** menjadi dasar keputusan navigasi maupun otorisasi.

---

## 8. Modal wajib ganti kata sandi muncul lalu hilang

**Gejala.** Sesaat setelah login modal tampil, lalu lenyap tanpa pengguna
melakukan apa pun.

**Sebab.** Dua endpoint menghitung status dengan cara berbeda:

```ts
// POST /api/auth/login  → menghitung ulang, hasil: true
const masihBawaan = await bcrypt.compare(KATA_SANDI_BAWAAN, user.password);

// GET /api/auth/me      → membaca kolom mentah, hasil: false
```

Akun yang dibuat **sebelum** kolom `harusGantiPassword` ada memiliki nilai
`false` di database meskipun kata sandinya masih kata sandi bawaan. `PanelLayout`
memanggil `/auth/me` dan menimpa cache, sehingga penjaga membaca `false` dan
modal ditutup.

**Pembuktian.**

```bash
# Bandingkan respons kedua endpoint untuk akun yang sama.
# Nilai harus IDENTIK.
```

**Solusi.** Samakan aturan di kedua endpoint:

```ts
const hash = await prisma.user.findUnique({ where: { id }, select: { password: true } });
const masihBawaan = await bcrypt.compare(KATA_SANDI_BAWAAN, hash!.password).catch(() => false);
const harusGantiPassword = user.harusGantiPassword || masihBawaan;
```

**Verifikasi.** Panggil `/login` lalu `/auth/me` berurutan; `harusGantiPassword`
harus bernilai sama pada keduanya.

---

## 9. Kata sandi bawaan masih bisa dipakai setelah diganti

**Gejala.** Pengguna sudah mengganti kata sandi di portal, tetapi `Unusu123!`
masih dapat dipakai untuk masuk.

**Sebab.** Ketika kata sandi lokal tidak cocok, login mencoba **fallback ke
SIAKAD**:

```ts
if (!cocokLokal) {
  const extAuth = await authenticateExternalSystem(user.username, password);
}
```

Selama SIAKAD masih menerima kata sandi bawaan, jalur itu tetap terbuka —
sehingga kewajiban mengganti kata sandi menjadi sia-sia.

**Pembuktian.**

```bash
# Apakah akun ini pernah mengganti kata sandi?
# passwordDiubahAt = null  → belum pernah
```

**Solusi.** Hentikan fallback untuk akun yang sudah punya kata sandi lokal
sendiri:

```ts
if (user.passwordDiubahAt) {
  await bcrypt.compare(password, DUMMY_PASSWORD_HASH).catch(() => false); // samakan waktu
  return res.status(401).json({ status: false, message: "NIM / NIDN / username atau password salah." });
}
```

Fallback **tetap berlaku** bagi akun yang belum pernah mengganti kata sandi,
sehingga dosen/mahasiswa yang baru mengubah kata sandi di SIAKAD tidak terkunci.

**Verifikasi.** Pakai akun uji: ganti kata sandi, lalu coba masuk dengan kata
sandi bawaan (harus `401`) dan dengan kata sandi baru (harus `200`). Hapus akun
uji setelah selesai.

---

## 10. Kolom Prisma tidak dikenali saat build

**Gejala.** `tsc` gagal dengan pesan seperti:

```
Property 'harusGantiPassword' does not exist on type '...'
```

**Sebab.** Ada dua kemungkinan, dan keduanya harus diperiksa:

1. **Client Prisma basi** — `schema.prisma` sudah berubah tetapi client belum
   di-generate ulang.
2. **Migrasi tidak pernah dibuat** — kolom dipakai di kode dan ada di schema,
   tetapi tidak ada berkas `migration.sql` yang menambahkannya ke database.

Kasus kedua lebih berbahaya: `prisma migrate status` akan melaporkan
**"Database schema is up to date"** karena tidak ada migrasi tertunda yang
diketahui — padahal kolomnya tetap tidak ada.

**Pembuktian.**

```bash
# 1. Apakah ada migrasi yang menyebut kolom tersebut?
grep -rl 'harus_ganti_password' prisma/migrations/

# 2. Apakah kolom benar-benar ada di database?
#    (bukan sekadar percaya pada "migrate status")
```

**Solusi.**

1. `npx prisma generate`
2. Bila migrasi tidak ada, buat berkas migrasi manual:

   ```sql
   ALTER TABLE `users`
     ADD COLUMN `harus_ganti_password` BOOLEAN NOT NULL DEFAULT false,
     ADD COLUMN `password_diubah_at` DATETIME(3) NULL;
   ```

3. `npx prisma migrate deploy`
4. Jalankan ulang typecheck sampai bersih.

**Verifikasi.**

```bash
npx prisma migrate status   # "up to date"
npx tsc -p tsconfig.server.json --noEmit   # exit 0
```

**Aturan turunan.** Setiap perubahan `schema.prisma` **wajib** disertai berkas
migrasi pada commit yang sama. Perubahan schema tanpa migrasi akan lolos di
lokal (karena `db push`) tetapi gagal di produksi.

---

## 11. Tiket terbit tetapi tidak pernah dibakar

**Gejala.** Di tabel `sso_auth_tokens`, tiket baru terus muncul dengan
`isUsed = false`. Pengguna melaporkan gagal masuk, dan nginx tidak mencatat satu
pun `POST /api/auth/sso`.

**Sebab.** Browser tidak pernah menjalankan kode callback — biasanya karena
bundel gagal dimuat (lihat §2 atau §5), atau karena pengguna tidak pernah
benar-benar sampai ke portal.

**Pembuktian.**

```bash
# 1. Ada request login dari browser?
grep 'auth/sso' /var/log/nginx/access.log | tail

# 2. Tiket terbaru
#    isUsed=false berulang → backend tidak pernah menerima
```

Bila keduanya negatif, masalah ada **sebelum** tahap penukaran: periksa
pemuatan bundel, bukan logika callback.

**Solusi.** Ikuti diagnosis §2 dan §5 lebih dulu. Setelah bundel dapat dimuat,
penukaran tiket akan berjalan dengan sendirinya.

**Verifikasi.** Login ulang; tiket terbaru harus berubah menjadi `isUsed = true`
dan muncul satu baris `POST /api/auth/sso` berstatus `200`.

---

## 12. Checklist diagnosis cepat

Jalankan berurutan saat menerima laporan "SSO tidak bisa":

```bash
APP=<nama-app> ; HOST=<host>
cd /var/www/unusu/$APP

# 1. Konfigurasi API
grep -E '^VITE_(API_URL|SSO|ONE)' .env

# 2. Bundel bersih dari localhost?
grep -o 'http://localhost:[0-9]*/api' dist/assets/*.js dist/client/assets/*.js 2>/dev/null

# 3. Aset .js benar-benar JavaScript?
JS=$(grep -oE 'src="[^"]*index-[^"]*\.js"' dist/index.html dist/client/index.html 2>/dev/null | head -1 | sed -E 's/.*src="([^"]*)".*/\1/')
curl -sk "https://127.0.0.1$JS" -H "Host: $HOST" | head -c 40

# 4. Callback merespons 200 tanpa redirect?
curl -sk -o /dev/null -w '%{http_code} %{redirect_url}\n' "https://127.0.0.1/sso/callback" -H "Host: $HOST"

# 5. Backend hidup dan rute sampai?
curl -sk -o /dev/null -w '%{http_code}\n' -X POST "https://127.0.0.1/api/auth/sso" \
  -H "Host: $HOST" -H 'Content-Type: application/json' -d '{"token":"short"}'
# 400 = rute sehat (token ditolak karena tidak sah), bukan 404/502
```

Bila kelima langkah bersih tetapi login tetap gagal, periksa log nginx untuk
melihat apakah browser benar-benar mengirim `POST /api/auth/sso`, lalu lanjut ke
§3 dan §11.

---

## 13. Prinsip yang tidak boleh dilanggar

1. **Tiket bersifat sekali pakai.** Setiap jalur kode harus mengasumsikan
   penukaran hanya terjadi satu kali. Jangan pernah menembak ulang tiket yang
   sama setelah gagal — minta pengguna memulai login baru.
2. **Identitas tidak boleh diambil dari browser.** `client_id` dan `client_key`
   hanya boleh berasal dari environment server aplikasi cabang.
3. **Cache bukan sumber kebenaran.** `localStorage` hanya untuk tampilan awal;
   keputusan masuk selalu lewat verifikasi server.
4. **Ketiga lapisan harus sepakat.** Build (`base` Vite), server (rute dan
   redirect), dan `urlRedirect` di database ONE wajib menunjuk bentuk URL yang
   sama. Perbedaan satu awalan saja cukup untuk membuat login gagal total.
5. **Setiap perubahan schema wajib disertai migrasi.**
6. **Gejala mirip belum tentu sebab sama.** Selalu jalankan langkah pembuktian
   sebelum mengubah kode.
