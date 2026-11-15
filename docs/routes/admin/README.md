# Admin Panel - Overview

Rute `/admin` adalah pusat tata kelola integrasi SSO ONE UNUSU. Halaman dipecah menjadi sub-rute berikut, masing-masing dilindungi izin `resource:action`:

| Rute | Halaman | Izin menu | Endpoint utama |
| --- | --- | --- | --- |
| `/admin` | Registrasi SSO | `application:menu` | `GET/POST/PUT/DELETE /api/admin/apps` |
| `/admin/slider` | Slider Hero | `slider:menu` | `GET/POST/PUT/DELETE /api/admin/sliders` |
| `/admin/direktori` | Aplikasi Non-SSO | `non_sso:menu` | `GET/POST/PUT/DELETE /api/admin/directories` |
| `/admin/pengguna` | Manajemen Pengguna | `user:menu` | `GET/POST /api/admin/users` |
| `/admin/izin` | Izin | `permission:menu` | `GET /api/admin/permissions`, `PUT /api/admin/roles/:id/permissions` |
| `/admin/peran` | Peran | `role:menu` | `GET/POST/PUT/DELETE /api/admin/roles` |
| `/admin/api-hub` | Integrasi & API Hub | `api_hub:menu` | Katalog endpoint integrasi (`GET /api/academic/hierarchy`), arsip dokumen per aplikasi (`GET /api/inter-service/dokumen-lpm`, `GET /api/inter-service/dokumen-lppm`) |
| `/admin/berkas-dosen` | Monitoring Berkas Dosen | `berkas_dosen:menu` + `berkas_dosen:view` | `GET /api/admin/berkas-dosen/monitoring` |

> Halaman `/admin/akses-aplikasi` (Kunci Aplikasi) beserta endpoint `/api/admin/app-access`, `/api/admin/users/:id/app-access`, dan `/api/admin/apps/:id/access` **sudah dihapus**. Otorisasi aplikasi cabang kini memakai **izin masuk global** (`masuk_admin`, `masuk_dosen`, `masuk_mahasiswa`) yang diiriskan dengan `sso_apps.targetRoles` di portal, serta `ALLOWED_SSO_ROLES` di server masing-masing aplikasi cabang. Lihat [`docs/PROJECT_RULES.md`](../../PROJECT_RULES.md) bagian 4.1.


> Analisis teknis mendalam mengenai Permission Directory dan model Audit Log dapat dibaca pada [`docs/PERMISSION_DIRECTORY_AND_AUDIT_LOG.md`](../../PERMISSION_DIRECTORY_AND_AUDIT_LOG.md).

Izin tidak diturunkan dari nama peran. Setiap pengguna memperoleh daftar izin dari seluruh peran yang melekat padanya melalui tabel junction `user_roles` (`User.roles` -> `Role`), lalu daftar tersebut dikirim pada respons login dan `GET /api/auth/me` sebagai `permissions: string[]`.

---

## Berkas Dosen — Halaman Dosen vs Halaman Admin

Modul berkas dosen memisahkan dua audiens:

| Rute | Audiens | Template | Endpoint |
| --- | --- | --- | --- |
| `/berkas-dosen` | Dosen (mengunggah berkas sendiri) | `PanelPageTemplate` berlabel "Panel Dosen ONE UNUSU" | `GET /api/berkas-dosen/tipe`, `GET /api/berkas-dosen/list`, `POST /api/berkas-dosen/upload`, `DELETE /api/berkas-dosen/:id`, `GET /api/berkas-dosen/file/:nama` |
| `/admin/berkas-dosen` | Pengelola (memantau kelengkapan) | `AdminPanelTemplate` | `GET /api/admin/berkas-dosen/monitoring` |

- **Halaman dosen hanya tiga blok**: kartu ringkasan progres, form unggah seksi, lalu satu daftar 14 jenis berkas. Tidak ada kartu statistik terpisah maupun tabel kedua di bawahnya.
- Setiap baris daftar mewakili satu JENIS berkas. Detail dokumen (nomor, tahun, ukuran, tanggal, pratinjau, hapus) dibuka di dalam baris tersebut.
- Admin **tidak** menyetujui/menolak berkas. Yang ditampilkan adalah daftar seluruh dosen aktif beserta status kelengkapan: belum mengunggah, sebagian, atau lengkap (14 jenis).
- Sumber data panel admin adalah tabel pengguna berperan `DOSEN`, sehingga dosen yang belum mengunggah apa pun tetap terlihat dan dapat ditindaklanjuti.
- Dosen **tidak** dapat membuka berkas dosen lain: permintaan dengan `userId` dosen lain diabaikan server dan dipaksa ke id pemilik sesi.
- Berkas tidak disajikan sebagai file statis. Akses selalu lewat endpoint terproteksi yang memeriksa sesi dan kepemilikan.
- Penghapusan bersifat arsip (soft delete); baris tetap ada untuk jejak audit.
- Aturan teknis lengkap ada di [`RULES.md`](RULES.md) bagian 6.
