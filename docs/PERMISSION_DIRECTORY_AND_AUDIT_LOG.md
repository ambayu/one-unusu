# Spesifikasi & Dokumentasi: Permission Directory dan Jejak Audit (`/admin/izin`)

Dokumen ini menganalisis arsitektur, struktur data, alur otorisasi, dan status implementasi modul **Permission Directory** (Katalog Izin Berbasis Resource:Action) serta model **Audit Log** pada aplikasi **ONE UNUSU**.

---

## 1. Ringkasan Eksekutif

| Komponen | Status Implementasi | Lokasi Kode Utama |
|---|---|---|
| **Permission Directory (Katalog Izin)** | **Aktif Penuh (Fullstack)** | Frontend: `src/client/pages/admin/Izin.tsx`<br>Backend: `src/server/index.ts` (`GET /api/admin/permissions`, `PUT /api/admin/roles/:id/permissions`)<br>Prisma & Seed: `prisma/schema.prisma` (`Permission`, `RolePermission`, `Role`), `prisma/access-control.ts` |
| **Audit Log (Pencatatan Riwayat)** | **Background Logging / Terpusat** | Prisma: `prisma/schema.prisma` (`model AuditLog` tabel `audit_logs`)<br>Catalog Izin: Tidak menggunakan permission khusus karena tidak ada menu terpisah (mengikuti governance menu aktif)<br>Backend & UI: Background audit recorder & CLI maintenance |

---

## 2. Permission Directory (`/admin/izin`)

### 2.1 Tujuan & Filosofi Desain
1. **Otorisasi Berbasis Granularitas `resource:action` (RBAC Dinamis)**:
   - Akses sistem **tidak lagi diikat ke nama peran mentah** (string role), melainkan diikat ke matriks pasangan sumber daya (*resource*) dan tindakan (*action*).
   - Pengguna dengan peran kustom tetap dapat diatur hak aksesnya tanpa perlu modifikasi kode backend.
2. **Eliminasi Single Point of Elevation**:
   - Menu di UI disaring oleh izin `resource:menu`.
   - Endpoint baca dilindungi `resource:view`.
   - Endpoint mutasi dilindungi `resource:edit` dan `resource:delete`.
3. **Aturan Anti-Eskalasi Hak Akses (Privilege Escalation Guard)**:
   - Pada `PUT /api/admin/roles/:id/permissions`, server memeriksa apakah pemohon memiliki seluruh izin yang ingin ia bagikan ke peran target (`getUserPermissionKeys(req.user.id)`).
   - Administrator tidak dapat memberikan izin yang tidak ia miliki sendiri kepada peran lain (mencegah akun subordinat mengangkat dirinya sendiri).

---

### 2.2 Struktur Data & Skema Database

```prisma
// prisma/schema.prisma

model Permission {
  id          Int              @id @default(autoincrement())
  key         String           @unique @db.VarChar(100) // format "resource:action" (cth: "user:edit")
  resource    String           @db.VarChar(50)          // modul (cth: "user", "application")
  action      String           @db.VarChar(50)          // aksi (cth: "menu", "view", "edit", "delete")
  label       String           @db.VarChar(100)         // label ramah pengguna
  description String?          @db.VarChar(255)
  createdAt   DateTime         @default(now())
  roles       RolePermission[]

  @@map("permissions")
}

model RolePermission {
  id           Int        @id @default(autoincrement())
  roleId       Int
  permissionId Int
  createdAt    DateTime   @default(now())

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
  @@map("role_permissions")
}

model Role {
  id          Int              @id @default(autoincrement())
  code        String           @unique @db.VarChar(50)  // "SUPERADMIN", "ADMIN_SSO", dll.
  name        String           @db.VarChar(100)
  description String?          @db.VarChar(255)
  isSystem    Boolean          @default(false)          // true jika peran bawaan tidak boleh dihapus
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  users       User[]
  permissions RolePermission[]

  @@map("roles")
}
```

---

### 2.3 Sumber Tunggal Katalog Izin (`prisma/access-control.ts`)

Katalog izin terdaftar dalam konstanta `PERMISSION_CATALOG` dengan format terstruktur:

```typescript
export const PERMISSION_CATALOG = [
  { resource: "dashboard", label: "Dashboard SSO", actions: ["menu", "view"] },
  { resource: "profile", label: "Biodata Pengguna", actions: ["menu", "view", "edit"] },
  { resource: "application", label: "Registrasi SSO", actions: ["menu", "view", "edit", "delete"] },
  { resource: "slider", label: "Slider Hero", actions: ["menu", "view", "edit", "delete"] },
  { resource: "user", label: "Manajemen Pengguna", actions: ["menu", "view", "edit", "delete"] },
  { resource: "permission", label: "Izin", actions: ["menu", "view", "edit"] },
  { resource: "role", label: "Peran", actions: ["menu", "view", "edit", "delete"] },
] as const;
```

**Arti Semantic Action:**
- `menu`: Menampilkan item navigasi pada sidebar dan navbar. Jika tidak ada, pengguna tidak dapat melihat tautan menuju modul tersebut.
- `view`: Mengizinkan pemanggilan endpoint GET (membaca data).
- `edit`: Mengizinkan pembuatan/pengubahan data (POST/PUT).
- `delete`: Mengizinkan penghapusan data (DELETE).
- `export`: Hak khusus untuk mengunduh log atau rekonsiliasi data keluar dari sistem.

---

### 2.4 Fungsionalitas Antarmuka (`src/client/pages/admin/Izin.tsx`)

1. **Matriks Dua Dimensi (Grid Roles vs Permissions)**:
   - Sumbu Vertikal: Daftar izin dikelompokkan berdasarkan `resource` (Dashboard, User, SSO, Direktori, dsb.) dengan tag badge warna untuk `action` (Menu = Biru `#EFF6FF`, View = Hijau `#F0FDF4`, Edit = Kuning `#FEF3C7`, Delete = Merah `#FEE2E2`).
   - Sumbu Horizontal: Seluruh peran sistem (`Role`) beserta informasi jumlah pengguna (`userCount`) dan ikon gembok untuk peran sistem bawaan (`isSystem`).
   - Sticky Header & Sticky First Column: Kolom nama izin terkunci di kiri (`sticky left-0 bg-white z-10`), menjaga kemudahan pembacaan saat tabel di-scroll horizontal pada layar kecil/menengah.
2. **Draft State & Dirty Tracking**:
   - Modifikasi checkbox izin tidak langsung menembak API, melainkan ditampung pada `draft: Record<number, string[]>`.
   - `dirtyRoleIds: number[]` melacak peran mana saja yang mengalami modifikasi.
   - Tombol "Simpan Perubahan (N)" hanya aktif jika ada peran yang berubah (`dirtyRoleIds.length > 0`), menghemat beban transaksi server.
3. **Perlindungan Template & Desain**:
   - Mematuhi aturan `AdminPanelTemplate`: tombol Muat Ulang terintegrasi dengan spinner loading, token warna Modern Green (`#166534`, `#D8E5DC`, `#F0FDF4`), serta status dialog notifikasi `CheckCircleIcon` dan `ExclamationCircleIcon`.

---

## 3. Fitur Audit Log (`audit_logs`)

### 3.1 Skema Model Data (`prisma/schema.prisma:177`)

Model `AuditLog` dirancang sebagai tabel **append-only** (hanya tambah, tanpa update/delete):

```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  actorId    Int?     // User ID pelaku. NULL jika aksi anonim atau background batch
  actor      User?    @relation(fields: [actorId], references: [id], onDelete: SetNull)
  actorLabel String?  @db.VarChar(191) // Snapshot username/nama agar riwayat tetap terbaca meski akun terhapus
  action     String   @db.VarChar(60)  // Cth: "LOGIN_SUCCESS", "ROLE_UPDATE", "USER_ACCESS_KEY_CHANGE"
  resource   String   @db.VarChar(60)  // Cth: "user", "sso_app", "role", "layanan_kampus"
  resourceId String?  @db.VarChar(64)  // ID target objek yang dimutasi
  status     String   @default("SUCCESS") @db.VarChar(20) // "SUCCESS" | "DENIED" | "FAILED"
  ipAddress  String?  @db.VarChar(45)  // Mendukung IPv4 dan IPv6
  userAgent  String?  @db.VarChar(255) // Browser/User Agent string
  metadata   Json?    // Detail snapshot delta perubahan: field sebelum vs sesudah, query params, atau alasan
  createdAt  DateTime @default(now())

  // Indeks Kueri Performa:
  @@index([createdAt])
  @@index([actorId, createdAt])
  @@index([resource, resourceId])
  @@index([action, createdAt])
  @@map("audit_logs")
}
```

### 3.2 Analisis Kesiapan & Rekomendasi Alur Audit

1. **Indeks Database Sudah Optimal**:
   - Skema sudah mengindeks `createdAt` untuk kronologi log terbaru, `[actorId, createdAt]` untuk investigasi perorangan, dan `[resource, resourceId]` untuk melacak jejak suatu entitas tertentu.
2. **Katalog Izin Sudah Tersedia**:
   - Izin `audit:menu`, `audit:view`, dan `audit:export` telah terdaftar di `PERMISSION_CATALOG` (`prisma/access-control.ts`), dan peran `SUPERADMIN`, `ADMIN_SSO`, serta `ADMIN_LPM` telah diberi izin ini secara default.
3. **Penyambungan Riwayat Mutasi Izin**:
   - Saat admin menyimpan matriks izin pada `PUT /api/admin/roles/:id/permissions`, server idealnya memanggil fungsi pencatatan:
     ```typescript
     await prisma.auditLog.create({
       data: {
         actorId: req.user.id,
         actorLabel: req.user.username,
         action: "ROLE_PERMISSIONS_UPDATE",
         resource: "role",
         resourceId: String(role.id),
         status: "SUCCESS",
         ipAddress: req.ip,
         userAgent: req.headers["user-agent"]?.slice(0, 255),
         metadata: {
           roleCode: role.code,
           grantedKeys: requestedKeys,
           total: requestedKeys.length,
         },
       },
     });
     ```
   - Rekam jejak ini menyediakan akuntabilitas penuh bagi pimpinan kampus apabila terjadi pergantian atau penyalahgunaan hak akses.

---

## 4. Panduan Verifikasi untuk QA & Pengembang

1. **Melihat Katalog Izin di Panel**:
   - Login sebagai `SUPERADMIN` (username: `admin`).
   - Buka navigasi panel admin di `/admin/izin`.
   - Pastikan seluruh resource (`dashboard`, `profile`, `application`, `user`, `permission`, `role`, `slider`) tampil lengkap dengan aksi yang sesuai dengan sub-menu yang aktif.
2. **Uji Anti-Eskalasi Hak Akses**:
   - Login dengan akun yang memiliki hak `permission:edit` terbatas (misal tidak memiliki `application:delete`).
   - Coba berikan izin `application:delete` ke peran lain.
   - Server wajib menolak dengan HTTP `403` dan pesan `"Anda tidak dapat memberikan izin yang tidak Anda miliki sendiri."`.
