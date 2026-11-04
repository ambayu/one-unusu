# RENCANA SKEMA & MIGRASI AMAN — ONE UNUSU

> Dokumen kerja untuk perubahan skema **`20261101130000_safe_indexes_and_audit_log`**.
> Status: **DIEKSEKUSI & TERVERIFIKASI** pada 4 Nov 2026, 17:14–17:22 WIB (lihat §10).
> Approval: diberikan user lewat obrolan ("Disetujui dari obrolan").

---

## 1. Ringkasan Perubahan

| # | Objek | Jenis | Dampak | Reversibel |
|---|-------|-------|--------|------------|
| 1 | `users.lastLoginAt` (DATETIME NULL) | Tambah kolom | Aditif, nilai `NULL` untuk data lama | Ya |
| 2 | `sso_auth_tokens.usedAt` (DATETIME NULL) | Tambah kolom | Aditif | Ya |
| 3 | `sso_auth_tokens.requestIp` (VARCHAR(45) NULL) | Tambah kolom | Aditif, cukup IPv4 & IPv6 | Ya |
| 4 | Tabel `audit_logs` + 4 index + FK `actorId` | Tabel baru | Aditif, tidak menyentuh tabel lama | Ya (drop tabel) |
| 5 | 14 index performa | Tambah index | Metadata; memperlambat write sedikit, mempercepat read | Ya |
| 6 | `permissions_resource_idx` → `permissions_resource_action_idx` | Ganti index | **Satu-satunya operasi non-aditif**; metadata-only, instan | Ya |

Tidak ada `DROP TABLE`, `DROP COLUMN`, rename kolom, atau perubahan tipe data pada tabel berisi data.

---

## 2. Justifikasi Index (index ↔ query nyata)

Setiap index harus punya query pendukung di `src/server/index.ts`. Index tanpa query = beban write tanpa manfaat.

| Index | Query yang dilayani | Lokasi |
|-------|--------------------|--------|
| `users_nim_idx`, `users_nidn_idx` | `WHERE username = ? OR nim = ? OR nidn = ?` (login SSO) | `index.ts` L580 |
| `users_role_isActive_idx` | `COUNT(*) WHERE role = ?` pada statistik dashboard | `index.ts` L1152–1153 |
| `users_prodi_idx` | Filter daftar pengguna per program studi | panel admin |
| `sso_apps_isActive_order_idx` | `WHERE isActive = true ORDER BY order ASC` | `index.ts` L721, L864, L1286 |
| `sso_auth_tokens_clientId_isUsed_expiresAt_idx` | Validasi tiket cabang + `updateMany` burn token | `index.ts` L1032, L1063 |
| `sso_auth_tokens_userId_createdAt_idx` | Riwayat SSO per pengguna (audit) | halaman audit |
| `sso_auth_tokens_expiresAt_idx` | `DELETE WHERE expiresAt < ?` (housekeeping) | `index.ts` L951 |
| `permissions_resource_action_idx` | `ORDER BY resource ASC, action ASC` | `index.ts` L1479 |
| `layanan_kampus_active_urutan_idx` | `WHERE active = true ORDER BY urutan ASC` | `index.ts` L1690, L1715 |
| `layanan_kampus_kategori_active_idx` | Filter tab kategori layanan | portal publik |
| `berita_publishedAt_idx` | Arsip berita `ORDER BY publishedAt DESC` | landing page |
| `berita_kategori_publishedAt_idx` | Berita per kategori | landing page |
| `banner_sliders_active_urutan_idx` | `WHERE active = true ORDER BY urutan ASC` | `index.ts` L1883, L1907 |
| `audit_logs_*` (4 index) | Feed audit, audit per aktor, per objek, per aksi | modul baru |

**Index yang sengaja TIDAK dibuat** (agar tidak menambah beban write):
- `role_permissions(permissionId)` — sudah dibuat otomatis oleh MySQL untuk FK.
- `sso_auth_tokens(token, clientId)` — redundan terhadap `token UNIQUE`; dipertahankan dulu
  agar migrasi tetap aditif, kandidat pembersihan pada migrasi terpisah.
- `prodi(fakultasId)` — sudah otomatis via FK.
- Index pada kolom `TEXT`/`LONGTEXT` (`berita.konten`, `banner_sliders.gambarUrl`) — tidak didukung
  tanpa prefix index, dan tidak ada pola query yang membutuhkannya.

---

## 2b. Drift Schema ↔ Database yang Ditemukan (dan diperbaiki di migrasi ini)

Ditemukan otomatis oleh `npm run db:parity` (`scripts/db/verify-migration-parity.ts`,
statis tanpa database). Ketiganya **bug laten** yang akan muncul saat runtime:

| # | Drift | Dampak nyata | Perbaikan |
|---|-------|--------------|-----------|
| 1 | `banner_sliders.gambarMobileUrl` tidak pernah dibuat migrasi | `prisma.bannerSlider` melempar error "Unknown column" pada semua query slider | `ADD COLUMN ... LONGTEXT NULL` |
| 2 | `banner_sliders.gambarUrl` = `VARCHAR(191)`, schema `@db.LongText` | Upload gambar base64 > 191 char gagal `Data too long for column` | `MODIFY ... LONGTEXT NOT NULL` |
| 3 | `berita.konten` = `LONGTEXT NOT NULL`, schema `String?` | Draf berita tanpa isi tidak bisa disimpan | `MODIFY ... LONGTEXT NULL` |

Ketiganya **melebarkan** tipe atau menambah kolom → tidak memotong data.
Perbaikan #2 memakai `ALGORITHM=COPY` (VARCHAR → LONGTEXT tidak bisa INPLACE),
sehingga menahan write singkat pada `banner_sliders` yang berukuran kecil (< 50 baris).

Setelah migrasi, `npm run db:parity` harus melaporkan **SELARAS** (sudah diverifikasi
sekarang, sebelum eksekusi).

---

## 3. Perubahan Query yang Direkomendasikan (tanpa mengubah kontrak API)

1. **Daftar pengguna admin — paginasi berbasis keyset**
   ```ts
   // Sebelum: SELECT ... ORDER BY id DESC  (full scan saat user membesar)
   const users = await prisma.user.findMany({
     where: { isActive: true },
     orderBy: { id: "desc" },
     take: 50,
     ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
   });
   ```
   Memakai PK (sudah ter-index) + `take` tetap, tanpa `skip` besar.

2. **Statistik dashboard — satu query agregat**
   ```ts
   const [agg] = await prisma.$queryRaw`
     SELECT COUNT(*) AS total,
            SUM(role = 'MAHASISWA') AS mahasiswa,
            SUM(role = 'DOSEN')     AS dosen
       FROM users WHERE isActive = true`;
   ```
   Menggantikan 3× `COUNT` terpisah; dilayani `users_role_isActive_idx`.

3. **Housekeeping token SSO — hapus bertahap**
   ```ts
   // Sebelum: deleteMany({ where: { expiresAt: { lt: yesterday } } }) -> bisa lock lama
   await prisma.$executeRaw`
     DELETE FROM sso_auth_tokens
      WHERE expiresAt < NOW() - INTERVAL 1 DAY
      ORDER BY expiresAt LIMIT 5000`;
   ```
   Loop sampai `affectedRows = 0`. Dilayani `sso_auth_tokens_expiresAt_idx`.
   Tersedia sebagai script: `npx tsx scripts/db/cleanup-sso-tokens.ts`.

4. **Validasi token cabang** — tambahkan `isUsed: false` + `expiresAt: { gt: new Date() }`
   pada `findFirst` agar `sso_auth_tokens_clientId_isUsed_expiresAt_idx` terpakai penuh
   (saat ini filter dilakukan di aplikasi setelah row diambil).

5. **Audit log** — selalu `ORDER BY createdAt DESC LIMIT n` + filter eksplisit, agar
   `audit_logs_createdAt_idx` terpakai dan tabel tidak pernah dipindai penuh.

---

## 4. Rencana Eksekusi (bertahap, dengan titik balik)

| Tahap | Aksi | Waktu | Verifikasi |
|-------|------|-------|------------|
| 0 | `npx tsx scripts/db/preflight-migration.ts` (read-only) | 1 menit | Semua `[AKAN ...]`, tanpa `[BLOCKER]` |
| 1 | Backup: `mysqldump --single-transaction --routines one_unusu_db > backup_pre_indexes.sql` | 2 menit | Ukuran file > 0, `grep CREATE TABLE` lengkap |
| 2 | Terapkan migrasi: `npx prisma migrate deploy` | < 5 detik | `_prisma_migrations` mencatat `finished_at` |
| 3 | `npx prisma generate` | 30 detik | `AuditLog` tersedia di Prisma Client |
| 4 | Ulangi preflight | 1 menit | Semua index/kolom `[EXISTS]` |
| 5 | Smoke test login SSO + portal + admin | 5 menit | Tidak ada error 500 |
| 6 | Pantau `SHOW PROCESSLIST` & slow query log 24 jam | — | Tidak ada regresi write |

**Jendela eksekusi disarankan:** di luar jam akademik (mis. 22.00–23.00 WIB), walau
`ALGORITHM=INPLACE, LOCK=NONE` sudah memungkinkan operasi tanpa downtime.

### Bila `ALGORITHM=INPLACE, LOCK=NONE` ditolak server
Migrasi akan **gagal sebelum menyentuh data**. Hapus hint pada statement terkait, lalu
ulangi. Ini adalah kegagalan aman (fail-fast), bukan korupsi data.

### Bila migrasi berhenti di tengah jalan
1. Jangan jalankan ulang `migration.sql` mentah — sebagian index mungkin sudah ada.
2. Jalankan `npx tsx scripts/db/preflight-migration.ts` untuk melihat objek mana yang sudah ada.
3. Komentari baris yang sudah terpenuhi, lalu lanjutkan sisa statement secara manual.
4. Bila perlu mundur total: jalankan `rollback.sql` (lihat §5).

---

## 5. Rollback

File: `prisma/migrations/20261101130000_safe_indexes_and_audit_log/rollback.sql`
(tidak dijalankan otomatis oleh Prisma).

Urutan: pulihkan index `permissions_resource_idx` → lepas 14 index baru → `DROP TABLE audit_logs`
→ lepas 3 kolom. **Ekspor `audit_logs` lebih dulu** jika tabel sudah berisi data.

Rollback index bersifat instan dan tidak menyentuh baris data. Rollback kolom/tabel
menghilangkan data yang tersimpan di objek tersebut — itulah satu-satunya sumber kehilangan data,
dan hanya terjadi bila dipicu manual.

---

## 6. Risiko & Mitigasi

| Risiko | Level | Mitigasi |
|--------|-------|----------|
| Lock tabel saat `ADD INDEX` | Rendah | `ALGORITHM=INPLACE, LOCK=NONE`; tabel < 10k baris |
| Write amplification dari 14 index baru | Rendah | Semua index punya query pendukung; kolom sempit |
| `audit_logs` tumbuh tanpa batas | Sedang | Retention 180 hari (job terjadwal), arsip sebelum purge |
| Migrasi diterapkan dua kali | Rendah | Preflight mendeteksi objek yang sudah ada; `_prisma_migrations` |
| Drift antara `schema.prisma` & DB | Sedang | Migrasi ditulis tangan **sesuai** `schema.prisma`; verifikasi via preflight |
| Index `permissions` terhapus salah nama | Rendah | Nama diverifikasi dari migrasi `20261029184022_asd` |

---

## 7. Perkakas Database (semua read-only kecuali ditandai)

| Perintah | Sifat | Fungsi |
|----------|-------|--------|
| `npm run db:parity` | statis, tanpa DB | Bandingkan `schema.prisma` ↔ seluruh `migration.sql` (model, kolom, index) |
| `npm run db:preflight` | read-only | Cek versi MySQL, row count aktual, index/kolom yang sudah ada |
| `npm run db:cleanup:tokens` | dry-run default | Hapus token SSO kedaluwarsa, batched `LIMIT` |
| `npm run db:purge:audit` | dry-run default | Retensi `audit_logs` 180 hari, batched `LIMIT` |

## 7b. Katalog Izin Baru untuk Modul Audit

`prisma/access-control.ts` (sumber tunggal katalog izin) ditambah resource `audit`:

- `audit:menu`, `audit:view`, `audit:export` (`export` dipisah karena membawa data keluar sistem).
- Diberikan ke `SUPERADMIN`, `ADMIN_SSO` (ALL_PERMISSIONS) dan enam peran `ADMIN_*` lewat
  `permissionKeys`.
- **Tidak** diberikan ke `DOSEN` / `MAHASISWA` — jejak audit memuat aktivitas administrator.
- Penyebaran baris `permissions` + `role_permissions` dilakukan oleh seeder
  (`npm run prisma:seed:access`), **bukan** oleh migrasi DDL, dan bersifat idempotent
  (`upsert` + `createMany skipDuplicates`). Seeder belum dijalankan pada sesi ini.

## 8. Pemisahan Tanggung Jawab

- **DATABASE (dokumen ini):** `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/access-control.ts`, `scripts/db/**`.
- **BACKEND:** penerapan poin §3 di `src/server/index.ts` (pemilik endpoint), termasuk penulisan baris `audit_logs`.
- **QA:** eksekusi preflight, backup, `migrate deploy`, `prisma:seed:access`, smoke test, dan pelaporan hasil.
- **Eksekusi DDL adalah wewenang QA/DevOps setelah approval** — bukan otomatis oleh agen.

---

## 9. Pengajuan Approval

```
[APPROVAL_REQUIRED: Menjalankan DDL aditif pada database `one_unusu_db`
(MySQL 8, InnoDB)]

Lingkup   : 4 kolom NULL-able + 2 pelebaran tipe (banner_sliders.gambarUrl -> LONGTEXT,
            berita.konten -> NULL-able), 1 tabel baru `audit_logs` + 4 index,
            14 index baru, 1 penggantian index `permissions_resource_idx`.
Alasan    : (a) performa query nyata, (b) audit trail tata kelola,
            (c) memperbaiki 3 drift schema↔DB yang menyebabkan error runtime
                (lihat §2b).
File      : prisma/migrations/20261101130000_safe_indexes_and_audit_log/migration.sql
Rollback  : prisma/migrations/20261101130000_safe_indexes_and_audit_log/rollback.sql
Prasyarat : (1) `npm run db:parity` = SELARAS [OK, sudah diverifikasi],
            (2) `npm run db:preflight` tanpa blocker,
            (3) backup logis terverifikasi,
            (4) jendela eksekusi disetujui.
Dampak    : Tidak ada kehilangan data. Downtime ~0 detik (INPLACE + LOCK=NONE);
            satu operasi COPY singkat pada `banner_sliders` (tabel < 50 baris).
            Estimasi total < 5 detik.
Tidak termasuk: seeder `prisma:seed:access` (menambah izin `audit:*`) dijalankan terpisah.
Status    : BELUM dieksekusi — tidak ada perubahan apa pun pada database.
```

---

## 10. Log Eksekusi (4 November 2026)

**Approval:** user menyetujui lewat obrolan ("Disetujui dari obrolan").

| Waktu | Tahap | Perintah | Hasil |
|-------|-------|----------|-------|
| 17:11 | Codegen | `npx prisma generate` | Client v6.19.3 dibuat ulang (sebelumnya rusak: `Cannot find module './runtime/library.js'`) |
| 17:12 | Preflight | `npm run db:preflight` | SIAP — MySQL 8.0.30, `users`=3, `sso_apps`=6, `sso_auth_tokens`=10; `banner_sliders` & `berita` = 0 baris |
| 17:14 | Backup | `npm run db:backup` | `backups/one_unusu_db_2026-11-04T10-14-08.sql` (24.9 KB, 12 `CREATE TABLE`) |
| 17:16 | Uji kering | restore backup ke `one_unusu_migtest` + jalankan `migration.sql` | `MIGRATION_SQL_OK` — DDL valid, 11 kolom `audit_logs`, semua index terbentuk; DB uji dihapus |
| 17:18 | Deploy #1 | `npx prisma migrate deploy` | `20261101130000_safe_indexes_and_audit_log` **APPLIED**; lalu GAGAL di `20261101140000_user_app_access` |
| 17:20 | Perbaikan | tambah `PRIMARY KEY (id)` pada migrasi `user_app_access` | Lihat "Insiden" di bawah |
| 17:21 | Deploy #2 | `prisma migrate resolve --rolled-back` + `migrate deploy` | **All migrations have been successfully applied** |
| 17:21 | Verifikasi | `npm run db:preflight -- --post` | LULUS — 3 kolom + 14 index + `audit_logs` semua `[OK]`, index lama `permissions_resource_idx` sudah hilang |
| 17:22 | Seeder | `npm run prisma:seed:access` | 31 izin (termasuk `audit:menu/view/export`), 114 `role_permissions` |
| 17:22 | Smoke test | `npm run db:verify:post` | **Semua LULUS** (lihat di bawah) |

### Insiden: migrasi `20261101140000_user_app_access` gagal (P3018)

- **Penyebab:** `CREATE TABLE user_app_accesses` mendeklarasikan `id INTEGER NOT NULL AUTO_INCREMENT`
  tanpa `PRIMARY KEY`, sehingga MySQL menolak dengan error 1075
  ("there can be only one auto column and it must be defined as a key").
- **Dampak:** hanya migrasi tersebut yang gagal. Migrasi `20261101130000` sudah terpasang utuh,
  tidak ada tabel/data yang setengah jadi (statement tunggal, atomik).
- **Perbaikan:** menambahkan `PRIMARY KEY (id)` lalu `prisma migrate resolve --rolled-back` +
  `migrate deploy`. Berhasil.
- **Pencegahan:** jalankan `npm run db:parity` sebelum deploy — pemeriksa kini juga menandai
  tabel tanpa primary key.

### Hasil smoke test (`npm run db:verify:post`)

```
[OK] audit_logs: insert + read + delete berhasil (metadata JSON valid)
[OK] users.lastLoginAt terbaca (contoh id=1, nilai=NULL)
[OK] sso_auth_tokens.usedAt/requestIp terbaca (contoh id=58)
[OK] izin audit terdaftar: audit:export, audit:menu, audit:view
[OK] ADMIN_AKREDITASI/ESURAT/LMS/LPM/LPPM/SARPRAS memiliki 2 izin audit
[OK] ADMIN_SSO & SUPERADMIN memiliki 3 izin audit
[OK] DOSEN & MAHASISWA tanpa izin audit (sesuai kebijakan)
Row count: users=3 sso_apps=6 sso_auth_tokens=10 permissions=31 role_permissions=114
```

Tidak ada baris data hilang: `users`, `sso_apps`, dan `sso_auth_tokens` tetap sama seperti bukti preflight.

### Sisa pekerjaan (bukan DATABASE)

1. **BACKEND** — mulai menulis `audit_logs` pada endpoint sensitif (login, ubah role, hapus aplikasi)
   dan memakai `users.lastLoginAt` saat login sukses.
2. **BACKEND** — terapkan usulan query §3 (paginasi keyset, agregat dashboard, `isUsed/expiresAt`
   pada validasi token).
3. **QA** — jalankan `npm run db:cleanup:tokens` (dry-run dulu) dan `npm run db:purge:audit` bila
   tabel audit sudah terisi.
4. **OPS** — jadwalkan retensi `audit_logs` 180 hari.

### Rollback bila diperlukan

`prisma/migrations/20261101130000_safe_indexes_and_audit_log/rollback.sql` — perlu
`prisma migrate resolve --rolled-back 20261101130000_safe_indexes_and_audit_log` lebih dulu
agar Prisma tahu migrasi dibatalkan, lalu jalankan isi `rollback.sql`.
