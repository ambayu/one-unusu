# COLOR TOKENS - ONE UNUSU

Standar warna resmi aplikasi ONE UNUSU. Ada dua palet sesuai permukaan: **Modern Green** untuk panel SSO, dan **brand/gold** untuk portal publik. Dilarang menambah kode HEX baru langsung di kelas Tailwind.

---

## 1. Primary Colors (Hijau Kelembagaan)

| Nama Token | HEX | Tailwind Class | Penggunaan Utama |
|---|---|---|---|
| **Primary Green** | `#166534` | `bg-[#166534]`, `text-[#166534]` | Tombol utama, navigasi aktif, link penting |
| **Deep Green** | `#14532D` | `bg-[#14532D]`, `hover:bg-[#14532D]` | Hover tombol primer, teks judul hijau |
| **Secondary Green** | `#15803D` | `bg-[#15803D]`, `text-[#15803D]` | Indikator sukses, hover sekunder |
| **Accent Green** | `#22C55E` | `bg-[#22C55E]`, `text-[#22C55E]` | Indikator status aktif, aksen border |
| **Soft Green** | `#DCFCE7` | `bg-[#DCFCE7]`, `text-[#DCFCE7]` | Badge status sukses, wadah icon, teks sidebar |
| **Pale Green** | `#F0FDF4` | `bg-[#F0FDF4]`, `border-[#F0FDF4]` | Welcome card, header tabel data, highlight bar |

---

## 2. Neutral Colors (Permukaan & Teks)

| Nama Token | HEX | Tailwind Class | Penggunaan Utama |
|---|---|---|---|
| **Main Background** | `#F1F5F2` | `bg-[#F1F5F2]` | Canvas latar belakang seluruh halaman web |
| **Surface / Card** | `#FFFFFF` | `bg-white` | Kartu konten, dropdown menu, panel input |
| **Main Text** | `#1E293B` | `text-[#1E293B]` | Judul halaman, heading, nama pengguna, teks utama |
| **Secondary Text** | `#475569` | `text-[#475569]` | Deskripsi fitur, subtitle, label form |
| **Muted Text** | `#64748B` | `text-[#64748B]` | Metadata, tanggal, keterangan pendukung |
| **Placeholder** | `#94A3B8` | `text-[#94A3B8]` | Placeholder input, divider separator kecil |
| **Border Green** | `#D8E5DC` | `border-[#D8E5DC]` | Border seluruh kartu, tabel, dan form input |
| **Divider** | `#E8EFEA` | `border-[#E8EFEA]` | Garis pemisah horizontal halus di dalam kartu |

---

## 3. Semantic Colors (Status & Feedback)

| Status | Background Token | Border Token | Text Token |
|---|---|---|---|
| **Success** | `#DCFCE7` | `#BBF7D0` | `#166534` / `#15803D` |
| **Warning** | `#FEF3C7` | `#FDE68A` | `#92400E` / `#B45309` |
| **Error / Alert** | `#FEE2E2` | `#FECACA` | `#B91C1C` |
| **Information** | `#E0F2FE` | `#BAE6FD` | `#0369A1` |

---

## 4. Palet Portal Publik (brand & gold)

Didefinisikan sebagai token Tailwind di `tailwind.config.js`. Wajib dipakai sebagai kelas token (`bg-brand-900`, `text-gold-400`), bukan HEX mentah.

| Token | HEX | Penggunaan Utama |
|---|---|---|
| **brand-50** | `#f0f8f3` | Latar chip, hover menu |
| **brand-100** | `#dbefe2` | Border kartu portal, divider |
| **brand-200** | `#b6dfc6` | Border tombol sekunder |
| **brand-600** | `#186f45` | Ikon dan aksen |
| **brand-700** | `#125a38` | Tombol utama portal |
| **brand-900** | `#0b3a25` | Latar section gelap |
| **brand-950** | `#052116` | Footer, teks judul paling gelap |
| **gold-300** | `#e2c46d` | Aksen teks di atas latar gelap |
| **gold-400** | `#d3ac46` | Tombol pendaftaran, garis aksen |
| **gold-600** | `#9c7624` | Aksen ikon |
| **gold-700** | `#7b5c1f` | Teks aksen kontras tinggi |
| **ivory** | `#faf9f5` | Latar lembut alternatif |
| **unusu-green** | `#0A5C36` | Identitas logo UNUSU |
| **unusu-gold** | `#D4AF37` | Identitas logo UNUSU |

---

## 5. Aturan Cakupan Palet

1. **Panel SSO** (`/login`, `/dashboard`, `/profil`, `/admin`): hanya Modern Green dan warna netral di atas. Dilarang memakai `brand-*` atau `gold-*`.
2. **Portal publik** (`/`, `/aplikasi`, `/layanan`, `/bantuan`, `/fakultas`, `/prodi`, `/keamanan`): memakai `brand-*` dan `gold-*`. Dilarang memakai HEX Modern Green mentah.
3. **Warna semantik** (success, warning, error, information) boleh dipakai di kedua permukaan.
4. **Larangan**: kode HEX baru di luar tabel 1 sampai 7. Jika butuh nuansa baru, tambahkan token di `tailwind.config.js` lebih dulu, lalu dokumentasikan di sini.

---

## 6. Neutral Ramp Portal Publik (`stone`)

Portal publik memakai ramp netral hangat `stone` bawaan Tailwind. Ini resmi dan sengaja berbeda dari panel (cool slate `#1E293B`/`#475569`/`#64748B`) supaya permukaan publik terasa lebih hangat. Dilarang memakai hex panel di portal publik, dan dilarang memakai `stone-*` di panel SSO.

| Class | HEX | Penggunaan |
|---|---|---|
| `stone-100` | `#f5f5f4` | Divider halus, border pemisah di dalam kartu |
| `stone-200` | `#e7e5e4` | Border kartu dan input |
| `stone-400` | `#a8a29e` | Ikon redup, chevron, teks nonaktif |
| `stone-500` | `#78716c` | Metadata, keterangan pendukung |
| `stone-600` | `#57534e` | Paragraf deskripsi |
| `stone-700` | `#44403c` | Label dan item navigasi |
| `stone-800` | `#292524` | Item navigasi aktif |

---

## 7. Ramp Permukaan Sidebar Panel

Sidebar panel memakai ramp hijau muda tersendiri, di luar token bagian 1 dan palet `brand`/`gold`. Nilai berikut final. Dilarang menambah variasi baru tanpa memperbarui tabel ini.

| HEX | Penggunaan |
|---|---|
| `#EEF7EF` | Latar sidebar |
| `#C2ECD0` | Header brand sidebar |
| `#9BD4AF` | Border bawah header brand |
| `#C8DDD0` | Border kanan sidebar |
| `#B8D0BD` | Divider antar section navigasi |
| `#C5D9CA` | Border kartu footer sidebar |
| `#E4F2E9` | Hover item navigasi |
| `#D8F0E1` | Latar item navigasi aktif |
| `#145A32` | Teks item navigasi aktif |
| `#D3EAD9` | Latar kotak ikon nonaktif |
| `#4D7A60` | Ikon nonaktif |
| `#9BB5A3` | Label section uppercase |
| `#3A5544` | Teks item navigasi nonaktif |
| `#3F5B4B` | Teks "ONE" pada wordmark |
| `#0F4527` | Teks "UNUSU" pada wordmark |
| `#2F6B45` | Subjudul "Gateway Sistem Terpadu" |
| `#A5DCB9` | Border kotak logo |
| `#A9E0BC` | Hover tombol tutup sidebar |

Catatan status: nilai di tabel ini belum dipindahkan menjadi token `tailwind.config.js`, sehingga masih dipakai sebagai arbitrary value. Tabel ini yang menjadi acuan resmi sampai tokenisasi dilakukan.
