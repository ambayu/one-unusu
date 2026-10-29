# Admin Panel — Overview

Rute `/admin` adalah pusat tata kelola integrasi SSO ONE UNUSU. Halaman dipecah menjadi empat sub-rute yang masing-masing dilindungi izin `resource:action`:

| Rute | Halaman | Izin menu | Endpoint utama |
| --- | --- | --- | --- |
| `/admin` | Registrasi SSO | `application:menu` | `GET/POST/PUT/DELETE /api/admin/apps` |
| `/admin/direktori` | Direktori Publik | `directory:menu` | `GET/POST/PUT/DELETE /api/admin/directories` |
| `/admin/pengguna` | Manajemen Pengguna | `user:menu` | `GET/POST /api/admin/users` |
| `/admin/izin` | Izin | `permission:menu` | `GET /api/admin/permissions`, `PUT /api/admin/roles/:id/permissions` |
| `/admin/peran` | Peran | `role:menu` | `GET/POST/PUT/DELETE /api/admin/roles` |

Izin tidak diturunkan dari nama peran. Setiap pengguna memperoleh daftar izin dari peran yang melekat padanya (`User.roleId` ke model `Role`), lalu daftar tersebut dikirim pada respons login dan `GET /api/auth/me` sebagai `permissions: string[]`.
