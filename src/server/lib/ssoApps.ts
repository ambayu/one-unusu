import { PrismaClient } from "@prisma/client";

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
  /** Basis URL portal; cabang berjalan sebagai sub-path di bawahnya. */
  publicBaseUrl: string;
  /** Basis URL Portal Prodi yang berjalan di domain sendiri, bukan sub-path. */
  prodiBaseUrl: string;
}

export function buildSsoAppDefinitions(
  env: NodeJS.ProcessEnv,
  { publicBaseUrl, prodiBaseUrl }: SsoAppRegistryOptions
): SsoAppDefinition[] {
  const cabang = publicBaseUrl.replace(/\/+$/, "");
  const prodi = prodiBaseUrl.replace(/\/+$/, "");
  const kunci = (nama: string) => (env[nama] ?? "").trim();

  return [
    {
      clientId: "unusu-lms",
      clientKey: kunci("SSO_CLIENT_KEY_UNUSU_LMS"),
      nameApp: "LMS UNUSU",
      description: "Portal pembelajaran dosen & mahasiswa: kelas, materi, tugas, dan penilaian.",
      icon: "GraduationCap",
      badge: "Pembelajaran",
      urlRedirect: `${cabang}/lms/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_LMS", "DOSEN", "MAHASISWA", "SUPERADMIN"]),
      order: 1,
      isActive: true,
    },
    {
      clientId: "lppm-unusu",
      clientKey: kunci("SSO_CLIENT_KEY_LPPM_UNUSU"),
      nameApp: "LPPM UNUSU",
      description: "Portal Riset, Pengabdian Kepada Masyarakat, Publikasi Jurnal, dan Hibah Dosen.",
      icon: "FlaskConical",
      badge: "Penelitian",
      urlRedirect: `${cabang}/lppm/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_LPPM", "DOSEN", "SUPERADMIN"]),
      order: 2,
      isActive: true,
    },
    {
      clientId: "lpm-unusu",
      clientKey: kunci("SSO_CLIENT_KEY_LPM_UNUSU"),
      nameApp: "LPM UNUSU",
      description: "Lembaga Penjaminan Mutu, Audit Mutu Internal (AMI), & Instrumen Akreditasi.",
      icon: "Award",
      badge: "Penjaminan Mutu",
      urlRedirect: `${cabang}/lpm/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_LPM", "DOSEN", "SUPERADMIN"]),
      order: 3,
      isActive: true,
    },
    {
      clientId: "esurat-unusu",
      clientKey: kunci("SSO_CLIENT_KEY_ESURAT_UNUSU"),
      nameApp: "E-Surat UNUSU",
      description: "Tata Naskah Dinas, Disposisi Digital, & Surat Keterangan Mahasiswa/Dosen.",
      icon: "MailCheck",
      badge: "Administrasi",
      urlRedirect: `${cabang}/esurat/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_ESURAT", "DOSEN", "MAHASISWA", "SUPERADMIN"]),
      order: 4,
      isActive: true,
    },
    {
      clientId: "sdm-sarpras-unusu",
      clientKey: kunci("SSO_CLIENT_KEY_SDM_SARPRAS"),
      nameApp: "SDM & Sarpras",
      description: "Manajemen Kepegawaian, Fasilitas Kampus, & Inventaris Sarana Prasarana.",
      icon: "Building2",
      badge: "Kepegawaian",
      urlRedirect: `${cabang}/sarpras/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_SARPRAS", "DOSEN", "SUPERADMIN"]),
      order: 5,
      isActive: true,
    },
    {
      clientId: "unusu-akreditasi",
      clientKey: kunci("SSO_CLIENT_KEY_UNUSU_AKREDITASI"),
      nameApp: "Akreditasi UNUSU",
      description: "Instrumen akreditasi, bukti dokumen, dan penilaian butir mutu program studi.",
      icon: "ClipboardCheck",
      badge: "Penjaminan Mutu",
      urlRedirect: `${cabang}/akreditasi/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_AKREDITASI", "DOSEN", "SUPERADMIN"]),
      order: 6,
      isActive: true,
    },
    {
      clientId: "prodi-unusu",
      clientKey: kunci("SSO_CLIENT_KEY_PRODI_UNUSU"),
      nameApp: "Portal Prodi UNUSU",
      description: "Portal program studi: profil, kurikulum, dosen, dan informasi akademik prodi.",
      icon: "AcademicCap",
      badge: "Akademik",
      // Portal Prodi adalah aplikasi multi-domain (satu tenant per hostname
      // seperti `tif.unusu.ac.id`), jadi alamatnya tidak dapat mengikuti
      // `publicBaseUrl` yang dipakai cabang lain.
      urlRedirect: `${prodi}/sso/callback`,
      targetRoles: JSON.stringify(["ADMIN_PRODI", "DOSEN", "SUPERADMIN"]),
      order: 7,
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
 */
export async function seedSsoApps(
  prisma: PrismaClient,
  apps: readonly SsoAppDefinition[]
): Promise<{ createdCount: number; updatedCount: number }> {
  let createdCount = 0;
  let updatedCount = 0;

  for (const app of apps) {
    const { clientKey, ...metadata } = app;

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
