# Modul Slider Hero (ONE UNUSU)

Modul untuk halaman `/admin/slider` pada panel ONE UNUSU dan hero beranda portal
publik.

## Berkas

| Lapisan | Berkas |
|---|---|
| Halaman panel | `src/client/pages/admin/ManajemenSlider.tsx` |
| Hero publik | `src/client/components/HeroSection.tsx` |
| Service API | `src/client/services/api.ts` (`SliderKiriman`, `buatFormSlider`, `kirimFormSlider`, `fetchAdminSliders`, `fetchPublicSliders`) |
| Utilitas klien | `src/client/lib/mediaSlider.ts` (`jenisMedia`, `validasiBerkasMedia`, `labelJenisMedia`) |
| Modul server | `src/server/lib/sliderMedia.ts` (`periksaUkuranMediaSlider`, `urlMediaSlider`, `hapusMediaSliderFisik`, `namaBerkasMediaDariUrl`) |
| Endpoint | `src/server/index.ts` (`/api/admin/sliders`, `/api/public/sliders`) + `express.static` pada `/storage/slider` |
| Model Prisma | `prisma/schema.prisma` → `BannerSlider` |

## Alur Data

1. `GET /api/public/sliders` mengembalikan baris aktif terurut menaik; `gambarUrl`
   hanya berisi path (`/storage/slider/<berkas>`), bukan base64.
2. Panel mengirim `POST`/`PUT` sebagai `multipart/form-data` dengan field `gambar`
   berisi berkas. Isi field kini berkas, bukan base64 — nama field dipertahankan agar
   kontrak lama tidak pecah.
3. Server menulis berkas ke disk dengan nama acak, memeriksa jenis dan ukuran,
   menyimpan path ke baris, lalu menghapus berkas lama setelah pembaruan berhasil.
4. `HeroSection` merender `<video>` untuk slide video (berpindah saat `ended`) dan
   `<img>` untuk slide gambar (timer 6 detik).

## Aturan

- Media **tidak** boleh disimpan sebagai base64; dilarang memakai `FileReader` pada
  unggahan slider. Pratinjau memakai `URL.createObjectURL` dan URL `blob:` wajib
  dicabut saat komponen dilepas.
- Batas ukuran: **gambar 5 MB**, **video 50 MB**; angka di klien harus sama dengan
  `src/server/lib/sliderMedia.ts`.
- Jenis media ditentukan dari ekstensi/data URL (`mp4`, `webm`, `ogg`, `ogv`, `mov`,
  `m4v`), bukan kolom database baru. Skema tidak berubah.
- Slide video tidak memakai timer; elemen video wajib `muted` dan `playsInline`.
- Aksi panel dijaga izin (`slider:view`, `slider:create`, `slider:update`,
  `slider:delete`); pengecekan peran dilarang.
- Penghapusan hanya menyentuh path berawalan `/storage/slider/` dengan nama berkas
  yang sah; URL luar dan data URL lama dilewati.

Acuan lintas aplikasi untuk aturan lengkap: `unusu-lms/docs/routes/slider/RULES.md`.
