import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

/**
 * Seeder katalog API Hub: endpoint dan API key.
 *
 * Sebelumnya `prisma/seed.ts` hanya mengisi `sso_apps`, sehingga setiap kali
 * database di-seed ulang, seluruh katalog endpoint dan API key hilang dan harus
 * dibuat manual lewat panel. Modul ini membuat keduanya idempoten:
 *
 * - Endpoint dikenali lewat `endpoint` (unik), jadi menjalankan seed berkali-kali
 *   hanya memperbarui keterangannya.
 * - API key dikenali lewat `name`, dan nilainya hanya ditulis saat baris pertama
 *   kali dibuat. Menjalankan ulang seed TIDAK menimpa kunci yang sudah beredar
 *   di `.env` aplikasi cabang.
 */

interface DefinisiEndpoint {
  name: string;
  description: string;
  endpoint: string;
  method: string;
  sourceApp: string;
  category: string;
  exampleRequest: string;
  exampleResponse: string;
  isPublic: boolean;
}

interface DefinisiKunci {
  name: string;
  description: string;
  /** Client ID aplikasi pemilik pada tabel `sso_apps`. */
  clientId: string;
  /** Nama variabel `.env` tempat kunci ini dipakai, untuk pesan konsol. */
  envKey: string;
  /** Alamat endpoint yang boleh dipanggil kunci ini. */
  endpointDiizinkan: string[];
}

/**
 * Katalog endpoint.
 *
 * Dua entri terakhir sengaja berpasangan: aplikasi cabang memanggil versi
 * `/api/v2/website/organisasi` milik ONE UNUSU, lalu ONE UNUSU meneruskannya ke
 * `/api/v1/public/organisasi` milik Portal Prodi. Pemanggil tidak perlu tahu
 * bahwa data aslinya berasal dari Portal Prodi.
 */
export const ENDPOINT_API_HUB: readonly DefinisiEndpoint[] = [
  {
    name: "Daftar Pengguna ONE UNUSU",
    description:
      "Pencarian pengguna direktori kampus untuk aplikasi cabang. Dipakai LPM, LPPM, Portal Prodi, BAKSI, dan BAKSA saat admin memilih anggota. Parameter `search` wajib minimal 2 karakter.",
    endpoint: "/api/v2/website/users",
    method: "POST",
    sourceApp: "ONE_UNUSU",
    category: "data",
    exampleRequest:
      'POST /api/v2/website/users\nAuthorization: Bearer unusu_sec_...\n\n{"search":"sep","limit":10}',
    exampleResponse:
      '{"status":true,"data":[{"id":12,"username":"septi","nama":"SEPTIARINI ZULIATI","email":"septi@unusu.ac.id","noHp":"08...","nim":null,"nidn":"...","nip":null,"fakultas":"Fakultas Ilmu Komputer","prodi":"Teknik Informatika","jenisKelamin":"P","avatar":null,"isActive":true}],"meta":{"total":1,"limit":10,"search":"sep"}}',
    isPublic: false,
  },
  {
    name: "Daftar Pengguna ONE UNUSU (berdasarkan ID)",
    description:
      "Mengambil sekumpulan pengguna berdasarkan id-nya, maksimal 50 per panggilan. Dipakai aplikasi cabang untuk memverifikasi pilihan dari tabel Tambah Pengguna, karena verifikasi berbasis nama gagal pada nama yang mengandung gelar atau tanda baca.",
    endpoint: "/api/v2/website/users/by-ids",
    method: "POST",
    sourceApp: "ONE_UNUSU",
    category: "data",
    exampleRequest:
      'POST /api/v2/website/users/by-ids\nAuthorization: Bearer unusu_sec_...\n\n{"ids":[38,50]}',
    exampleResponse:
      '{"status":true,"data":[{"id":38,"username":"...","nama":"-. EMI RACHMI, SKM","email":"...","fakultas":"Fakultas Ilmu Kesehatan","prodi":"D3 Analis Kesehatan","role":"DOSEN","roles":["DOSEN"],"isActive":true}],"meta":{"total":1,"diminta":2,"tidakDitemukan":[50]}}',
    isPublic: false,
  },
  {
    name: "Daftar Fakultas & Program Studi",
    description:
      "Hierarki fakultas beserta program studi di dalamnya, berbentuk bersarang. Sumber datanya Portal Prodi UNUSU. Hasil di-cache 5 menit.",
    endpoint: "/api/v2/website/organisasi",
    method: "GET",
    sourceApp: "ONE_UNUSU",
    category: "data",
    exampleRequest:
      "GET /api/v2/website/organisasi\nAuthorization: Bearer unusu_sec_...",
    exampleResponse:
      '{"status":true,"data":[{"id":1,"kode":"FIK","nama":"Fakultas Ilmu Komputer","slug":"fakultas-ilmu-komputer","urutan":1,"prodi":[{"id":1,"kode":"TIF","nama":"Teknik Informatika","slug":"teknik-informatika","jenjang":"S1","urutan":0}]}],"meta":{"totalFakultas":6,"totalProdi":14,"sumber":"Portal Prodi UNUSU","cache":false}}',
    isPublic: false,
  },
  {
    name: "Daftar Fakultas & Program Studi (Portal Prodi)",
    description:
      "Endpoint asal di Portal Prodi UNUSU. Dipanggil ONE UNUSU secara server-ke-server memakai PRODI_API_KEY. Aplikasi cabang tidak perlu memanggil ini langsung.",
    endpoint: "/api/v1/public/organisasi",
    method: "POST",
    sourceApp: "PRODI_UNUSU",
    category: "data",
    exampleRequest:
      "POST http://localhost:5010/api/v1/public/organisasi\nAuthorization: Bearer prodi_sec_...",
    exampleResponse:
      '{"success":true,"data":[{"id":1,"kode":"FIK","nama":"Fakultas Ilmu Komputer","slug":"fakultas-ilmu-komputer","urutan":1,"prodi":[{"id":1,"kode":"TIF","nama":"Teknik Informatika","slug":"teknik-informatika","jenjang":"S1","urutan":0}]}],"meta":{"totalFakultas":6,"totalProdi":14,"sumber":"Portal Prodi UNUSU"}}',
    isPublic: false,
  },
];

/**
 * API key bawaan.
 *
 * Kuncinya sengaja TIDAK ditulis di berkas ini. Saat seed dijalankan dan baris
 * belum ada, kunci dibuat acak lalu dicetak sekali ke konsol untuk disalin ke
 * `.env` aplikasi cabang. Bila baris sudah ada, nilainya dibiarkan apa adanya
 * sehingga aplikasi yang sedang berjalan tidak tiba-tiba kehilangan akses.
 */
export const KUNCI_API_HUB: readonly DefinisiKunci[] = [
  {
    name: "Direktori Pengguna — LPM UNUSU",
    description:
      "Token server-ke-server untuk pencarian direktori pengguna dan data organisasi ONE UNUSU.",
    clientId: "014813db6bffb39f",
    envKey: "lpm-unusu/.env → ONE_UNUSU_API_KEY",
    endpointDiizinkan: [
      "/api/v2/website/users",
      "/api/v2/website/users/by-ids",
      "/api/v2/website/organisasi",
    ],
  },
  {
    name: "Direktori Pengguna — LPPM UNUSU",
    description:
      "Token server-ke-server untuk pencarian direktori pengguna dan data organisasi ONE UNUSU.",
    clientId: "223ea0752e7619e2",
    envKey: "lppm-unusu/.env → ONE_UNUSU_API_KEY",
    endpointDiizinkan: [
      "/api/v2/website/users",
      "/api/v2/website/users/by-ids",
      "/api/v2/website/organisasi",
    ],
  },
  {
    name: "Direktori Pengguna — Portal Prodi UNUSU",
    description:
      "Token server-ke-server untuk pencarian direktori pengguna dan data organisasi ONE UNUSU.",
    clientId: "70c76ea9b5d5d3a8",
    envKey: "prodi-unusu/.env → ONE_UNUSU_API_KEY",
    endpointDiizinkan: [
      "/api/v2/website/users",
      "/api/v2/website/users/by-ids",
      "/api/v2/website/organisasi",
    ],
  },
  {
    name: "Direktori Pengguna — BAKSA UNUSU",
    description:
      "Token server-ke-server untuk pencarian direktori pengguna dan data organisasi ONE UNUSU.",
    clientId: "e18b6c47291a03df",
    envKey: "baksa-unusu/.env → ONE_UNUSU_API_KEY",
    endpointDiizinkan: [
      "/api/v2/website/users",
      "/api/v2/website/users/by-ids",
      "/api/v2/website/organisasi",
    ],
  },
  {
    name: "Direktori Pengguna — BAKSI UNUSU",
    description:
      "Token server-ke-server untuk pencarian direktori pengguna dan data organisasi ONE UNUSU.",
    clientId: "f29c7d58302b14ea",
    envKey: "baksi-unusu/.env → ONE_UNUSU_API_KEY",
    endpointDiizinkan: [
      "/api/v2/website/users",
      "/api/v2/website/users/by-ids",
      "/api/v2/website/organisasi",
    ],
  },
];

/** Membuat kunci baru dengan format yang sama seperti yang dipakai server. */
function buatKunciApi(): string {
  return `unusu_sec_${randomBytes(20).toString("hex")}`;
}

/**
 * Mengisi katalog endpoint lalu memastikan setiap aplikasi cabang punya kuncinya.
 *
 * Dijalankan setelah `seedSsoApps` karena kunci perlu `appId` yang sudah ada.
 */
export async function seedApiHub(prisma: PrismaClient): Promise<void> {
  // ---------- 1. Endpoint ----------
  const idPerAlamat = new Map<string, number>();

  for (const definisi of ENDPOINT_API_HUB) {
    const baris = await prisma.apiEndpoint.upsert({
      where: { endpoint: definisi.endpoint },
      update: {
        name: definisi.name,
        description: definisi.description,
        method: definisi.method,
        sourceApp: definisi.sourceApp,
        category: definisi.category,
        exampleRequest: definisi.exampleRequest,
        exampleResponse: definisi.exampleResponse,
        isPublic: definisi.isPublic,
        isActive: true,
      },
      create: {
        name: definisi.name,
        description: definisi.description,
        endpoint: definisi.endpoint,
        method: definisi.method,
        sourceApp: definisi.sourceApp,
        category: definisi.category,
        exampleRequest: definisi.exampleRequest,
        exampleResponse: definisi.exampleResponse,
        isPublic: definisi.isPublic,
        isActive: true,
      },
      select: { id: true },
    });

    idPerAlamat.set(definisi.endpoint, baris.id);
  }

  // ---------- 2. API key ----------
  const kunciBaru: { name: string; envKey: string; key: string }[] = [];
  let kunciDiperluas = 0;

  for (const definisi of KUNCI_API_HUB) {
    const aplikasi = await prisma.ssoApp.findUnique({
      where: { clientId: definisi.clientId },
      select: { id: true },
    });

    if (!aplikasi) {
      console.warn(
        `  ! Aplikasi dengan clientId ${definisi.clientId} belum ada; kunci "${definisi.name}" dilewati.`
      );
      continue;
    }

    const idDiizinkan = definisi.endpointDiizinkan
      .map((alamat) => idPerAlamat.get(alamat))
      .filter((id): id is number => typeof id === "number");

    const allowedEndpoints = JSON.stringify(idDiizinkan);

    const sudahAda = await prisma.apiKey.findFirst({
      where: { name: definisi.name },
      select: { id: true, allowedEndpoints: true },
    });

    if (sudahAda) {
      // Kunci yang sudah beredar tidak pernah diganti; hanya cakupan endpoint
      // yang diselaraskan agar endpoint baru langsung dapat dipakai.
      if (sudahAda.allowedEndpoints !== allowedEndpoints) {
        await prisma.apiKey.update({
          where: { id: sudahAda.id },
          data: { allowedEndpoints },
        });
        kunciDiperluas += 1;
      }
      continue;
    }

    const kunci = buatKunciApi();
    await prisma.apiKey.create({
      data: {
        key: kunci,
        name: definisi.name,
        description: definisi.description,
        appId: aplikasi.id,
        allowedEndpoints,
        isActive: true,
        revoked: false,
      },
    });

    kunciBaru.push({ name: definisi.name, envKey: definisi.envKey, key: kunci });
  }

  console.log(
    `  Katalog endpoint: ${ENDPOINT_API_HUB.length} entri tersedia. ` +
      `API key: ${kunciBaru.length} baru, ${kunciDiperluas} diperluas.`
  );

  if (kunciBaru.length > 0) {
    console.log("");
    console.log("  ============================================================");
    console.log("  API KEY BARU — salin ke .env aplikasi masing-masing.");
    console.log("  Nilai ini TIDAK akan ditampilkan lagi oleh seeder.");
    console.log("  ============================================================");
    for (const k of kunciBaru) {
      console.log(`  ${k.name}`);
      console.log(`    ${k.envKey}`);
      console.log(`    ${k.key}`);
    }
    console.log("  ============================================================");
    console.log("");
  }
}
