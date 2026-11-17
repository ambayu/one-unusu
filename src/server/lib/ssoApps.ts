import type { PrismaClient } from "@prisma/client";
import { BlockList, isIP } from "node:net";

/**
 * Registri aplikasi cabang SSO (tabel `sso_apps`).
 *
 * Satu-satunya definisi aplikasi cabang. Dipakai oleh `prisma/seed.ts` dan oleh
 * endpoint `POST /api/admin/apps/sync` di server, supaya keduanya tidak pernah
 * berbeda. Jangan menduplikasi daftar ini di tempat lain.
 *
 * `clientKey` dibaca dari `.env` dan sengaja tidak diberi nilai cadangan: kunci
 * server-to-server adalah rahasia, bukan konstanta yang boleh menempel di kode.
 * Aplikasi tanpa kunci tetap terdaftar di portal, tetapi login kepadanya akan
 * ditolak sampai kuncinya diisi di kedua sisi.
 */
export interface SsoAppDefinition {
  clientId: string;
  clientKey: string;
  nameApp: string;
  description: string;
  icon: string;
  badge: string;
  urlRedirect: string;
  targetRoles: string;
  order: number;
  isActive: boolean;
}

export interface SsoAppRegistryOptions {
  /** Basis URL portal, hanya untuk mendeteksi mode lokal bila mode belum diisi. */
  publicBaseUrl: string;
  /** Dipertahankan untuk kompatibilitas pemanggil; callback wajib memakai env. */
  prodiBaseUrl: string;
  /** Mode URL callback: "vps" (menggunakan sub-path/domain) atau "local" (menggunakan port dev lokal). */
  mode?: "vps" | "local";
}

const loopbackAddresses = new BlockList();
loopbackAddresses.addSubnet("127.0.0.0", 8, "ipv4");
loopbackAddresses.addAddress("::1", "ipv6");
loopbackAddresses.addAddress("0.0.0.0", "ipv4");
loopbackAddresses.addAddress("::", "ipv6");

function isLocalHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host === "localhost" || host.endsWith(".localhost") ||
    (isIP(host) !== 0 && loopbackAddresses.check(host, isIP(host) === 6 ? "ipv6" : "ipv4"));
}

/** Pemetaan URL callback untuk mode pengembangan lokal (port tiap aplikasi) */
export const LOCAL_DEV_CALLBACKS: Record<string, string> = {
  "50e3ed28134b379d": "http://localhost:5174/sso/callback", // LMS UNUSU (Port 5174)
  "014813db6bffb39f": "http://localhost:5177/sso/callback", // LPM UNUSU (Port 5177)
  "223ea0752e7619e2": "http://localhost:5176/sso/callback", // LPPM UNUSU (Port 5176)
  "e538eac90fb83578": "http://localhost:5175/sso/callback", // E-SURAT UNUSU (Port 5175)
  "38cf6306cea79458": "http://localhost:5178/sso/callback", // SARPRAS UNUSU (Port 5178)
  "a5776434492cb44a": "http://localhost:5179/sso/callback", // AKREDITASI UNUSU (Port 5179)
  "70c76ea9b5d5d3a8": "http://localhost:5180/sso/callback", // PRODI UNUSU (Port 5180)
  "e18b6c47291a03df": "http://localhost:5181/sso/callback", // BAKSA UNUSU (Port 5181)
  "f29c7d58302b14ea": "http://localhost:5182/sso/callback", // BAKSI UNUSU (Port 5182)
};

export function buildSsoAppDefinitions(
  env: NodeJS.ProcessEnv,
  { publicBaseUrl, mode }: SsoAppRegistryOptions
): SsoAppDefinition[] {
  const kunci = (nama: string) => (env[nama] ?? "").trim();
  if (env.SSO_ENV && !["local", "vps", "production"].includes(env.SSO_ENV)) {
    throw new Error("SSO_ENV harus local, vps, atau production.");
  }
  const production = env.NODE_ENV === "production" || env.SSO_ENV === "production";
  const selectedMode = mode ?? (env.SSO_ENV === "production" ? "vps" : env.SSO_ENV);
  const isLocalMode = selectedMode === "local" ||
    (!selectedMode && !production && isLocalHostname(new URL(publicBaseUrl).hostname));
  if (production && isLocalMode) {
    throw new Error("Mode SSO local tidak diizinkan di production.");
  }
  if (env.SSO_ENV === "vps" && isLocalMode) {
    throw new Error("Mode SSO local bertentangan dengan SSO_ENV=vps.");
  }

  const resolveCallback = (clientId: string, suffix: string): string => {
    const name = `SSO_CALLBACK_URL_${suffix}`;
    const value = kunci(name) || (isLocalMode ? LOCAL_DEV_CALLBACKS[clientId] : "");
    if (!value) throw new Error(`${name} wajib diisi untuk mode VPS/production.`);
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} harus berupa URL HTTP/HTTPS absolut.`);
    }
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error(`${name} harus berupa URL HTTP/HTTPS tanpa kredensial.`);
    }
    if (!isLocalMode && isLocalHostname(url.hostname)) {
      throw new Error(`${name} tidak boleh menunjuk loopback di VPS/production.`);
    }
    return value;
  };

  return [
    {
      clientId: "50e3ed28134b379d",
      clientKey: kunci("SSO_CLIENT_KEY_UNUSU_LMS"),
      nameApp: "LMS UNUSU",
      description: "Portal pembelajaran dosen & mahasiswa: kelas, materi, tugas, dan penilaian.",
      icon: "GraduationCap",
      badge: "Pembelajaran",
      urlRedirect: resolveCallback("50e3ed28134b379d", "UNUSU_LMS"),
      targetRoles: JSON.stringify(["ADMIN_LMS", "DOSEN", "MAHASISWA", "SUPERADMIN"]),
      order: 1,
      isActive: true,
    },
    {
      clientId: "223ea0752e7619e2",
      clientKey: kunci("SSO_CLIENT_KEY_LPPM_UNUSU"),
      nameApp: "LPPM UNUSU",
      description: "Portal Riset, Pengabdian Kepada Masyarakat, Publikasi Jurnal, dan Hibah Dosen.",
      icon: "FlaskConical",
      badge: "Penelitian",
      urlRedirect: resolveCallback("223ea0752e7619e2", "LPPM_UNUSU"),
      targetRoles: JSON.stringify(["ADMIN_LPPM", "DOSEN", "SUPERADMIN"]),
      order: 2,
      isActive: true,
    },
    {
      clientId: "014813db6bffb39f",
      clientKey: kunci("SSO_CLIENT_KEY_LPM_UNUSU"),
      nameApp: "LPM UNUSU",
      description: "Lembaga Penjaminan Mutu, Audit Mutu Internal (AMI), & Instrumen Akreditasi.",
      icon: "Award",
      badge: "Penjaminan Mutu",
      urlRedirect: resolveCallback("014813db6bffb39f", "LPM_UNUSU"),
      targetRoles: JSON.stringify(["ADMIN_LPM", "DOSEN", "SUPERADMIN"]),
      order: 3,
      isActive: true,
    },
    {
      clientId: "e538eac90fb83578",
      clientKey: kunci("SSO_CLIENT_KEY_ESURAT_UNUSU"),
      nameApp: "E-Surat UNUSU",
      description: "Tata Naskah Dinas, Disposisi Digital, & Surat Keterangan Mahasiswa/Dosen.",
      icon: "MailCheck",
      badge: "Administrasi",
      urlRedirect: resolveCallback("e538eac90fb83578", "ESURAT_UNUSU"),
      targetRoles: JSON.stringify(["ADMIN_ESURAT", "DOSEN", "MAHASISWA", "SUPERADMIN"]),
      order: 4,
      isActive: true,
    },
    {
      clientId: "38cf6306cea79458",
      clientKey: kunci("SSO_CLIENT_KEY_SDM_SARPRAS"),
      nameApp: "SDM & Sarpras",
      description: "Manajemen Kepegawaian, Fasilitas Kampus, & Inventaris Sarana Prasarana.",
      icon: "Building2",
      badge: "Kepegawaian",
      urlRedirect: resolveCallback("38cf6306cea79458", "SDM_SARPRAS"),
      targetRoles: JSON.stringify(["ADMIN_SARPRAS", "DOSEN", "SUPERADMIN"]),
      order: 5,
      isActive: true,
    },
    {
      clientId: "a5776434492cb44a",
      clientKey: kunci("SSO_CLIENT_KEY_UNUSU_AKREDITASI"),
      nameApp: "Akreditasi UNUSU",
      description: "Instrumen akreditasi, bukti dokumen, dan penilaian butir mutu program studi.",
      icon: "ClipboardCheck",
      badge: "Penjaminan Mutu",
      urlRedirect: resolveCallback("a5776434492cb44a", "UNUSU_AKREDITASI"),
      targetRoles: JSON.stringify(["ADMIN_AKREDITASI", "DOSEN", "SUPERADMIN"]),
      order: 6,
      isActive: true,
    },
    {
      clientId: "70c76ea9b5d5d3a8",
      clientKey: kunci("SSO_CLIENT_KEY_PRODI_UNUSU"),
      nameApp: "Portal Prodi UNUSU",
      description: "Portal program studi: profil, kurikulum, dosen, dan informasi akademik prodi.",
      icon: "AcademicCap",
      badge: "Akademik",
      urlRedirect: resolveCallback("70c76ea9b5d5d3a8", "PRODI_UNUSU"),
      targetRoles: JSON.stringify(["ADMIN_PRODI", "DOSEN", "SUPERADMIN"]),
      order: 7,
      isActive: true,
    },
    {
      clientId: "e18b6c47291a03df",
      clientKey: kunci("SSO_CLIENT_KEY_BAKSA_UNUSU") || "baksa_client_key_unusu_development_2026",
      nameApp: "BAKSA UNUSU",
      description: "Biro Administrasi Keuangan, Sarana & Aset: arsip naskah dinas, dokumen keuangan, dan inventaris.",
      icon: "Building2",
      badge: "Keuangan & Aset",
      urlRedirect: resolveCallback("e18b6c47291a03df", "BAKSA_UNUSU"),
      targetRoles: JSON.stringify(["ADMIN_BAKSA", "DOSEN", "SUPERADMIN"]),
      order: 8,
      isActive: true,
    },
    {
      clientId: "f29c7d58302b14ea",
      clientKey: kunci("SSO_CLIENT_KEY_BAKSI_UNUSU") || "baksi_client_key_unusu_development_2026",
      nameApp: "BAKSI UNUSU",
      description: "Biro Administrasi Kemahasiswaan & Sistem Informasi: arsip ormawa, beasiswa, dan kebijakan TI.",
      icon: "ComputerDesktop",
      badge: "Kemahasiswaan & SI",
      urlRedirect: resolveCallback("f29c7d58302b14ea", "BAKSI_UNUSU"),
      targetRoles: JSON.stringify(["ADMIN_BAKSI", "DOSEN", "MAHASISWA", "SUPERADMIN"]),
      order: 9,
      isActive: true,
    },
  ];
}

/**
 * Idempotent: aplikasi dicari berdasarkan `clientId`.
 *
 * `clientKey` hanya ditimpa bila nilai barunya tidak kosong. Tanpa penjagaan
 * ini, sinkronisasi dengan `.env` yang belum diisi akan menghapus kunci yang
 * sudah disetel lewat panel admin dan mematikan login aplikasi tersebut.
 * Pemetaan targetRoles yang sudah tersimpan hanya diubah melalui panel admin.
 */
export async function seedSsoApps(
  prisma: PrismaClient,
  apps: readonly SsoAppDefinition[]
): Promise<{ createdCount: number; updatedCount: number }> {
  let createdCount = 0;
  let updatedCount = 0;

  for (const app of apps) {
    const { clientKey, targetRoles: _targetRoles, ...metadata } = app;

    const existing = await prisma.ssoApp.findUnique({
      where: { clientId: app.clientId },
      select: { id: true },
    });

    if (existing) {
      await prisma.ssoApp.update({
        where: { clientId: app.clientId },
        data: {
          ...metadata,
          isActive: true,
          ...(clientKey ? { clientKey } : {}),
        },
      });
      updatedCount++;
      continue;
    }

    await prisma.ssoApp.create({ data: { ...app, isActive: true } });
    createdCount++;
  }

  return { createdCount, updatedCount };
}
