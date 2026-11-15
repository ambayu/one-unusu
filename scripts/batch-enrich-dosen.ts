import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { scrapeAllDosenFromSia, scrapeDosenDetailFromSia } from "../dist/server/lib/siakadService.js";

dotenv.config();
const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const adminUser = process.env.SIAKAD_ADMIN_USER?.trim();
  const adminPass = process.env.SIAKAD_ADMIN_PASS;

  if (!adminUser || !adminPass) {
    console.error("Kredensial SIAKAD_ADMIN_USER / SIAKAD_ADMIN_PASS tidak ditemukan di .env!");
    process.exit(1);
  }

  console.log("=== MEMULAI BATCH ENRICHMENT BIODATA DOSEN SIAKAD ===");
  console.log("1. Mengambil daftar direktori dosen dari SIAKAD...");
  const siaLecturers = await scrapeAllDosenFromSia(adminUser, adminPass);
  console.log(`Berhasil mengambil ${siaLecturers.length} data dosen dari tabel induk SIAKAD.`);

  // Ambil semua pengguna ber-peran DOSEN di database lokal yang belum memiliki NIK
  const dosenUsers = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: { code: "DOSEN" },
        },
      },
      nik: null,
    },
    select: {
      id: true,
      username: true,
      nidn: true,
      nama: true,
      nik: true,
    },
  });

  console.log(`Ditemukan ${dosenUsers.length} akun dosen di database ONE UNUSU yang NIK-nya masih kosong.`);

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < dosenUsers.length; i++) {
    const u = dosenUsers[i];
    const identifier = (u.nidn || u.username).trim();
    const matchedSia = siaLecturers.find((d) => d.nidn === identifier || d.nidn === identifier.replace(/^0+/, ""));

    if (!matchedSia || !matchedSia.kodeSia) {
      console.log(`[${i + 1}/${dosenUsers.length}] Lewati: ${u.nama} (${identifier}) - kodeSia tidak ditemukan.`);
      skippedCount++;
      continue;
    }

    try {
      const detail = await scrapeDosenDetailFromSia(adminUser, adminPass, matchedSia.kodeSia);
      if (detail && (detail.nik || detail.tempatLahir || detail.alamat || detail.noHp)) {
        await prisma.user.update({
          where: { id: u.id },
          data: {
            nik: detail.nik || null,
            tempatLahir: detail.tempatLahir || null,
            tanggalLahir: detail.tanggalLahir || null,
            jenisKelamin: detail.jenisKelamin || null,
            noHp: detail.noHp || null,
            alamat: detail.alamat || null,
            syncedAt: new Date(),
          },
        });
        console.log(`[${i + 1}/${dosenUsers.length}] Berhasil diperbarui: ${u.nama} | NIK: ${detail.nik || "-"} | HP: ${detail.noHp || "-"}`);
        successCount++;
      } else {
        console.log(`[${i + 1}/${dosenUsers.length}] Kosong di SIAKAD: ${u.nama} (${identifier})`);
        skippedCount++;
      }
    } catch (err: any) {
      console.error(`[${i + 1}/${dosenUsers.length}] Gagal: ${u.nama} (${identifier}) - ${err.message}`);
      failCount++;
    }

    // Safe throttle delay 250ms agar server SIAKAD tidak terbebani
    await sleep(250);
  }

  console.log("\n=== RINGKASAN BATCH ENRICHMENT ===");
  console.log(`Total dosen diproses : ${dosenUsers.length}`);
  console.log(`Berhasil diupdate     : ${successCount}`);
  console.log(`Dilewati / Belum ada  : ${skippedCount}`);
  console.log(`Gagal koneksi         : ${failCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
