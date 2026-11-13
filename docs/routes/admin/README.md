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

> Halaman `/admin/akses-aplikasi` (Kunci Aplikasi) beserta endpoint `/api/admin/app-access`, `/api/admin/users/:id/app-access`, dan `/api/admin/apps/:id/access` **sudah dihapus**. Otorisasi aplikasi cabang kini memakai **izin masuk global** (`masuk_admin`, `masuk_dosen`, `masuk_mahasiswa`) yang diiriskan dengan `sso_apps.targetRoles` di portal, serta `ALLOWED_SSO_ROLES` di server masing-masing aplikasi cabang. Lihat [`docs/PROJECT_RULES.md`](../../PROJECT_RULES.md) bagian 4.1.


> Analisis teknis mendalam mengenai Permission Directory dan model Audit Log dapat dibaca pada [`docs/PERMISSION_DIRECTORY_AND_AUDIT_LOG.md`](../../PERMISSION_DIRECTORY_AND_AUDIT_LOG.md).

Izin tidak diturunkan dari nama peran. Setiap pengguna memperoleh daftar izin dari seluruh peran yang melekat padanya melalui tabel junction `user_roles` (`User.roles` -> `Role`), lalu daftar tersebut dikirim pada respons login dan `GET /api/auth/me` sebagai `permissions: string[]`.
