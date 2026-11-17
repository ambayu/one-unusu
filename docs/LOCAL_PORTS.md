# Port lokal dan callback SSO

## Port dan URL aplikasi

- Setiap aplikasi membaca `DEV_PORT` untuk port Vite; ONE memakai default lokal `5173`, cabang memakai default pada tabel berikut. Port harus integer 1–65535 dan tidak berpindah otomatis bila terpakai.
- `DEV_API_TARGET` mengatur target proxy API saat development pada aplikasi yang memiliki backend Express.
- Setiap frontend cabang membaca `VITE_ONE_UNUSU_URL` untuk alamat portal ONE. Isi URL publik sesuai deployment VPS sebelum build; nilai `VITE_*` tertanam saat build dan membutuhkan build ulang bila berubah.
- Default localhost hanya untuk development. Atur `SSO_BASE_URL` pada backend cabang untuk endpoint server ONE, bukan alamat frontend; proxy/API path harus sesuai deployment.
- Port Vite bukan port publik produksi: gunakan domain/reverse proxy yang dikonfigurasi operator. Dokumentasi ini tidak mengubah `.env`, layanan, atau database.

Registry callback: `one-unusu/src/server/lib/ssoApps.ts`. Callback menggunakan env berikut; suffix sama persis dengan suffix `SSO_CLIENT_KEY_`. Nilai adalah URL callback lengkap, bukan hanya origin.

| Aplikasi | Env callback | Default pengembangan |
| --- | --- | --- |
| LMS | `SSO_CALLBACK_URL_UNUSU_LMS` | `http://localhost:5174/sso/callback` |
| E-Surat | `SSO_CALLBACK_URL_ESURAT_UNUSU` | `http://localhost:5175/sso/callback` |
| LPPM | `SSO_CALLBACK_URL_LPPM_UNUSU` | `http://localhost:5176/sso/callback` |
| LPM | `SSO_CALLBACK_URL_LPM_UNUSU` | `http://localhost:5177/sso/callback` |
| SDM & Sarpras | `SSO_CALLBACK_URL_SDM_SARPRAS` | `http://localhost:5178/sso/callback` |
| Akreditasi | `SSO_CALLBACK_URL_UNUSU_AKREDITASI` | `http://localhost:5179/sso/callback` |
| Portal Prodi | `SSO_CALLBACK_URL_PRODI_UNUSU` | `http://localhost:5180/sso/callback` |
| BAKSA | `SSO_CALLBACK_URL_BAKSA_UNUSU` | `http://localhost:5181/sso/callback` |
| BAKSI | `SSO_CALLBACK_URL_BAKSI_UNUSU` | `http://localhost:5182/sso/callback` |

Override berlaku di lokal maupun VPS. Mengubah callback tidak mengubah port listener aplikasi: sesuaikan konfigurasi server/Vite dan reverse proxy secara terpisah.

## Pemilihan lingkungan

- `mode` dari pemanggil registry mendahului `SSO_ENV` (`local`, `vps`, atau `production`). Tanpa keduanya, hostname loopback pada public base URL memilih lokal hanya di pengembangan; selain itu VPS.
- `NODE_ENV=production` atau `SSO_ENV=production` melarang mode lokal. `SSO_ENV=vps` juga menolak pemanggilan mode lokal agar skrip dev tidak menimpa callback VPS.
- Mode VPS/produksi mewajibkan seluruh sembilan env callback di atas. Tidak ada fallback domain atau callback turunan `PUBLIC_BASE_URL`, `SEED_PUBLIC_BASE_URL`, `PRODI_BASE_URL`, maupun `SEED_PRODI_BASE_URL`.
- URL harus absolut dengan protokol HTTP/HTTPS tanpa username/password. VPS/produksi menolak localhost (termasuk subdomainnya), loopback IPv4/IPv6, dan alamat bind wildcard. Gunakan HTTPS pada deployment publik; pemeriksaan ini bukan validasi DNS atau konfigurasi TLS.

## Sinkronisasi database

Di folder `one-unusu`, `npm run db:sso-dev-urls` memakai registry mode `local`; `npm run db:sso-vps-urls` memakai mode `vps`. Keduanya memvalidasi seluruh callback sebelum menulis dan memperbarui hanya `urlRedirect` aplikasi yang sudah terdaftar, memakai client ID registry. Seed dan sync admin memakai resolver yang sama.

Perubahan env saja tidak memperbarui callback tersimpan di database. Periksa konfigurasi dan minta persetujuan operator sebelum menjalankan skrip sinkronisasi atau seed; jangan menjalankan skrip lokal terhadap database produksi. Jangan memasukkan rahasia ke URL callback atau membagikan nilai client key.

Pengujian tanpa database: `node --import tsx tests/sso-app-callbacks.test.ts` dari folder `one-unusu`.
