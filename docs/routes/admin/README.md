# Admin Panel — Overview

Rute `/admin` adalah pusat tata kelola integrasi SSO ONE UNUSU. Halaman dipecah menjadi empat sub-rute yang masing-masing dilindungi izin `resource:action`:

| Rute | Halaman | Izin menu | Endpoint utama |
| --- | --- | --- | --- |
| `/admin` | Registrasi SSO | `application:menu` | `GET/POST/PUT/DELETE /api/admin/apps` |
| `/admin/akses-aplikasi` | Kunci Aplikasi | `application:menu` | `GET/PUT /api/admin/app-access` |
| `/admin/slider` | Slider Hero | `slider:menu` | `GET/POST/PUT/DELETE /api/admin/sliders` |
| `/admin/direktori` | Aplikasi Non-SSO | `non_sso:menu` | `GET/POST/PUT/DELETE /api/admin/directories` |
| `/admin/pengguna` | Manajemen Pengguna | `user:menu` | `GET/POST /api/admin/users` |
| `/admin/izin` | Izin | `permission:menu` | `GET /api/admin/permissions`, `PUT /api/admin/roles/:id/permissions` |
| `/admin/peran` | Peran | `role:menu` | `GET/POST/PUT/DELETE /api/admin/roles` |
| `/admin/pemeriksaan` | Pemeriksaan Sistem | `application:menu` | `GET /api/admin/system-check` |

> Analisis teknis mendalam mengenai Permission Directory dan model Audit Log dapat dibaca pada [`docs/PERMISSION_DIRECTORY_AND_AUDIT_LOG.md`](../../PERMISSION_DIRECTORY_AND_AUDIT_LOG.md).

Izin tidak diturunkan dari nama peran. Setiap pengguna memperoleh daftar izin dari peran yang melekat padanya (`User.roleId` ke model `Role`), lalu daftar tersebut dikirim pada respons login dan `GET /api/auth/me` sebagai `permissions: string[]`.
