import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, type Prisma } from "@prisma/client";
import { decideAppAccess, mapAppRole, parseAppRoles } from "./lib/appAccess.js";
import { validasiIdsPengguna } from "./lib/websiteUsers.js";
import { TINGKAT_MASUK, type TingkatMasuk } from "./lib/accessControl.js";
import {
  MAKS_UKURAN_BERKAS,
  MIME_PDF,
  PREFIX_URL_BERKAS,
  berkasBerisiPdf,
  direktoriBerkasDosen,
  hapusBerkasFisik,
  namaBerkasDariUrl,
  pastikanDirektoriBerkas,
  unggahBerkasPdf,
} from "./lib/dosenBerkas.js";
import {
  MAKS_UKURAN_GAMBAR_SLIDER,
  PREFIX_MEDIA_SLIDER,
  hapusMediaSliderFisik,
  namaBerkasMediaDariUrl,
  pastikanDirektoriMediaSlider,
  periksaUkuranMediaSlider,
  unggahMediaSlider,
  urlMediaSlider,
} from "./lib/sliderMedia.js";
import { buildSsoAppDefinitions, seedSsoApps } from "./lib/ssoApps.js";
import {
  authenticateExternalSystem,
  scrapeMahasiswaProfile,
  scrapeAllDosenFromSia,
  scrapeDosenDetailFromSia,
  scrapeMahasiswaFromSia,
  SIAKAD_PRODI_LIST,
  SiakadLecturerProfile,
} from "./lib/siakadService.js";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET belum diset di environment. Server dihentikan demi keamanan.");
  process.exit(1);
}
if (JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET terlalu pendek (minimal 32 karakter). Server dihentikan demi keamanan.");
  process.exit(1);
}

/**
 * Sesi portal disimpan pada cookie HttpOnly supaya token tidak dapat dibaca
 * JavaScript browser. Path dibatasi ke prefix aplikasi agar cookie tidak ikut
 * terkirim ke aplikasi cabang lain yang berbagi domain.
 */
const AUTH_COOKIE_NAME = "one_unusu_token";
const AUTH_COOKIE_PATH = process.env.AUTH_COOKIE_PATH || "/";
const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || undefined;
const AUTH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.AUTH_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: AUTH_COOKIE_PATH,
  domain: AUTH_COOKIE_DOMAIN,
  maxAge: AUTH_TOKEN_TTL_MS,
};

// Di belakang reverse proxy (nginx), IP asli klien dibaca dari X-Forwarded-For
// supaya rate limiter bekerja per klien, bukan per proxy.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}
app.disable("x-powered-by");

/**
 * Normalisasi prefix `/sso` pada jalur API.
 *
 * Frontend produksi dibangun dengan `VITE_API_URL="/sso/api"`, karena aplikasi
 * ini dipasang di sub-path `/sso/` (lihat `PROD_BASE` pada vite.config.ts).
 * Seluruh router di berkas ini terdaftar pada `/api`, bukan `/sso/api`.
 *
 * Tanpa pemangkasan ini, permintaan browser `GET /sso/api/health` tidak cocok
 * dengan satu pun router, lalu jatuh ke fallback SPA dan klien menerima
 * `index.html` (HTTP 200 text/html) alih-alih JSON. Akibatnya seluruh halaman
 * portal gagal membaca data meski server tampak "sehat".
 *
 * Middleware diletakkan paling awal agar setiap penanganan berikutnya melihat
 * jalur yang sudah seragam, dan hanya menyentuh jalur `/sso/api` supaya aset
 * statis `/sso/assets/...` serta halaman `/sso/login` tidak terpengaruh.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url === "/sso/api" || req.url.startsWith("/sso/api/") || req.url.startsWith("/sso/api?")) {
    req.url = req.url.slice("/sso".length);
  }
  next();
});

// ==========================================
// KEAMANAN: HEADER, CORS, DAN BATAS PAYLOAD
// ==========================================

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Cloudflare Web Analytics menyuntikkan beacon.min.js ketika situs
        // di-proxy Cloudflare. Tanpa izin ini browser menolaknya dan menulis
        // galat CSP di console meski halaman tetap berjalan.
        scriptSrc: ["'self'", "https://static.cloudflareinsights.com"],
        // Google Fonts dipakai di index.html; gaya inline dibutuhkan Tailwind/React.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        // Ikon aplikasi disimpan sebagai data URL base64.
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        // Beacon analitik Cloudflare mengirim laporan ke domain ini.
        connectSrc: ["'self'", "https://cloudflareinsights.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cookieParser());

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Port frontend ekosistem UNUSU (5173 - 5185) serta domain resmi kampus
const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOrigins.includes(origin)) return true;

  // Izinkan seluruh port dev lokal untuk ekosistem UNUSU
  const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1):(517[0-9]|518[0-9]|500[0-9]|3000|5173)$/;
  if (localhostRegex.test(origin)) return true;

  // Izinkan domain & subdomain resmi unusu.ac.id
  const unusuDomainRegex = /^https?:\/\/([a-z0-9-]+\.)*unusu\.ac\.id$/i;
  if (unusuDomainRegex.test(origin)) return true;

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Request server-to-server (verify-token) tidak mengirim header Origin.
        callback(null, true);
        return;
      }
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin tidak diizinkan oleh kebijakan CORS."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600
  })
);

// Hanya route yang menerima gambar base64 yang boleh memakai limit besar.
// Route lain dibatasi ketat agar tidak bisa dipakai membanjiri memori server.
const UPLOAD_ROUTE_PATTERN = /^\/api\/(admin\/apps|admin\/directories|admin\/sliders|auth\/profile)(\/|$)/;
const smallJson = express.json({ limit: "1mb" });
const largeJson = express.json({ limit: "50mb" });
const smallUrlEncoded = express.urlencoded({ extended: true, limit: "1mb" });
const largeUrlEncoded = express.urlencoded({ extended: true, limit: "50mb" });

app.use((req: Request, res: Response, next: NextFunction) => {
  const parser = UPLOAD_ROUTE_PATTERN.test(req.path) ? largeJson : smallJson;
  parser(req, res, (err?: unknown) => {
    if (err) {
      const status = (err as { status?: number }).status === 413 ? 413 : 400;
      res.status(status).json({
        status: false,
        message: status === 413 ? "Ukuran permintaan melebihi batas yang diizinkan." : "Format body permintaan tidak valid."
      });
      return;
    }
    next();
  });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const parser = UPLOAD_ROUTE_PATTERN.test(req.path) ? largeUrlEncoded : smallUrlEncoded;
  parser(req, res, (err?: unknown) => {
    if (err) {
      res.status(400).json({ status: false, message: "Format body permintaan tidak valid." });
      return;
    }
    next();
  });
});

// ==========================================
// KEAMANAN: RATE LIMITING
// ==========================================

const rateLimitMessage = (message: string) => ({
  status: false,
  message
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitMessage("Terlalu banyak permintaan. Coba lagi sebentar.")
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: rateLimitMessage("Terlalu banyak percobaan login. Coba lagi dalam 15 menit.")
});

const serverToServerLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitMessage("Terlalu banyak permintaan verifikasi token. Coba lagi sebentar.")
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitMessage("Terlalu banyak operasi perubahan data. Coba lagi sebentar.")
});

app.use("/api", globalLimiter);

// Direktori penyimpanan berkas dosen dipastikan ada saat start, sehingga
// kegagalan konfigurasi penyimpanan muncul di log server, bukan saat dosen
// pertama kali mengunggah berkas.
try {
  pastikanDirektoriBerkas();
} catch (error) {
  logServerError("Inisialisasi direktori berkas dosen", error);
}

// Media slider hero (gambar & video) disajikan sebagai berkas statis publik.
try {
  pastikanDirektoriMediaSlider();
} catch (error) {
  logServerError("Inisialisasi direktori media slider", error);
}
app.use(
  PREFIX_MEDIA_SLIDER,
  express.static(path.resolve(process.env.SLIDER_MEDIA_DIR || path.resolve(process.cwd(), "public", "storage", "slider")), {
    maxAge: "7d",
  })
);

// Serve static frontend build files when in production
const clientDistPath = path.resolve(process.cwd(), "dist/client");
app.use(express.static(clientDistPath));
app.use("/sso", express.static(clientDistPath));

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: "ONE UNUSU Central SSO & Portal Gateway",
    time: new Date().toISOString()
  });
});

// ==========================================
// MIDDLEWARE AUTENTIKASI JWT (PORTAL SSO)
// ==========================================
interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    /** Kode peran utama, mis. "SUPERADMIN" (backward-compatible). */
    role: string;
    /** Seluruh kode peran yang dimiliki pengguna (multi-role). */
    roles?: string[];
    nama: string;
  };
}

/**
 * Validasi bentuk payload JWT agar token yang valid secara tanda tangan tetapi
 * berisi tipe data aneh tidak lolos ke query database.
 */
function isAuthPayload(decoded: unknown): decoded is AuthRequest["user"] {
  if (typeof decoded !== "object" || decoded === null) {
    return false;
  }
  const payload = decoded as Record<string, unknown>;
  return (
    typeof payload.id === "number" &&
    Number.isInteger(payload.id) &&
    payload.id > 0 &&
    typeof payload.username === "string" &&
    typeof payload.role === "string" &&
    typeof payload.nama === "string"
  );
}

/**
 * Ambil token sesi dari cookie HttpOnly. Header Authorization tetap diterima
 * sebagai jalur cadangan agar klien lama dan pengujian manual via curl masih
 * berjalan. Token di query string tetap ditolak karena mudah bocor lewat
 * access log, history browser, dan Referer.
 */
const readSessionToken = (req: Request): string | null => {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const headerToken = authHeader.slice(7).trim();
    if (headerToken) {
      return headerToken;
    }
  }

  return null;
};

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = readSessionToken(req);

  if (!token) {
    return res.status(401).json({ status: false, message: "Akses ditolak. Token tidak disediakan." });
  }

  jwt.verify(token, JWT_SECRET as string, { algorithms: ["HS256"] }, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ status: false, message: "Sesi login kedaluwarsa atau token tidak valid." });
    }
    if (!isAuthPayload(decoded)) {
      return res.status(403).json({ status: false, message: "Sesi login tidak valid." });
    }
    req.user = decoded;
    next();
  });
};

// ==========================================
// VALIDASI INPUT
// ==========================================

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{8,20}$/;
const MAX_IMAGE_LENGTH = 8 * 1024 * 1024; // ± 6 MB biner setelah decode base64

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Hanya izinkan tautan http/https agar tidak ada `javascript:` yang tereksekusi di klien. */
function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Menerima data URL gambar atau URL http/https saja. */
function normalizeImageSource(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const trimmed = value.trim();
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) {
    return trimmed.length > MAX_IMAGE_LENGTH ? null : trimmed;
  }
  return normalizeHttpUrl(trimmed);
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
}

// Hash dummy untuk menyamakan waktu respons saat akun tidak ditemukan.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);

/**
 * Kata sandi bawaan yang diberikan saat akun dosen/mahasiswa di-provision dari
 * SIAKAD. Nilainya sama untuk semua akun, sehingga tidak boleh dipakai terus
 * menerus: login yang mendeteksi kata sandi ini akan memaksa penggantian lewat
 * modal yang tidak dapat ditutup.
 *
 * Dapat ditimpa lewat `DEFAULT_PASSWORD` di environment agar instalasi lain
 * tidak memakai nilai yang sudah tertulis di repositori.
 */
const KATA_SANDI_BAWAAN = process.env.DEFAULT_PASSWORD?.trim() || "Unusu123!";

/** Log detail error hanya di server, tidak pernah dikirim ke klien. */
function logServerError(context: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[${new Date().toISOString()}] ${context}: ${detail}`);
}

/**
 * Menormalkan daftar peran target menjadi JSON array.
 *
 * Sejak peran dikelola Superadmin di database, daftar peran tidak lagi berupa
 * enum di kode. Validasi ke tabel `roles` dilakukan di pemanggil; di sini
 * cukup memastikan bentuknya array string yang wajar.
 */
function normalizeTargetRoles(value: unknown): string | null {
  let list: unknown = value;

  if (typeof value === "string") {
    try {
      list = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  const roles: string[] = [];
  for (const item of list) {
    if (typeof item !== "string" || !/^[A-Z][A-Z0-9_]{1,49}$/.test(item)) {
      return null;
    }
    roles.push(item);
  }

  return JSON.stringify(Array.from(new Set(roles)));
}

/** Ikon boleh berupa nama ikon (alfanumerik) atau gambar (data URL / http). */
function normalizeIconValue(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const trimmed = value.trim();
  const image = normalizeImageSource(trimmed);
  if (image) {
    return image;
  }
  return /^[A-Za-z0-9]{1,50}$/.test(trimmed) ? trimmed : null;
}

/**
 * Mengambil kumpulan key permission (format resource:action) milik pengguna
 * melalui seluruh peran yang tersimpan di tabel user_roles.
 */
async function getUserPermissionKeys(userId: number): Promise<string[]> {
  const rows = await prisma.rolePermission.findMany({
    where: { role: { userRoles: { some: { userId } } } },
    select: { permission: { select: { key: true } } }
  });

  return Array.from(new Set(rows.map((row) => row.permission.key)));
}

/**
 * Seluruh kode peran pengguna, dibaca dari tabel junction `user_roles`.
 */
async function getUserRoleCodes(userId: number): Promise<string[]> {
  const rows = await prisma.userRole.findMany({
    where: { userId },
    select: { role: { select: { code: true } } },
  });

  return rows.map((r) => r.role.code);
}

/**
 * Kode peran utama pengguna (prioritas SUPERADMIN jika ada, selain itu peran pertama).
 */
async function getUserRoleCode(userId: number): Promise<string | null> {
  const codes = await getUserRoleCodes(userId);
  if (codes.length === 0) return null;
  return codes.includes("SUPERADMIN") ? "SUPERADMIN" : codes[0];
}

/**
 * Boleh atau tidaknya pengguna melihat `clientKey` aplikasi SSO.
 */
async function bolehMelihatClientKey(req: AuthRequest): Promise<boolean> {
  const user = req.user;
  if (!user) return false;

  const roleCodes = user.roles ?? (user.role ? [user.role] : []);
  if (!roleCodes.includes("SUPERADMIN") && !roleCodes.includes("ADMIN_SSO")) return false;
  const keys = await getUserPermissionKeys(user.id);
  return keys.includes("application:edit");
}

// Tingkat masuk berikut hanya metadata kompatibilitas, bukan keputusan otorisasi.
function parseTargetRoles(targetRolesRaw: string | null | undefined): string[] {
  return parseAppRoles(targetRolesRaw) ?? [];
}

function tingkatDiterimaAplikasi(targetRoles: string[]): TingkatMasuk[] {
  const result: TingkatMasuk[] = [];
  if (targetRoles.some((r) => r.startsWith("ADMIN_") || r === "SUPERADMIN" || r === "ADMIN_SSO")) {
    result.push("admin");
  }
  if (targetRoles.includes("DOSEN")) {
    result.push("dosen");
  }
  if (targetRoles.includes("MAHASISWA")) {
    result.push("mahasiswa");
  }
  return result;
}

/**
 * Menyiapkan akses aplikasi baru.
async function siapkanIzinMasukAplikasi(
  _clientId: string,
  _nameApp: string,
  _tingkatDiminta: TingkatMasuk[]
): Promise<void> {
  // Kompatibilitas endpoint pendaftaran aplikasi cabang baru
}

/**
 * Middleware otorisasi yang lolos bila pengguna memiliki SALAH SATU dari
 * daftar key. Dipakai untuk endpoint bersama yang dipakai beberapa panel
 * (mis. statistik ringkas) tanpa memberi akses ke civitas biasa.
 */
const requireAnyPermission = (permissionKeys: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: false, message: "Akses ditolak. Sesi tidak dikenali." });
        return;
      }

      const ownKeys = await getUserPermissionKeys(req.user.id);
      if (!permissionKeys.some((key) => ownKeys.includes(key))) {
        res.status(403).json({
          status: false,
          message: "Akses ditolak. Anda tidak memiliki izin untuk panel administrasi."
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ status: false, message: "Gagal memverifikasi izin pengguna." });
    }
  };
};

/**
 * Key yang menandakan pengguna berhak membuka panel administrasi ONE UNUSU.
 * Peran aplikasi (ADMIN_LPM, ADMIN_LPPM, dst.) sengaja TIDAK memilikinya:
 * mereka hanya mengelola aplikasinya sendiri, bukan panel SSO.
 */
const ADMIN_PANEL_PERMISSION_KEYS = [
  "application:menu",
  "non_sso:menu",
  "slider:menu",
  "user:menu",
  "role:menu",
  "permission:menu"
] as const;

const APP_ACCESS_PERMISSION_KEYS = [
  "application:view",
  "non_sso:view",
  "slider:view",
  "user:view",
  "role:view",
  "permission:view"
] as const;

/**
 * Middleware otorisasi berbasis permission. Setiap endpoint dilindungi oleh
 * satu key eksplisit, bukan oleh nama role.
 */
const requirePermission = (permissionKey: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: false, message: "Akses ditolak. Sesi tidak dikenali." });
        return;
      }

      const permissionKeys = await getUserPermissionKeys(req.user.id);
      if (!permissionKeys.includes(permissionKey)) {
        res.status(403).json({
          status: false,
          message: `Akses ditolak. Anda tidak memiliki izin ${permissionKey}.`
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ status: false, message: "Gagal memverifikasi izin pengguna." });
    }
  };
};

// ==========================================
// SSO INITIATION & CALLBACK HANDLERS
// ==========================================

/**
 * GET /sso/login / GET /api/sso/login
 * Endpoint inisiasi login SSO ONE UNUSU.
 * Memastikan request diarahkan ke SSO login prompt dengan parameter mode 'login' (bukan register),
 * serta mendukung parameter redirect / return_to / next untuk diteruskan ke proses autentikasi.
 */
app.get(["/sso/login", "/api/sso/login"], (req: Request, res: Response) => {
  const returnUrl = req.query.return_to || req.query.redirect_to || req.query.redirect || req.query.next;
  const queryParams = new URLSearchParams();
  queryParams.set("mode", "login");

  if (typeof returnUrl === "string" && returnUrl.trim()) {
    queryParams.set("next", returnUrl.trim());
  }

  const target = `/login?${queryParams.toString()}`;
  return res.redirect(302, target);
});

/**
 * GET /sso/callback / GET /api/sso/callback
 * Handler callback setelah autentikasi SSO berhasil atau penukaran sesi eksternal.
 * Menetapkan / memvalidasi sesi HttpOnly cookie dan mengarahkan seluruh civitas
 * secara konsisten ke /dashboard civitas setelah autentikasi sukses.
 */
app.get(["/sso/callback", "/api/sso/callback"], async (req: Request, res: Response) => {
  try {
    const rawToken = req.query.token || req.query.code || req.query.auth_token;
    let sessionToken = typeof rawToken === "string" ? rawToken.trim() : null;
    let verifiedPayload: AuthRequest["user"] | null = null;

    // Jika token disediakan di query params callback, verifikasi token JWT
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET as string, { algorithms: ["HS256"] });
        if (isAuthPayload(decoded)) {
          verifiedPayload = decoded;
          // Tetapkan cookie HttpOnly untuk sesi pengguna
          res.cookie(AUTH_COOKIE_NAME, sessionToken, authCookieOptions);
        } else {
          return res.redirect(302, "/login?mode=login&error=invalid_token");
        }
      } catch (err) {
        logServerError("SSO Callback Token Invalid", err);
        return res.redirect(302, "/login?mode=login&error=token_expired");
      }
    } else {
      // Periksa apakah pengguna sudah memiliki cookie sesi aktif
      const existingToken = readSessionToken(req);
      if (!existingToken) {
        // Jika belum login atau sesi kosong, arahkan ke login prompt dengan mode login
        return res.redirect(302, "/login?mode=login&next=" + encodeURIComponent("/dashboard"));
      }
      try {
        const decoded = jwt.verify(existingToken, JWT_SECRET as string, { algorithms: ["HS256"] });
        if (isAuthPayload(decoded)) {
          verifiedPayload = decoded;
        } else {
          return res.redirect(302, "/login?mode=login&error=session_invalid");
        }
      } catch (err) {
        return res.redirect(302, "/login?mode=login&error=session_expired");
      }
    }

    // Periksa tujuan redirect: prioritaskan /dashboard civitas untuk seluruh civitas/role
    const requestedNext = typeof req.query.next === "string" && req.query.next.startsWith("/") && !req.query.next.startsWith("//")
      ? req.query.next
      : null;

    let nextDestination = "/dashboard";
    if (requestedNext && requestedNext !== "/login" && requestedNext !== "/register") {
      nextDestination = requestedNext;
    }

    return res.redirect(302, nextDestination);
  } catch (error: any) {
    logServerError("GET /sso/callback", error);
    return res.redirect(302, "/login?mode=login");
  }
});

// POST /api/auth/login
app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { identifier, password } = body;

    if (typeof identifier !== "string" || typeof password !== "string" || !identifier.trim() || !password) {
      return res.status(400).json({
        status: false,
        message: "NIM / NIDN / username dan password wajib diisi."
      });
    }

    if (identifier.length > 64 || password.length > 200) {
      return res.status(400).json({
        status: false,
        message: "NIM / NIDN atau password tidak valid."
      });
    }

    const trimmedIdentifier = identifier.trim();

    // 1. Cari berdasarkan username / NIM / NIDN di database lokal
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmedIdentifier },
          { nim: trimmedIdentifier },
          { nidn: trimmedIdentifier }
        ]
      },
      include: {
        roles: {
          include: {
            role: { select: { id: true, code: true, name: true } }
          }
        }
      }
    });

    // 2. JIT Provisioning: Jika akun belum ada di database lokal, autentikasi via sistem eksternal
    let isProvisionedFromExternal = false;
    if (!user) {
      const extAuth = await authenticateExternalSystem(trimmedIdentifier, password);
      if (extAuth.success) {
        // Otentikasi eksternal valid! Tentukan peran dan ambil biodata profil
        /*
         * Peran akun hasil provisioning dibatasi pada DOSEN dan MAHASISWA.
         *
         * Sebelumnya peran SIAKAD yang mengandung kata "ADMIN" dipetakan ke
         * ADMIN_SSO. Itu berbahaya: siapa pun yang bisa membuat akun bertanda
         * admin di SIAKAD langsung memperoleh peran administratif di portal,
         * dan peran itu menempel permanen karena pembuatan akun hanya terjadi
         * sekali. Peran administratif portal (SUPERADMIN, ADMIN_SSO) hanya
         * boleh diberikan lewat panel Manajemen Pengguna oleh Superadmin.
         */
        const peranSia = extAuth.role?.toUpperCase() || "";
        const roleCode = peranSia.includes("DOSEN")
          ? "DOSEN"
          : peranSia.includes("MAHASISWA")
          ? "MAHASISWA"
          : null;

        if (!roleCode) {
          return res.status(403).json({
            status: false,
            message:
              "Akun SIAKAD Anda tidak dikenali sebagai dosen atau mahasiswa. Hubungi Administrator PUSTIK UNUSU."
          });
        }

        const matchedRole = await prisma.role.findFirst({
          where: { code: roleCode },
        });

        if (matchedRole) {
          const hashedPassword = await bcrypt.hash(password, 10);
          let namaProfil = trimmedIdentifier;
          let prodiProfil: string | null = null;
          let fakultasProfil: string | null = null;
          let noHpProfil: string | null = null;
          let nikProfil: string | null = null;
          let jenisKelaminProfil: string | null = null;
          let tempatLahirProfil: string | null = null;
          let tanggalLahirProfil: string | null = null;
          let alamatProfil: string | null = null;
          let asalSekolahProfil: string | null = null;
          let namaIbuProfil: string | null = null;

          // Jika mahasiswa, coba sedot biodata lengkap langsung dari portal mahasiswa
          if (roleCode === "MAHASISWA") {
            const mhsData = await scrapeMahasiswaProfile(trimmedIdentifier, password);
            if (mhsData) {
              namaProfil = mhsData.nama;
              prodiProfil = mhsData.prodi || null;
              fakultasProfil = mhsData.fakultas || null;
              noHpProfil = mhsData.noHp || null;
              nikProfil = mhsData.nik || null;
              jenisKelaminProfil = mhsData.jenisKelamin || null;
              tempatLahirProfil = mhsData.tempatLahir || null;
              tanggalLahirProfil = mhsData.tanggalLahir || null;
              alamatProfil = mhsData.alamat || null;
              asalSekolahProfil = mhsData.asalSekolah || null;
              namaIbuProfil = mhsData.namaIbuKandung || null;
            }
          } else if (roleCode === "DOSEN") {
            // Jika dosen, cari data dosen dari SIAKAD menggunakan admin credentials
            const adminUser = process.env.SIAKAD_ADMIN_USER?.trim();
            const adminPass = process.env.SIAKAD_ADMIN_PASS;
            if (adminUser && adminPass) {
              try {
                const dosenList = await scrapeAllDosenFromSia(adminUser, adminPass);
                const matchedDosen = dosenList.find(
                  (d) => d.nidn === trimmedIdentifier || d.nidn === trimmedIdentifier.replace(/^0+/, "")
                );
                if (matchedDosen) {
                  namaProfil = matchedDosen.nama;
                  prodiProfil = matchedDosen.prodi || null;
                  fakultasProfil = matchedDosen.fakultas || null;
                  if (matchedDosen.kodeSia) {
                    const detailDosen = await scrapeDosenDetailFromSia(adminUser, adminPass, matchedDosen.kodeSia);
                    if (detailDosen) {
                      nikProfil = detailDosen.nik || null;
                      tempatLahirProfil = detailDosen.tempatLahir || null;
                      tanggalLahirProfil = detailDosen.tanggalLahir || null;
                      noHpProfil = detailDosen.noHp || null;
                      alamatProfil = detailDosen.alamat || null;
                      jenisKelaminProfil = detailDosen.jenisKelamin || null;
                    }
                  }
                }
              } catch (err) {
                logServerError("JIT Provisioning Dosen SIAKAD error", err);
              }
            }
          }

          // Buat akun baru di database lokal ONE UNUSU
          const createdUser = await prisma.user.create({
            data: {
              username: trimmedIdentifier,
              password: hashedPassword,
              nama: namaProfil,
              nim: roleCode === "MAHASISWA" ? trimmedIdentifier : null,
              nidn: roleCode === "DOSEN" ? trimmedIdentifier : null,
              prodi: prodiProfil,
              fakultas: fakultasProfil,
              noHp: noHpProfil,
              nik: nikProfil,
              jenisKelamin: jenisKelaminProfil,
              tempatLahir: tempatLahirProfil,
              tanggalLahir: tanggalLahirProfil,
              alamat: alamatProfil,
              asalSekolah: asalSekolahProfil,
              namaIbuKandung: namaIbuProfil,
              syncedAt: new Date(),
              isActive: true,
              roles: {
                create: {
                  roleId: matchedRole.id,
                },
              },
            },
            include: {
              roles: {
                include: {
                  role: { select: { id: true, code: true, name: true } },
                },
              },
            },
          });

          user = createdUser;
          isProvisionedFromExternal = true;
        }
      }
    }

    if (!user) {
      // Bandingkan dengan hash dummy supaya waktu respons akun tidak terdaftar
      // tidak berbeda jauh dari akun yang ada (mencegah enumerasi akun).
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH).catch(() => false);
      return res.status(401).json({
        status: false,
        message: "NIM / NIDN / username atau password salah."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: false,
        message: "Akun Anda dinonaktifkan. Silakan hubungi Administrator PUSTIK UNUSU."
      });
    }

    /*
     * Verifikasi kata sandi.
     *
     * Urutan: hash lokal lebih dulu (sumber kebenaran portal), lalu fallback ke
     * SIAKAD bila pengguna baru mengganti kata sandinya di sana.
     *
     * Jalur fallback SIAKAD SENGAJA TIDAK LAGI MENIMPA HASH LOKAL. Sebelumnya
     * setiap fallback yang berhasil langsung menulis ulang `user.password`
     * dengan kata sandi yang baru saja diketik. Akibatnya siapa pun yang tahu
     * NIDN seorang dosen � dan NIDN bukan rahasia � bisa masuk memakai kata
     * sandi lemah mana pun yang diterima SIAKAD, lalu kata sandi lemah itu
     * MENGGANTIKAN kata sandi portal secara permanen. Akun tersebut terbajak
     * tanpa sepengetahuan pemiliknya.
     *
     * Sekarang fallback hanya memberi akses satu sesi dan tidak mengubah kata
     * sandi lokal. Bila pengguna ingin menyamakan kata sandi portal dengan
     * SIAKAD, ia melakukannya sendiri lewat menu Keamanan.
     */
    if (!isProvisionedFromExternal) {
      const cocokLokal = await bcrypt.compare(password, user.password).catch(() => false);

      if (!cocokLokal) {
        /*
         * Kata sandi lokal tidak cocok. Sebelum menyerah, tentukan dulu apakah
         * akun ini memang MASIH boleh memakai kata sandi SIAKAD.
         *
         * Aturannya: begitu pengguna mengganti kata sandinya sendiri di portal
         * (`passwordDiubahAt` terisi), kata sandi portal menjadi SATU-SATUNYA
         * kunci yang sah. Tanpa aturan ini, `Unusu123!` yang masih berlaku di
         * SIAKAD tetap bisa dipakai masuk ke portal meski pengguna sudah
         * menggantinya � sehingga kewajiban ganti kata sandi menjadi sia-sia,
         * dan siapa pun yang tahu NIDN dosen tetap bisa masuk.
         *
         * Akun yang belum pernah mengganti kata sandi tetap memakai fallback
         * ini, sehingga dosen/mahasiswa yang baru mengubah kata sandi di SIAKAD
         * tidak terkunci di luar portal.
         */
        if (user.passwordDiubahAt) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH).catch(() => false);
          return res.status(401).json({
            status: false,
            message: "NIM / NIDN / username atau password salah."
          });
        }

        const extAuth = await authenticateExternalSystem(user.username, password);

        if (!extAuth.success) {
          return res.status(401).json({
            status: false,
            message: "NIM / NIDN / username atau password salah."
          });
        }

        /*
         * Kata sandi valid di SIAKAD tetapi berbeda dari kata sandi portal.
         * Peran yang dikembalikan SIAKAD harus sejalan dengan peran akun lokal;
         * bila SIAKAD mengaku sebagai peran berbeda (mis. admin), permintaan
         * ditolak. Tanpa pemeriksaan ini, kredensial eksternal dengan hak lebih
         * tinggi dapat dipakai untuk mengambil alih akun portal berperan apa
         * pun, karena peran sesi diambil dari akun lokal hasil pencarian.
         */
        const peranLokal = user.roles.map((ur) => ur.role.code.toUpperCase());
        const peranEksternal = (extAuth.role || "").toUpperCase();
        const sejalanDenganLokal =
          peranEksternal.length === 0 ||
          peranLokal.some((kode) => peranEksternal.includes(kode)) ||
          (peranLokal.includes("DOSEN") && peranEksternal.includes("DOSEN")) ||
          (peranLokal.includes("MAHASISWA") && peranEksternal.includes("MAHASISWA"));

        if (!sejalanDenganLokal) {
          return res.status(403).json({
            status: false,
            message:
              "Kata sandi SIAKAD Anda valid, tetapi peran akun SIAKAD tidak sesuai dengan akun portal ini. Hubungi Administrator PUSTIK UNUSU."
          });
        }

        // Catat aktivitas sinkronisasi tanpa menyentuh kata sandi pengguna.
        await prisma.user
          .update({
            where: { id: user.id },
            data: { syncedAt: new Date() },
          })
          .catch((err: unknown) => logServerError("Login fallback SIAKAD: gagal memperbarui syncedAt", err));
      }
    }

    // Ambil daftar seluruh peran yang dimiliki pengguna
    const roleList = user.roles.map((ur) => ur.role);
    const roleCodes = roleList.map((r) => r.code);

    if (roleCodes.length === 0) {
      return res.status(403).json({
        status: false,
        message: "Akun Anda belum ditautkan ke peran. Hubungi Administrator ONE UNUSU."
      });
    }

    // Role utama untuk kompatibilitas ke belakang
    const primaryRole = roleCodes.includes("SUPERADMIN") ? "SUPERADMIN" : roleCodes[0];

    // Jika pengguna login adalah DOSEN dan data kependudukannya masih belum lengkap,
    // picu pengayaan data (enrichment) di latar belakang agar saat masuk profil datanya sudah tersedia
    if (roleCodes.includes("DOSEN") && !user.nik) {
      const adminUser = process.env.SIAKAD_ADMIN_USER?.trim();
      const adminPass = process.env.SIAKAD_ADMIN_PASS;
      if (adminUser && adminPass) {
        scrapeAllDosenFromSia(adminUser, adminPass).then(async (dosenList) => {
          const matched = dosenList.find((d) => d.nidn === user.nidn || d.nidn === user.username);
          if (matched?.kodeSia) {
            const detail = await scrapeDosenDetailFromSia(adminUser, adminPass, matched.kodeSia);
            if (detail) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  nik: detail.nik || user.nik,
                  tempatLahir: detail.tempatLahir || user.tempatLahir,
                  tanggalLahir: detail.tanggalLahir || user.tanggalLahir,
                  jenisKelamin: detail.jenisKelamin || user.jenisKelamin,
                  noHp: detail.noHp || user.noHp,
                  alamat: detail.alamat || user.alamat,
                  syncedAt: new Date(),
                },
              });
            }
          }
        }).catch((err) => {
          logServerError("Login background enrichment dosen error", err);
        });
      }
    }

    // Generate JWT Session Token (Berlaku 1 hari)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: primaryRole,
        roles: roleCodes,
        nama: user.nama
      },
      JWT_SECRET as string,
      { algorithm: "HS256", expiresIn: "1d" }
    );

    const permissionKeys = await getUserPermissionKeys(user.id);

    /*
     * Akun hasil provisioning SIAKAD memakai kata sandi bawaan yang sama untuk
     * semua orang. Selama pengguna belum menggantinya, portal wajib
     * menampilkan modal ganti kata sandi yang tidak bisa ditutup.
     *
     * Status dihitung ulang setiap login (bukan hanya membaca kolom database)
     * dengan membandingkan hash tersimpan terhadap kata sandi bawaan. Dengan
     * begitu akun lama yang belum sempat ditandai tetap terlindungi, dan akun
     * yang sudah mengganti kata sandi tidak pernah diminta lagi.
     */
    const masihKataSandiBawaan = await bcrypt
      .compare(KATA_SANDI_BAWAAN, user.password)
      .catch(() => false);
    const harusGantiPassword = user.harusGantiPassword || masihKataSandiBawaan;

    // Sesi utama dititipkan pada cookie HttpOnly. Token tetap disertakan di body
    // hanya untuk kompatibilitas klien lama; frontend tidak lagi menyimpannya.
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);

    res.json({
      status: true,
      message: "Login berhasil. Selamat datang di ONE UNUSU.",
      token,
      data: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        email: user.email,
        role: primaryRole,
        roles: roleList,
        nim: user.nim,
        nidn: user.nidn,
        fakultas: user.fakultas,
        prodi: user.prodi,
        avatar: user.avatar,
        harusGantiPassword,
        permissions: permissionKeys
      }
    });
  } catch (error: any) {
    logServerError("POST /api/auth/login", error);
    res.status(500).json({ status: false, message: "Terjadi kesalahan server saat login." });
  }
});

// POST /api/auth/logout (Akhiri sesi portal)
app.post("/api/auth/logout", (req: Request, res: Response) => {
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions;
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
  res.json({ status: true, message: "Sesi berhasil diakhiri." });
});

// GET /api/sso/session-check
// Pengecekan status sesi ONE UNUSU untuk aplikasi cabang (LMS, E-Surat, LPM, LPPM, Sarpras, dll.)
// Mengembalikan { authenticated: true, user } bila sesi SSO aktif, atau { authenticated: false } bila sudah logout.
app.get("/api/sso/session-check", async (req: Request, res: Response) => {
  const token = readSessionToken(req);
  if (!token) {
    return res.json({
      status: true,
      authenticated: false,
      message: "Tidak ada sesi aktif di ONE UNUSU."
    });
  }

  jwt.verify(token, JWT_SECRET as string, { algorithms: ["HS256"] }, async (err: any, decoded: any) => {
    if (err || !decoded?.id) {
      return res.json({
        status: true,
        authenticated: false,
        message: "Sesi login ONE UNUSU telah kedaluwarsa atau tidak valid."
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          nama: true,
          email: true,
          roles: {
            select: {
              role: { select: { code: true } }
            }
          },
          nim: true,
          nidn: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return res.json({
          status: true,
          authenticated: false,
          message: "Akun tidak ditemukan atau tidak aktif."
        });
      }

      const roleCodes = user.roles.map((r) => r.role.code);
      return res.json({
        status: true,
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          nama: user.nama,
          email: user.email,
          role: roleCodes[0] || "MAHASISWA",
          roles: roleCodes,
          nim: user.nim,
          nidn: user.nidn
        }
      });
    } catch {
      return res.json({
        status: true,
        authenticated: false,
        message: "Gagal memeriksa sesi pengguna."
      });
    }
  });
});

// GET /api/auth/me (Ambil profil sesi yang sedang login)
app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        noHp: true,
        roles: {
          select: {
            role: { select: { id: true, code: true, name: true } }
          }
        },
        nim: true,
        nidn: true,
        fakultas: true,
        prodi: true,
        avatar: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        nik: true,
        angkatan: true,
        statusAkademik: true,
        alamat: true,
        asalSekolah: true,
        namaIbuKandung: true,
        gelarDepan: true,
        gelarBelakang: true,
        nip: true,
        jabatanAkademik: true,
        bidangKeahlian: true,
        pendidikanTerakhir: true,
        sintaId: true,
        linkSinta: true,
        googleScholar: true,
        orcid: true,
        scopusId: true,
        biografi: true,
        syncedAt: true,
        isActive: true,
        harusGantiPassword: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ status: false, message: "Data pengguna tidak ditemukan." });
    }

    // Auto-enrichment biodata dosen dari SIAKAD jika user adalah dosen dan NIK masih kosong
    const isDosenRole = user.roles.some(ur => ur.role.code === "DOSEN");
    if (isDosenRole && !user.nik && (user.nidn || user.username)) {
      const adminUser = process.env.SIAKAD_ADMIN_USER;
      const adminPass = process.env.SIAKAD_ADMIN_PASS;
      if (adminUser && adminPass) {
        // Cari kodeSia dosen ini dari SIAKAD
        scrapeAllDosenFromSia(adminUser, adminPass).then(async (dosenList) => {
          const matched = dosenList.find(d => d.nidn === (user.nidn || user.username) || d.nidn === user.username);
          if (matched && matched.kodeSia) {
            const detail = await scrapeDosenDetailFromSia(adminUser, adminPass, matched.kodeSia);
            if (detail) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  nik: detail.nik || user.nik,
                  tempatLahir: detail.tempatLahir || user.tempatLahir,
                  tanggalLahir: detail.tanggalLahir || user.tanggalLahir,
                  jenisKelamin: detail.jenisKelamin || user.jenisKelamin,
                  noHp: detail.noHp || user.noHp,
                  alamat: detail.alamat || user.alamat,
                  syncedAt: new Date(),
                },
              });
            }
          }
        }).catch((err) => {
          logServerError("Enrichment Dosen SIAKAD background job", err);
        });
      }
    }

    const permissionKeys = await getUserPermissionKeys(user.id);
    const roleList = user.roles.map((ur) => ur.role);
    const roleCodes = roleList.map((r) => r.code);
    const primaryRole = roleCodes.includes("SUPERADMIN") ? "SUPERADMIN" : (roleCodes[0] ?? null);

    const { roles, ...profil } = user;

    /*
     * Status "masih memakai kata sandi bawaan" dihitung ULANG di sini, bukan
     * hanya dibaca dari kolom database.
     *
     * Kolom `harusGantiPassword` bernilai false pada akun-akun lama yang dibuat
     * sebelum kolom ini ada, padahal kata sandinya masih kata sandi bawaan.
     * Endpoint login sudah menghitungnya dengan membandingkan hash, tetapi
     * endpoint ini dulu mengirim nilai mentah kolom. Akibatnya: modal wajib
     * ganti kata sandi sempat muncul setelah login, lalu HILANG begitu panel
     * memuat ulang profil lewat endpoint ini. Sekarang kedua endpoint memakai
     * aturan yang sama, sehingga modal tidak bisa hilang sendiri.
     */
    const hashKataSandi = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });
    const masihKataSandiBawaan = hashKataSandi?.password
      ? await bcrypt.compare(KATA_SANDI_BAWAAN, hashKataSandi.password).catch(() => false)
      : false;
    const harusGantiPassword = user.harusGantiPassword || masihKataSandiBawaan;

    res.json({
      status: true,
      data: {
        ...profil,
        harusGantiPassword,
        role: primaryRole,
        roles: roleList,
        permissions: permissionKeys,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal mengambil data profil pengguna." });
  }
});

// POST /api/auth/sync-siakad (Tarik dan perbarui data profil sendiri dari SIAKAD on-demand)
app.post("/api/auth/sync-siakad", authenticateToken, writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }

    const adminUser = process.env.SIAKAD_ADMIN_USER?.trim();
    const adminPass = process.env.SIAKAD_ADMIN_PASS;

    if (!adminUser || !adminPass) {
      return res.status(503).json({
        status: false,
        message: "Kredensial SIAKAD belum dikonfigurasi pada server.",
      });
    }

    const isDosen = user.roles.some((r) => r.role.code === "DOSEN");
    const isMahasiswa = user.roles.some((r) => r.role.code === "MAHASISWA");

    if (isDosen) {
      const nidn = user.nidn || user.username;
      const dosenList = await scrapeAllDosenFromSia(adminUser, adminPass);
      const matched = dosenList.find((d) => d.nidn === nidn || d.nidn === user.username);

      if (!matched) {
        return res.status(404).json({
          status: false,
          message: `Data dosen dengan NIDN/Username ${nidn} tidak ditemukan di sistem SIAKAD.`,
        });
      }

      let detail: Partial<SiakadLecturerProfile> | null = null;
      if (matched.kodeSia) {
        detail = await scrapeDosenDetailFromSia(adminUser, adminPass, matched.kodeSia);
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          nama: matched.nama || user.nama,
          nidn: matched.nidn || user.nidn,
          prodi: matched.prodi || user.prodi,
          fakultas: matched.fakultas || user.fakultas,
          nik: detail?.nik || user.nik,
          tempatLahir: detail?.tempatLahir || user.tempatLahir,
          tanggalLahir: detail?.tanggalLahir || user.tanggalLahir,
          jenisKelamin: detail?.jenisKelamin || user.jenisKelamin,
          noHp: detail?.noHp || user.noHp,
          alamat: detail?.alamat || user.alamat,
          syncedAt: new Date(),
        },
      });

      return res.json({
        status: true,
        message: "Data profil dosen berhasil ditarik dan diperbarui dari SIAKAD.",
        data: updatedUser,
      });
    }

    if (isMahasiswa) {
      const nim = user.nim || user.username;
      const students = await scrapeMahasiswaFromSia(adminUser, adminPass, {
        angkatan: user.angkatan || undefined,
      });
      const matched = students.find((s) => s.nim === nim || s.nim === user.username);

      if (!matched) {
        return res.status(404).json({
          status: false,
          message: `Data mahasiswa dengan NIM ${nim} tidak ditemukan di sistem SIAKAD.`,
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          nama: matched.nama || user.nama,
          nim: matched.nim || user.nim,
          prodi: matched.prodi || user.prodi,
          fakultas: matched.fakultas || user.fakultas,
          angkatan: matched.angkatan || user.angkatan,
          jenisKelamin: matched.jenisKelamin || user.jenisKelamin,
          avatar: matched.fotoUrl || user.avatar,
          syncedAt: new Date(),
        },
      });

      return res.json({
        status: true,
        message: "Data profil mahasiswa berhasil ditarik dan diperbarui dari SIAKAD.",
        data: updatedUser,
      });
    }

    return res.status(400).json({
      status: false,
      message: "Sinkronisasi SIAKAD mandiri saat ini hanya tersedia untuk peran Dosen dan Mahasiswa.",
    });
  } catch (error: any) {
    logServerError("POST /api/auth/sync-siakad", error);
    return res.status(500).json({
      status: false,
      message: error?.message || "Gagal menyinkronkan data profil dari SIAKAD.",
    });
  }
});

// GET /api/auth/panel-access
// Sumber tunggal keputusan navigasi pasca-login:
//  - panel: 'admin' bila pengguna punya izin panel SSO, selain itu 'dashboard'
//  - apps : katalog aplikasi cabang + isAllowed (dihitung dari izin masuk)
// Dipakai route guard & halaman 403 di klien, sehingga pemisahan admin
// per aplikasi (mis. ADMIN_LPPM tidak boleh masuk panel/aplikasi LPM) berlaku
// konsisten di UI dan API.
app.get("/api/auth/panel-access", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        isActive: true,
        roles: { select: { role: { select: { id: true, code: true, name: true } } } }
      }
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ status: false, message: "Akun tidak aktif atau tidak ditemukan." });
    }

    const permissionKeys = await getUserPermissionKeys(user.id);
    const canOpenAdminPanel = ADMIN_PANEL_PERMISSION_KEYS.some((key) => permissionKeys.includes(key));
    const roleList = user.roles.map((ur) => ur.role);
    const roleCodes = roleList.map((r) => r.code);
    const primaryRole = roleCodes.includes("SUPERADMIN") ? "SUPERADMIN" : (roleCodes[0] ?? null);

    const apps = await prisma.ssoApp.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, clientId: true, nameApp: true, targetRoles: true }
    });

    const appAccess = apps.map((app) => {
      const decision = decideAppAccess(permissionKeys, app.targetRoles, roleCodes);
      return {
        clientId: app.clientId,
        nameApp: app.nameApp,
        isAllowed: decision.allowed,
        tingkat: decision.tingkat,
      };
    });

    res.json({
      status: true,
      data: {
        role: primaryRole,
        roles: roleList,
        permissions: permissionKeys,
        panel: canOpenAdminPanel ? "admin" : "dashboard",
        canOpenAdminPanel,
        apps: appAccess
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat hak akses navigasi." });
  }
});

// PUT /api/auth/profile (Update profil pribadi)
app.put("/api/auth/profile", authenticateToken, writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const {
      email,
      noHp,
      avatar,
      currentPassword,
      newPassword,
      // Field Tambahan Biodata Mandiri
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      alamat,
      gelarDepan,
      gelarBelakang,
      nip,
      jabatanAkademik,
      bidangKeahlian,
      pendidikanTerakhir,
      sintaId,
      linkSinta,
      googleScholar,
      orcid,
      scopusId,
      biografi,
    } = body;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }

    const updateData: {
      email?: string | null;
      noHp?: string | null;
      avatar?: string | null;
      password?: string;
      jenisKelamin?: string | null;
      tempatLahir?: string | null;
      tanggalLahir?: string | null;
      alamat?: string | null;
      gelarDepan?: string | null;
      gelarBelakang?: string | null;
      nip?: string | null;
      jabatanAkademik?: string | null;
      bidangKeahlian?: string | null;
      pendidikanTerakhir?: string | null;
      sintaId?: string | null;
      linkSinta?: string | null;
      googleScholar?: string | null;
      orcid?: string | null;
      scopusId?: string | null;
      biografi?: string | null;
      /*
       * Penanda kewajiban ganti kata sandi. Diisi ketika pengguna mengganti
       * kata sandinya sendiri lewat menu Keamanan: kewajiban dianggap selesai
       * dan waktunya dicatat. Tanpa kedua kolom ini di tipe, penulisan ke
       * database ditolak pemeriksa tipe.
       */
      harusGantiPassword?: boolean;
      passwordDiubahAt?: Date | null;
    } = {};

    // Helper untuk string opsional
    const setOptStr = (key: keyof typeof updateData, val: any, maxLen = 255) => {
      if (val !== undefined) {
        if (val === null || val === "") {
          (updateData as any)[key] = null;
        } else if (typeof val === "string") {
          (updateData as any)[key] = val.trim().slice(0, maxLen);
        }
      }
    };

    setOptStr("tempatLahir", tempatLahir, 100);
    setOptStr("tanggalLahir", tanggalLahir, 30);
    setOptStr("alamat", alamat, 1000);
    setOptStr("gelarDepan", gelarDepan, 50);
    setOptStr("gelarBelakang", gelarBelakang, 50);
    setOptStr("nip", nip, 50);
    setOptStr("jabatanAkademik", jabatanAkademik, 100);
    setOptStr("bidangKeahlian", bidangKeahlian, 255);
    setOptStr("pendidikanTerakhir", pendidikanTerakhir, 50);
    setOptStr("sintaId", sintaId, 50);
    setOptStr("linkSinta", linkSinta, 255);
    setOptStr("googleScholar", googleScholar, 255);
    setOptStr("orcid", orcid, 50);
    setOptStr("scopusId", scopusId, 50);
    setOptStr("biografi", biografi, 5000);

    // ---------------------------------------------------------------
    // Jenis kelamin � boleh diisi sendiri pemilik akun.
    //
    // Kolom ini sebelumnya hanya bisa diubah admin. Nilainya dibatasi
    // `L`/`P` mengikuti satu-satunya bentuk yang dipakai seluruh aplikasi
    // (badge, biodata, dan formulir admin). String kosong mengosongkan
    // kolom, bukan menyimpan teks kosong.
    // ---------------------------------------------------------------
    if (jenisKelamin !== undefined) {
      if (jenisKelamin === null || jenisKelamin === "") {
        updateData.jenisKelamin = null;
      } else if (typeof jenisKelamin !== "string" || !["L", "P"].includes(jenisKelamin.trim())) {
        return res.status(400).json({
          status: false,
          message: "Jenis kelamin harus L (laki-laki) atau P (perempuan).",
        });
      } else {
        updateData.jenisKelamin = jenisKelamin.trim();
      }
    }

    if (email !== undefined) {
      if (email === null || email === "") {
        updateData.email = null;
      } else if (typeof email !== "string" || email.length > 120 || !EMAIL_PATTERN.test(email.trim())) {
        return res.status(400).json({ status: false, message: "Format email tidak valid." });
      } else {
        const trimmedEmail = email.trim();

        // Kolom `users.email` ber-UNIQUE. Tanpa pemeriksaan ini, mengetik email
        // milik akun lain lolos validasi format lalu gagal di `prisma.user.update`
        // dengan kode P2002, sehingga tertangkap `catch` dan dilaporkan sebagai
        // "Gagal memperbarui profil." dengan HTTP 500 - padahal tidak ada yang
        // rusak di server, hanya emailnya sudah dipakai.
        //
        // Perbandingan sengaja tidak memakai `mode: "insensitive"`: opsi itu
        // tidak tersedia untuk provider MySQL (tidak ada di tipe
        // `StringNullableFilter`), sehingga hanya akan gagal saat dijalankan.
        // Yang dipakai adalah pemeriksaan huruf kecil di memori, yang berlaku
        // sama untuk semua provider dan tidak bergantung pada collation
        // database.
        const pemakaiEmail = await prisma.user.findMany({
          where: { NOT: { id: userId }, email: { not: null } },
          select: { email: true }
        });
        const emailDipakai = pemakaiEmail.some(
          (baris) => (baris.email ?? "").toLowerCase() === trimmedEmail.toLowerCase()
        );
        if (emailDipakai) {
          return res.status(409).json({
            status: false,
            message: "Email sudah digunakan oleh akun lain. Gunakan alamat email yang berbeda."
          });
        }

        updateData.email = trimmedEmail;
      }
    }

    if (noHp !== undefined) {
      if (noHp === null || noHp === "") {
        updateData.noHp = null;
      } else if (typeof noHp !== "string" || !PHONE_PATTERN.test(noHp.trim())) {
        return res.status(400).json({ status: false, message: "Format nomor WhatsApp tidak valid." });
      } else {
        updateData.noHp = noHp.trim();
      }
    }

    if (avatar !== undefined) {
      if (avatar === null || avatar === "") {
        updateData.avatar = null;
      } else {
        const normalizedAvatar = normalizeImageSource(avatar);
        if (!normalizedAvatar) {
          return res.status(400).json({ status: false, message: "Foto profil harus berupa gambar yang valid." });
        }
        updateData.avatar = normalizedAvatar;
      }
    }

    // Jika ingin mengganti password
    if (newPassword !== undefined && newPassword !== null && newPassword !== "") {
      if (typeof newPassword !== "string" || typeof currentPassword !== "string" || !currentPassword) {
        return res.status(400).json({ status: false, message: "Password saat ini wajib diisi untuk mengganti password." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ status: false, message: "Password saat ini tidak cocok." });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ status: false, message: "Password baru minimal 8 karakter." });
      }
      if (newPassword === currentPassword) {
        return res.status(400).json({
          status: false,
          message: "Password baru tidak boleh sama dengan password saat ini.",
        });
      }
      if (newPassword === KATA_SANDI_BAWAAN) {
        return res.status(400).json({
          status: false,
          message: "Password bawaan tidak boleh dipakai. Pilih password lain yang hanya Anda ketahui.",
        });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
      // Kata sandi sudah diganti sendiri oleh pengguna: kewajiban ganti selesai.
      updateData.harusGantiPassword = false;
      updateData.passwordDiubahAt = new Date();
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        noHp: true,
        roles: { select: { role: { select: { id: true, code: true, name: true } } } },
        nim: true,
        nidn: true,
        fakultas: true,
        prodi: true,
        avatar: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        nik: true,
        angkatan: true,
        statusAkademik: true,
        alamat: true,
        asalSekolah: true,
        namaIbuKandung: true,
        gelarDepan: true,
        gelarBelakang: true,
        nip: true,
        jabatanAkademik: true,
        bidangKeahlian: true,
        pendidikanTerakhir: true,
        sintaId: true,
        linkSinta: true,
        googleScholar: true,
        orcid: true,
        scopusId: true,
        biografi: true,
        syncedAt: true,
      }
    });

    res.json({
      status: true,
      message: "Profil berhasil diperbarui.",
      data: {
        ...updatedUser,
        roles: updatedUser.roles.map((ur) => ur.role),
        role: updatedUser.roles.map((ur) => ur.role.code).join(", ")
      }
    });
  } catch (error: any) {
    // Jaring pengaman balapan: dua permintaan bisa lolos pemeriksaan duplikat
    // di atas pada saat yang hampir sama, lalu salah satunya ditolak UNIQUE
    // constraint (P2002). Itu bukan kegagalan server, jadi jangan dilaporkan
    // sebagai 500 - pesannya harus tetap menyebut sebab yang sebenarnya.
    if (error?.code === "P2002") {
      const target = Array.isArray(error?.meta?.target)
        ? error.meta.target.join(", ")
        : String(error?.meta?.target ?? "");
      if (target.includes("email")) {
        return res.status(409).json({
          status: false,
          message: "Email sudah digunakan oleh akun lain. Gunakan alamat email yang berbeda."
        });
      }
      return res.status(409).json({
        status: false,
        message: "Data tersebut sudah dipakai akun lain."
      });
    }

    logServerError("PUT /api/auth/profile", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui profil." });
  }
});

// ==========================================
// 2. SSO TOKEN V2 ENGINE (SEPERTI SSO MEDAN)
// ==========================================

// GET /api/sso/apps (Ambil daftar aplikasi terintegrasi sesuai izin user)
app.get("/api/sso/apps", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Status akun dan izin dibaca ulang dari database supaya perubahan izin
    // langsung berlaku walau token lama masih aktif.
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, isActive: true }
    });

    if (!currentUser || !currentUser.isActive) {
      return res.status(403).json({ status: false, message: "Akun tidak aktif atau tidak ditemukan." });
    }

    const permissionKeys = await getUserPermissionKeys(currentUser.id);

    const apps = await prisma.ssoApp.findMany({
      where: { isActive: true },
      // Yang paling sering dibuka tampil lebih dulu agar pengguna tidak perlu
      // mencari. `order` tetap jadi penentu kedua supaya urutan stabil ketika
      // hitCount masih sama (instalasi baru: semua bernilai 0).
      orderBy: [{ hitCount: "desc" }, { order: "asc" }],
      // clientKey adalah kredensial server-to-server, tidak boleh bocor ke klien.
      select: {
        id: true,
        clientId: true,
        nameApp: true,
        description: true,
        icon: true,
        badge: true,
        urlRedirect: true,
        isActive: true,
        order: true,
        hitCount: true,
        targetRoles: true,
      }
    });

    const userRoleCodes = await getUserRoleCodes(currentUser.id);

    // Penentuan aplikasi yang tampil kini murni dari peran kampus + targetRoles
    // aplikasi. Izin `masuk_*` sudah dihapus, jadi filter "mahasiswa murni"
    // dinyatakan lewat peran MAHASISWA itu sendiri.
    const isMahasiswaOnly =
      userRoleCodes.includes("MAHASISWA") &&
      !userRoleCodes.some((r) => r === "DOSEN" || r.startsWith("ADMIN_") || r === "SUPERADMIN");

    // Status izin dihitung per pengguna dari peran yang dicocokkan dengan targetRoles
    const appsWithAccess = apps.map((app) => {
      const decision = decideAppAccess(permissionKeys, app.targetRoles, userRoleCodes);
      return {
        ...app,
        targetRoles: app.targetRoles || "",
        tingkatMasuk: decision.tingkat,
        isAllowed: decision.allowed
      };
    });

    const visibleApps = isMahasiswaOnly
      ? appsWithAccess.filter((app) => {
          const roles = parseTargetRoles(app.targetRoles);
          const tingkat = tingkatDiterimaAplikasi(roles);
          return tingkat.includes("mahasiswa") && app.isAllowed;
        })
      : appsWithAccess;

    res.json({ status: true, data: visibleApps });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat katalog aplikasi SSO." });
  }
});

// GET /api/sso/history (Riwayat aktivitas masuk / penukaran tiket SSO pengguna)
app.get("/api/sso/history", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const history = await prisma.ssoAuthToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        clientId: true,
        createdAt: true,
        expiresAt: true,
        isUsed: true,
        usedAt: true,
        requestIp: true,
        app: {
          select: {
            nameApp: true,
            icon: true,
            badge: true,
          }
        }
      }
    });

    res.json({
      status: true,
      data: history.map((item) => ({
        id: item.id,
        clientId: item.clientId,
        nameApp: item.app?.nameApp || item.clientId,
        icon: item.app?.icon || null,
        badge: item.app?.badge || "SSO",
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        isUsed: item.isUsed,
        usedAt: item.usedAt,
        requestIp: item.requestIp,
      }))
    });
  } catch (error: any) {
    logServerError("GET /api/sso/history", error);
    res.status(500).json({ status: false, message: "Gagal memuat riwayat login SSO." });
  }
});

// GET /api/sso/app-client/:clientId/v2/redirect
// Menerbitkan token sekali pakai (single-use 64 char) dan menghasilkan URL Callback.
// Pengecekan otorisasi peran dilakukan secara fail-closed sebelum tiket diterbitkan
// serta diverifikasi ulang saat aplikasi cabang menukar tiket via verify-token.
app.get("/api/sso/app-client/:clientId/v2/redirect", authenticateToken, writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = req.user!.id;

    if (typeof clientId !== "string" || clientId.length > 100) {
      return res.status(400).json({ status: false, message: "Client ID tidak valid." });
    }

    // Status akun dibaca dari database, bukan dari isi token.
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true }
    });

    if (!currentUser || !currentUser.isActive) {
      return res.status(403).json({ status: false, message: "Akun tidak aktif atau tidak ditemukan." });
    }

    const ssoApp = await prisma.ssoApp.findUnique({
      where: { clientId }
    });

    if (!ssoApp || !ssoApp.isActive) {
      return res.status(404).json({ status: false, message: "Aplikasi cabang tidak ditemukan atau sedang tidak aktif." });
    }

    // Otorisasi aplikasi tujuan: izin masuk `<clientId>:masuk_*` yang dibaca
    // dari `role_permissions`. Fail-closed bila pengguna tidak memilikinya.
    // Aplikasi cabang memvalidasi ulang saat menukar tiket.
    const [permissionKeys, userRoleCodes] = await Promise.all([
      getUserPermissionKeys(userId),
      getUserRoleCodes(userId)
    ]);
    const decision = decideAppAccess(permissionKeys, ssoApp.targetRoles, userRoleCodes);

    if (!decision.allowed) {
      return res.status(403).json({
        status: false,
        message: "Akses ditolak. Anda tidak memiliki akses ke aplikasi ini.",
        reason: decision.reason
      });
    }

    // 1. Pembersihan oportunistik: Hapus token kadaluwarsa lebih dari 24 jam
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.ssoAuthToken.deleteMany({
      where: { expiresAt: { lt: yesterday } }
    }).catch(() => {});

    // 2. Generate Token Acak 64 Karakter (Persis Str::random(64) di Laravel)
    const token = crypto.randomBytes(32).toString("hex");

    // Masa aktif 5 menit
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 3. Simpan ke database sso_auth_tokens
    await prisma.ssoAuthToken.create({
      data: {
        token,
        userId,
        appId: ssoApp.id,
        clientId: ssoApp.clientId,
        expiresAt,
        isUsed: false
      }
    });

    // 4. Catat kunjungan nyata untuk dashboard. Dinaikkan tepat di sini karena
    // titik ini berarti tiket benar-benar diterbitkan dan pengguna menuju
    // aplikasi - bukan sekadar kartu tampil di layar. Kegagalan pencatatan
    // sengaja tidak menggagalkan peluncuran: pengguna tetap harus bisa masuk.
    await prisma.ssoApp
      .update({
        where: { id: ssoApp.id },
        data: { hitCount: { increment: 1 }, lastUsedAt: new Date() }
      })
      .catch((err: unknown) => {
        logServerError("Pencatatan kunjungan sso_apps", err);
      });

    // 5. Bangun URL redirect ke callback cabang (pola seragam: token-only)
    const callbackUrl = new URL(ssoApp.urlRedirect);
    callbackUrl.searchParams.delete("client_id");
    callbackUrl.searchParams.set("token", token);
    const redirectUrl = callbackUrl.toString();

    res.json({
      status: true,
      message: "Token otentikasi v2 berhasil diterbitkan.",
      token,
      redirectUrl
    });
  } catch (error: any) {
    logServerError("GET /api/sso/app-client/:clientId/v2/redirect", error);
    res.status(500).json({ status: false, message: "Terjadi kesalahan saat otorisasi SSO." });
  }
});

app.post("/api/v2/website/check-access", serverToServerLimiter, async (req: Request, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { client_id, client_key, user_id } = body;
    if (typeof client_id !== "string" || !client_id || client_id.length > 100 ||
        typeof client_key !== "string" || !client_key || client_key.length > 200 ||
        typeof user_id !== "number" || !Number.isSafeInteger(user_id) || user_id <= 0) {
      return res.status(422).json({ status: false, message: "Parameter client_id, client_key, atau user_id tidak valid." });
    }
    const ssoApp = await prisma.ssoApp.findFirst({
      where: { clientId: client_id, clientKey: client_key, isActive: true },
      select: { targetRoles: true }
    });
    if (!ssoApp) return res.status(401).json({ status: false, message: "Kredensial aplikasi tidak valid." });
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { isActive: true, roles: { select: { role: { select: { code: true } } } } }
    });
    if (!user || !user.isActive) return res.status(403).json({ status: false, message: "Pengguna tidak aktif atau tidak ditemukan." });
    const roles = user.roles.map((item) => item.role.code);
    return res.json({ status: true, data: { allowed: decideAppAccess([], ssoApp.targetRoles, roles).allowed, roles } });
  } catch {
    logServerError("POST /api/v2/website/check-access", new Error("Access check failed"));
    return res.status(500).json({ status: false, message: "Gagal memeriksa akses aplikasi." });
  }
});

// POST /api/v2/website/verify-token (Dipanggil Server-to-Server oleh LMS, LPPM, E-Surat, dll.)
app.post("/api/v2/website/verify-token", serverToServerLimiter, async (req: Request, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const client_id = body.client_id ?? req.query.client_id;
    const client_key = body.client_key ?? req.query.client_key;
    const token = body.token ?? req.query.token;

    // 1. Validasi Input Body
    if (
      typeof client_id !== "string" ||
      typeof client_key !== "string" ||
      typeof token !== "string" ||
      !client_id ||
      !client_key ||
      !token ||
      client_id.length > 100 ||
      client_key.length > 200 ||
      token.length > 200
    ) {
      return res.status(422).json({
        status: false,
        message: "Parameter tidak lengkap. client_id, client_key, dan token wajib disertakan."
      });
    }

    // 2. Validasi Kredensial Aplikasi Cabang (client_id & client_key)
    const ssoApp = await prisma.ssoApp.findFirst({
      where: {
        clientId: client_id,
        clientKey: client_key,
        isActive: true
      }
    });

    if (!ssoApp) {
      return res.status(401).json({
        status: false,
        message: "Kredensial aplikasi cabang tidak valid atau belum terdaftar."
      });
    }

    // 3. Validasi Token Otentikasi di Tabel sso_auth_tokens
    const authToken = await prisma.ssoAuthToken.findFirst({
      where: {
        token: token,
        clientId: client_id
      }
    });

    if (!authToken) {
      return res.status(401).json({
        status: false,
        message: "Token otentikasi SSO tidak ditemukan."
      });
    }

    if (authToken.isUsed) {
      return res.status(401).json({
        status: false,
        message: "Token otentikasi sudah pernah digunakan (Single-Use Token Expired)."
      });
    }

    if (new Date() > authToken.expiresAt) {
      return res.status(401).json({
        status: false,
        message: "Token otentikasi SSO telah kedaluwarsa (Maksimal 5 Menit)."
      });
    }

    // 4. Bakar Token secara atomik (Single-Use Protection). Kondisi isUsed=false
    // dan expiresAt ikut di dalam WHERE supaya dua request paralel tidak bisa
    // memakai token yang sama.
    const burnResult = await prisma.ssoAuthToken.updateMany({
      where: {
        id: authToken.id,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      data: { isUsed: true }
    });

    if (burnResult.count !== 1) {
      return res.status(401).json({
        status: false,
        message: "Token otentikasi sudah digunakan atau kedaluwarsa."
      });
    }

    // 5. Ambil Data Profil Pengguna Asli
    const user = await prisma.user.findUnique({
      where: { id: authToken.userId },
      include: {
        roles: {
          include: {
            role: { select: { id: true, code: true, name: true } }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({
        status: false,
        message: "Pengguna SSO tidak ditemukan atau dalam status nonaktif."
      });
    }

    const roleCodes = user.roles.map((ur) => ur.role.code);
    const primaryRole = roleCodes.includes("SUPERADMIN") ? "SUPERADMIN" : (roleCodes[0] ?? "");

    // Akses masuk memakai kode peran persis; izin tindakan tetap terpisah.
    const verifyPermissionKeys = await getUserPermissionKeys(user.id);
    const verifyDecision = decideAppAccess(verifyPermissionKeys, ssoApp.targetRoles, roleCodes);

    if (!verifyDecision.allowed) {
      return res.status(403).json({
        status: false,
        message: "Akses ditolak. Anda tidak memiliki akses ke aplikasi ini.",
        reason: verifyDecision.reason
      });
    }

    // 7. Return Payload Profil Terpercaya (Sesuai Format SSO Diskominfo Medan)
    //
    // `permissions` disertakan agar aplikasi cabang dapat menegakkan izin
    // fitur tanpa tabel RBAC sendiri. Ini hanya salinan untuk sesi berjalan:
    // aplikasi cabang tidak boleh menyimpannya sebagai sumber kebenaran, dan
    // tiket SSO berumur pendek (5 menit, sekali pakai) sehingga daftar ini
    // tidak menjadi hak akses permanen.
    const permissionsForApp = verifyPermissionKeys.filter(
      (k) => !k.includes(":") || k.startsWith("akses:")
    );

    res.json({
      status: true,
      message: "Autentikasi SSO v2 Berhasil",
      data: {
        user: {
          id: user.id,
          username: user.username,
          nama: user.nama,
          email: user.email,
          noHp: user.noHp,
          role: primaryRole,
          roles: roleCodes,
          nim: user.nim,
          nidn: user.nidn,
          fakultas: user.fakultas,
          prodi: user.prodi,
          avatar: user.avatar
        },
        app: {
          clientId: ssoApp.clientId,
          nameApp: ssoApp.nameApp
        },
        access: {
          allowed: verifyDecision.allowed,
          tingkat: verifyDecision.tingkat,
          permissions: permissionsForApp
        }
      }
    });
  } catch (error: any) {
    logServerError("POST /api/v2/website/verify-token", error);
    res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server SSO."
    });
  }
});

// ==========================================
// 3. PANEL SUPERADMIN (PENGELOLAAN SSO)
// ==========================================

// GET /api/admin/stats
// Statistik global hanya untuk pengelola panel. Sebelumnya endpoint ini memakai
// `dashboard:view` yang juga dimiliki DOSEN/MAHASISWA, sehingga civitas biasa
// bisa membaca agregat seluruh akun kampus.
app.get("/api/admin/stats", authenticateToken, requireAnyPermission([...APP_ACCESS_PERMISSION_KEYS]), async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    // Mahasiswa & dosen dihitung dari penugasan peran
    const totalMahasiswa = await prisma.userRole.count({ where: { role: { code: "MAHASISWA" } } });
    const totalDosen = await prisma.userRole.count({ where: { role: { code: "DOSEN" } } });
    const totalApps = await prisma.ssoApp.count();
    const totalTokens = await prisma.ssoAuthToken.count();

    res.json({
      status: true,
      data: {
        totalUsers,
        totalMahasiswa,
        totalDosen,
        totalApps,
        totalTokens
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal mengambil statistik." });
  }
});

// GET /api/admin/users
app.get("/api/admin/users", authenticateToken, requirePermission("user:view"), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        noHp: true,
        roles: {
          select: {
            role: { select: { id: true, code: true, name: true } }
          }
        },
        nim: true,
        nidn: true,
        fakultas: true,
        prodi: true,
        // Foto profil untuk ditampilkan di sebelah nama pada tabel pengguna.
        avatar: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        nik: true,
        angkatan: true,
        statusAkademik: true,
        alamat: true,
        asalSekolah: true,
        namaIbuKandung: true,
        gelarDepan: true,
        gelarBelakang: true,
        nip: true,
        jabatanAkademik: true,
        bidangKeahlian: true,
        pendidikanTerakhir: true,
        sintaId: true,
        linkSinta: true,
        googleScholar: true,
        orcid: true,
        scopusId: true,
        biografi: true,
        syncedAt: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { id: "desc" }
    });

    const data = users.map((u) => {
      const roleList = u.roles.map((ur) => ur.role);
      const roleCodes = roleList.map((r) => r.code);
      const primaryRole = roleCodes.includes("SUPERADMIN") ? "SUPERADMIN" : (roleCodes[0] ?? "");
      return {
        id: u.id,
        username: u.username,
        nama: u.nama,
        email: u.email,
        noHp: u.noHp,
        nim: u.nim,
        nidn: u.nidn,
        fakultas: u.fakultas,
        prodi: u.prodi,
        avatar: u.avatar,
        jenisKelamin: u.jenisKelamin,
        tempatLahir: u.tempatLahir,
        tanggalLahir: u.tanggalLahir,
        nik: u.nik,
        angkatan: u.angkatan,
        statusAkademik: u.statusAkademik,
        alamat: u.alamat,
        asalSekolah: u.asalSekolah,
        namaIbuKandung: u.namaIbuKandung,
        syncedAt: u.syncedAt,
        isActive: u.isActive,
        createdAt: u.createdAt,
        roles: roleList,
        roleIds: roleList.map((r) => r.id),
        role: primaryRole,
      };
    });

    res.json({ status: true, data });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal mengambil daftar pengguna." });
  }
});

// POST /api/admin/users (Tambah User Baru)
app.post("/api/admin/users", authenticateToken, requirePermission("user:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { username, password, nama, email, noHp, roleIds, roleId, nim, nidn, fakultas, prodi } = body;

    if (typeof username !== "string" || typeof password !== "string" || typeof nama !== "string") {
      return res.status(400).json({ status: false, message: "Username/NIM/NIDN, password, dan nama wajib diisi." });
    }

    // Normalisasi roleIds (mendukung multi-role array maupun single roleId)
    let rawRoleIds: number[] = [];
    if (Array.isArray(roleIds)) {
      rawRoleIds = roleIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
    } else if (roleId !== undefined && roleId !== null) {
      const singleId = Number(roleId);
      if (Number.isInteger(singleId) && singleId > 0) rawRoleIds = [singleId];
    }

    if (rawRoleIds.length === 0) {
      return res.status(400).json({ status: false, message: "Pilih minimal satu peran (role) untuk pengguna." });
    }

    const trimmedUsername = username.trim();
    const trimmedNama = nama.trim();

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      return res.status(400).json({
        status: false,
        message: "Username hanya boleh huruf, angka, titik, garis bawah, atau strip (3-40 karakter)."
      });
    }
    if (!trimmedNama || trimmedNama.length > 120) {
      return res.status(400).json({ status: false, message: "Nama wajib diisi maksimal 120 karakter." });
    }
    if (password.length < 8 || password.length > 200) {
      return res.status(400).json({ status: false, message: "Password minimal 8 karakter." });
    }

    // Validasi peran ke tabel `roles`
    const validRoles = await prisma.role.findMany({
      where: { id: { in: rawRoleIds } },
      select: { id: true, code: true, name: true },
    });
    if (validRoles.length === 0) {
      return res.status(400).json({ status: false, message: "Peran pengguna yang dipilih tidak valid." });
    }

    if (email !== undefined && email !== null && email !== "") {
      if (typeof email !== "string" || email.length > 120 || !EMAIL_PATTERN.test(email.trim())) {
        return res.status(400).json({ status: false, message: "Format email tidak valid." });
      }
    }
    if (noHp !== undefined && noHp !== null && noHp !== "") {
      if (typeof noHp !== "string" || !PHONE_PATTERN.test(noHp.trim())) {
        return res.status(400).json({ status: false, message: "Format nomor WhatsApp tidak valid." });
      }
    }

    const existing = await prisma.user.findUnique({ where: { username: trimmedUsername } });
    if (existing) {
      return res.status(400).json({ status: false, message: "Username / NIM / NIDN sudah terdaftar." });
    }

    const hasMahasiswa = validRoles.some((r) => r.code === "MAHASISWA");
    const hasDosen = validRoles.some((r) => r.code === "DOSEN");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: trimmedUsername,
        password: hashedPassword,
        nama: trimmedNama,
        email: typeof email === "string" && email.trim() ? email.trim() : null,
        noHp: typeof noHp === "string" && noHp.trim() ? noHp.trim() : null,
        nim: hasMahasiswa ? (typeof nim === "string" && nim.trim() ? nim.trim() : trimmedUsername) : null,
        nidn: hasDosen ? (typeof nidn === "string" && nidn.trim() ? nidn.trim() : trimmedUsername) : null,
        fakultas: typeof fakultas === "string" && fakultas.trim() ? fakultas.trim() : null,
        prodi: typeof prodi === "string" && prodi.trim() ? prodi.trim() : null,
        isActive: true,
        roles: {
          create: validRoles.map((r) => ({ roleId: r.id }))
        }
      },
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        noHp: true,
        roles: { select: { role: { select: { id: true, code: true, name: true } } } },
        nim: true,
        nidn: true,
        fakultas: true,
        prodi: true,
        isActive: true,
        createdAt: true
      }
    });

    const resRoles = newUser.roles.map((ur) => ur.role);
    res.json({
      status: true,
      message: "Pengguna SSO berhasil didaftarkan.",
      data: {
        ...newUser,
        roles: resRoles,
        roleIds: resRoles.map((r) => r.id),
        role: resRoles.map((r) => r.code).join(", ")
      }
    });
  } catch (error: any) {
    logServerError("POST /api/admin/users", error);
    res.status(500).json({ status: false, message: "Gagal menambahkan pengguna." });
  }
});

// PUT /api/admin/users/:id (Ubah Data Pengguna)
app.put("/api/admin/users/:id", authenticateToken, requirePermission("user:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ status: false, message: "ID pengguna tidak valid." });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { select: { role: { select: { id: true, code: true } } } } }
    });
    if (!targetUser) {
      return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const {
      nama, email, noHp, roleIds, roleId, nim, nidn, fakultas, prodi, isActive, password,
      username, jenisKelamin, tempatLahir, tanggalLahir, nik, angkatan, statusAkademik,
      alamat, asalSekolah, namaIbuKandung, gelarDepan, gelarBelakang, nip,
      jabatanAkademik, bidangKeahlian, pendidikanTerakhir,
      sintaId, linkSinta, googleScholar, orcid, scopusId, biografi,
    } = body;

    const updateData: any = {};

    if (nama !== undefined) {
      if (typeof nama !== "string" || !nama.trim() || nama.trim().length > 120) {
        return res.status(400).json({ status: false, message: "Nama wajib diisi maksimal 120 karakter." });
      }
      updateData.nama = nama.trim();
    }

    // Normalisasi roleIds
    let newRoleIds: number[] | null = null;
    if (Array.isArray(roleIds)) {
      newRoleIds = roleIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
    } else if (roleId !== undefined && roleId !== null) {
      const singleId = Number(roleId);
      if (Number.isInteger(singleId) && singleId > 0) newRoleIds = [singleId];
    }

    let validRoles: { id: number; code: string }[] | null = null;
    if (newRoleIds !== null) {
      if (newRoleIds.length === 0) {
        return res.status(400).json({ status: false, message: "Pengguna harus memiliki minimal satu peran." });
      }

      validRoles = await prisma.role.findMany({
        where: { id: { in: newRoleIds } },
        select: { id: true, code: true },
      });
      if (validRoles.length === 0) {
        return res.status(400).json({ status: false, message: "Peran pengguna yang dipilih tidak valid." });
      }

      // Proteksi: jangan izinkan menurunkan peran Superadmin pada akun sendiri
      const currentRoleCodes = targetUser.roles.map((ur) => ur.role.code);
      const isCurrentlySuperadmin = currentRoleCodes.includes("SUPERADMIN");
      const willBeSuperadmin = validRoles.some((r) => r.code === "SUPERADMIN");

      if (req.user?.id === userId && isCurrentlySuperadmin && !willBeSuperadmin) {
        return res.status(400).json({ status: false, message: "Anda tidak dapat menurunkan peran Superadmin pada akun sendiri." });
      }
    }

    if (email !== undefined) {
      if (email === null || email === "") {
        updateData.email = null;
      } else if (typeof email === "string") {
        const trimmedEmail = email.trim();
        if (trimmedEmail.length > 120 || !EMAIL_PATTERN.test(trimmedEmail)) {
          return res.status(400).json({ status: false, message: "Format email tidak valid." });
        }
        const duplicateEmail = await prisma.user.findFirst({
          where: { email: trimmedEmail, NOT: { id: userId } }
        });
        if (duplicateEmail) {
          return res.status(400).json({ status: false, message: "Email sudah digunakan oleh akun lain." });
        }
        updateData.email = trimmedEmail;
      }
    }

    if (noHp !== undefined) {
      if (noHp === null || noHp === "") {
        updateData.noHp = null;
      } else if (typeof noHp === "string") {
        const trimmedPhone = noHp.trim();
        if (!PHONE_PATTERN.test(trimmedPhone)) {
          return res.status(400).json({ status: false, message: "Format nomor WhatsApp tidak valid." });
        }
        updateData.noHp = trimmedPhone;
      }
    }

    if (fakultas !== undefined) {
      updateData.fakultas = typeof fakultas === "string" && fakultas.trim() ? fakultas.trim() : null;
    }

    if (prodi !== undefined) {
      updateData.prodi = typeof prodi === "string" && prodi.trim() ? prodi.trim() : null;
    }

    if (nim !== undefined) {
      updateData.nim = typeof nim === "string" && nim.trim() ? nim.trim() : null;
    }

    if (nidn !== undefined) {
      updateData.nidn = typeof nidn === "string" && nidn.trim() ? nidn.trim() : null;
    }

    // ---------------------------------------------------------------
    // Username dapat diubah admin.
    //
    // Sebelumnya kolom ini selalu readonly di antarmuka. Karena username
    // dipakai sebagai kunci login (dan disamakan dengan NIM/NIDN saat akun
    // dibuat SIAKAD), perubahan harus dijaga ketat:
    //   - tidak boleh kosong, maksimal 60 karakter, tanpa spasi,
    //   - tidak boleh bentrok dengan username akun lain,
    //   - akun sendiri tidak boleh mengganti username-nya sendiri, supaya
    //     admin tidak terkunci di luar sesi yang sedang dipakai.
    // ---------------------------------------------------------------
    if (username !== undefined) {
      const usernameBaru = typeof username === "string" ? username.trim() : "";

      if (!usernameBaru) {
        return res.status(400).json({ status: false, message: "Username tidak boleh kosong." });
      }
      if (usernameBaru.length > 60) {
        return res.status(400).json({ status: false, message: "Username maksimal 60 karakter." });
      }
      if (/\s/.test(usernameBaru)) {
        return res.status(400).json({ status: false, message: "Username tidak boleh mengandung spasi." });
      }
      if (req.user?.id === userId && usernameBaru !== targetUser.username) {
        return res.status(400).json({
          status: false,
          message: "Anda tidak dapat mengubah username akun sendiri. Minta admin lain melakukannya.",
        });
      }
      if (usernameBaru !== targetUser.username) {
        const bentrok = await prisma.user.findFirst({
          where: { username: usernameBaru, NOT: { id: userId } },
          select: { id: true },
        });
        if (bentrok) {
          return res.status(409).json({ status: false, message: "Username sudah dipakai akun lain." });
        }
      }
      updateData.username = usernameBaru;
    }

    // ---------------------------------------------------------------
    // Kolom profil lanjutan.
    //
    // Semuanya opsional: hanya ditulis bila dikirim, dan string kosong
    // disimpan sebagai null agar kolom benar-benar kosong. Validasi sengaja
    // ringan � ini data referensi civitas yang sumber aslinya SIAKAD, bukan
    // masukan yang menentukan hak akses.
    // ---------------------------------------------------------------
    const kolomTeksMaksimal: Array<[keyof typeof body, number]> = [
      ["jenisKelamin", 1],
      ["tempatLahir", 100],
      ["nik", 32],
      ["angkatan", 10],
      ["statusAkademik", 50],
      ["alamat", 500],
      ["asalSekolah", 200],
      ["namaIbuKandung", 150],
      ["gelarDepan", 50],
      ["gelarBelakang", 80],
      ["nip", 40],
      ["jabatanAkademik", 100],
      ["bidangKeahlian", 200],
      ["pendidikanTerakhir", 100],
      ["sintaId", 60],
      ["linkSinta", 255],
      ["googleScholar", 255],
      ["orcid", 60],
      ["scopusId", 60],
      ["biografi", 5000],
    ];

    for (const [nama, batas] of kolomTeksMaksimal) {
      const nilai = (body as Record<string, unknown>)[nama];
      if (nilai === undefined) continue;

      if (nilai === null || nilai === "") {
        updateData[nama] = null;
        continue;
      }
      if (typeof nilai !== "string") {
        return res.status(400).json({ status: false, message: `Kolom ${nama} harus berupa teks.` });
      }

      const bersih = nilai.trim();
      if (!bersih) {
        updateData[nama] = null;
        continue;
      }
      if (bersih.length > batas) {
        return res.status(400).json({
          status: false,
          message: `Kolom ${nama} maksimal ${batas} karakter.`,
        });
      }
      updateData[nama] = bersih;
    }

    // Jenis kelamin dibatasi ke dua nilai yang dipakai seluruh aplikasi.
    if (updateData.jenisKelamin !== undefined && updateData.jenisKelamin !== null) {
      if (!["L", "P"].includes(updateData.jenisKelamin)) {
        return res.status(400).json({ status: false, message: "Jenis kelamin harus L atau P." });
      }
    }

    // Tanggal lahir disimpan sebagai teks (kolomnya `String? @db.VarChar(30)`,
    // bukan DateTime). Nilai disimpan dalam bentuk "YYYY-MM-DD" agar konsisten
    // dengan input `type="date"` dan mudah dibaca ulang oleh formulir.
    if (tanggalLahir !== undefined) {
      if (tanggalLahir === null || tanggalLahir === "") {
        updateData.tanggalLahir = null;
      } else if (typeof tanggalLahir === "string") {
        const bersih = tanggalLahir.trim().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(bersih) || Number.isNaN(new Date(bersih).getTime())) {
          return res.status(400).json({ status: false, message: "Format tanggal lahir harus YYYY-MM-DD." });
        }
        updateData.tanggalLahir = bersih;
      }
    }

    if (typeof isActive === "boolean") {
      if (req.user?.id === userId && !isActive) {
        return res.status(400).json({ status: false, message: "Anda tidak dapat menonaktifkan akun sendiri." });
      }
      updateData.isActive = isActive;
    }

    // Reset password opsional
    if (typeof password === "string" && password.trim().length > 0) {
      if (password.length < 8 || password.length > 200) {
        return res.status(400).json({ status: false, message: "Password baru minimal 8 karakter." });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (validRoles !== null) {
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.createMany({
          data: validRoles.map((r) => ({ userId, roleId: r.id })),
        });
      }

      return tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          nama: true,
          email: true,
          noHp: true,
          roles: { select: { role: { select: { id: true, code: true, name: true } } } },
          nim: true,
          nidn: true,
          fakultas: true,
          prodi: true,
          avatar: true,
          jenisKelamin: true,
          tempatLahir: true,
          tanggalLahir: true,
          nik: true,
          angkatan: true,
          statusAkademik: true,
          alamat: true,
          asalSekolah: true,
          namaIbuKandung: true,
          gelarDepan: true,
          gelarBelakang: true,
          nip: true,
          jabatanAkademik: true,
          bidangKeahlian: true,
          pendidikanTerakhir: true,
          sintaId: true,
          linkSinta: true,
          googleScholar: true,
          orcid: true,
          scopusId: true,
          biografi: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });
    });

    const resRoles = updatedUser.roles.map((ur) => ur.role);
    res.json({
      status: true,
      message: "Data pengguna berhasil diperbarui.",
      data: {
        ...updatedUser,
        roles: resRoles,
        roleIds: resRoles.map((r) => r.id),
        role: resRoles.map((r) => r.code).join(", ")
      }
    });
  } catch (error: any) {
    logServerError("PUT /api/admin/users/:id", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui data pengguna." });
  }
});

// DELETE /api/admin/users/:id (Hapus Pengguna)
app.delete("/api/admin/users/:id", authenticateToken, requirePermission("user:delete"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ status: false, message: "ID pengguna tidak valid." });
    }

    if (req.user?.id === userId) {
      return res.status(400).json({ status: false, message: "Anda tidak dapat menghapus akun Anda sendiri." });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    });

    if (!targetUser) {
      return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }

    if (targetUser.username.toLowerCase() === "admin" || targetUser.username.toLowerCase() === "superadmin") {
      return res.status(400).json({ status: false, message: "Akun Super Administrator utama dilindungi dan tidak dapat dihapus." });
    }

    // Bersihkan relasi dependent sebelum menghapus user
    // actorId pada AuditLog menggunakan onDelete: SetNull sesuai skema Prisma
    await prisma.$transaction([
      prisma.ssoAuthToken.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } })
    ]);

    res.json({ status: true, message: `Pengguna '${targetUser.username}' berhasil dihapus permanen.` });
  } catch (error: any) {
    logServerError("DELETE /api/admin/users/:id", error);
    res.status(500).json({ status: false, message: "Gagal menghapus pengguna." });
  }
});

// POST /api/admin/siakad/sync-dosen (Tarik dan Sinkronkan Seluruh Data Dosen dari SIAKAD)
app.post("/api/admin/siakad/sync-dosen", authenticateToken, requirePermission("user:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    // Kredensial admin sistem eksternal HANYA boleh berasal dari environment. Tidak ada
    // nilai cadangan di kode: bila belum diset, endpoint menolak berjalan alih-alih
    // diam-diam memakai akun yang tertulis di repositori.
    const adminUser = process.env.SIAKAD_ADMIN_USER?.trim();
    const adminPass = process.env.SIAKAD_ADMIN_PASS;

    if (!adminUser || !adminPass) {
      logServerError(
        "POST /api/admin/siakad/sync-dosen",
        new Error("SIAKAD_ADMIN_USER / SIAKAD_ADMIN_PASS belum diset di environment.")
      );
      return res.status(503).json({
        status: false,
        message:
          "Sinkronisasi data belum dikonfigurasi. Hubungi administrator untuk mengisi kredensial sistem eksternal pada berkas environment.",
      });
    }

    const lecturers = await scrapeAllDosenFromSia(adminUser, adminPass);
    if (!lecturers || lecturers.length === 0) {
      return res.status(502).json({
        status: false,
        message: "Tidak ada data dosen yang dapat ditarik saat ini.",
      });
    }

    const dosenRole = await prisma.role.findFirst({
      where: { code: "DOSEN" },
    });

    if (!dosenRole) {
      return res.status(500).json({
        status: false,
        message: "Peran DOSEN belum terkonfigurasi di sistem.",
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const defaultPasswordHash = await bcrypt.hash(KATA_SANDI_BAWAAN, 10);

    /*
     * Opsi `biodata`.
     *
     * Daftar dosen SIAKAD hanya memuat NIDN, nama, username, dan homebase prodi.
     * NIK, tempat/tanggal lahir, jenis kelamin, nomor HP, dan alamat hanya ada
     * di halaman edit per dosen, sehingga tiap dosen menambah satu permintaan
     * HTTP (~250 ms). Karena itu pengambilan biodata dibuat OPSIONAL dan
     * bertahap (`offset` & `limit`) supaya satu permintaan tidak melewati batas
     * waktu proxy nginx.
     *
     * Hanya field yang belum terisi pada akun portal yang diisi. Data yang
     * sudah ada tidak pernah ditimpa, dan nilai kosong dari SIAKAD dilewati �
     * banyak dosen memang belum melengkapi biodatanya di SIAKAD.
     */
    const mauBiodata = req.body?.biodata === true || req.body?.biodata === "true";
    const offsetBiodata = Math.max(0, Number(req.body?.offset ?? 0) || 0);
    const limitBiodataRaw = Number(req.body?.limit ?? 0) || 0;
    const limitBiodata = mauBiodata
      ? Math.min(Math.max(limitBiodataRaw || 40, 1), 100)
      : 0;

    const biodataBatch = mauBiodata
      ? lecturers.filter((d) => Boolean(d.kodeSia)).slice(offsetBiodata, offsetBiodata + limitBiodata)
      : [];

    let biodataTerisi = 0;
    let biodataKosongDiSia = 0;

    for (const d of biodataBatch) {
      try {
        const detail = await scrapeDosenDetailFromSia(adminUser, adminPass, d.kodeSia as string);
        if (!detail) continue;

        const adaIsi = Boolean(
          detail.nik || detail.tempatLahir || detail.tanggalLahir ||
          detail.jenisKelamin || detail.noHp || detail.alamat
        );
        if (!adaIsi) {
          biodataKosongDiSia++;
          continue;
        }

        const kunciCari: Array<{ username?: string; nidn?: string }> = [];
        if (d.nidn) kunciCari.push({ username: d.nidn }, { nidn: d.nidn });
        if (d.usernameSia) kunciCari.push({ username: d.usernameSia });
        if (kunciCari.length === 0) continue;

        const akun = await prisma.user.findFirst({ where: { OR: kunciCari } });
        if (!akun) continue;

        // "||" dipakai sengaja: nilai kosong dari SIAKAD tidak boleh menimpa
        // data yang sudah ada di portal.
        await prisma.user.update({
          where: { id: akun.id },
          data: {
            nik: detail.nik || akun.nik,
            tempatLahir: detail.tempatLahir || akun.tempatLahir,
            tanggalLahir: detail.tanggalLahir || akun.tanggalLahir,
            jenisKelamin: detail.jenisKelamin || akun.jenisKelamin,
            noHp: detail.noHp || akun.noHp,
            alamat: detail.alamat || akun.alamat,
          },
        });
        biodataTerisi++;
      } catch (error) {
        // Satu dosen gagal tidak boleh menggagalkan seluruh proses.
        logServerError(`POST /api/admin/siakad/sync-dosen (biodata ${d.nidn})`, error);
      }
    }

    for (const d of lecturers) {
      /*
       * Pencocokan akun portal dengan baris SIAKAD.
       *
       * NIDN adalah kunci utama, tetapi tidak semua dosen memilikinya (dosen
       * baru atau data SIAKAD yang belum lengkap). Karena itu username SIAKAD
       * (`d.usernameSia`, kolom <code> pada tabel dosen) ikut dijadikan kunci
       * agar satu baris SIAKAD tidak berubah menjadi akun ganda setiap kali
       * sinkronisasi dijalankan.
       */
      const kunciCocok: Array<{ username?: string; nidn?: string }> = [];
      if (d.nidn) {
        kunciCocok.push({ username: d.nidn }, { nidn: d.nidn });
      }
      if (d.usernameSia) {
        kunciCocok.push({ username: d.usernameSia });
      }

      const existing = kunciCocok.length
        ? await prisma.user.findFirst({ where: { OR: kunciCocok } })
        : null;

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            nama: d.nama,
            nidn: d.nidn,
            prodi: d.prodi || existing.prodi,
            fakultas: d.fakultas || existing.fakultas,
            syncedAt: new Date(),
          },
        });
        updatedCount++;
      } else {
        await prisma.user.create({
          data: {
            // Username wajib unik; pakai NIDN, lalu username SIAKAD sebagai
            // cadangan bila NIDN belum diisi pada data SIAKAD.
            username: d.nidn || d.usernameSia || `dosen-${d.kodeSia ?? Date.now()}`,
            password: defaultPasswordHash,
            harusGantiPassword: true,
            nama: d.nama,
            nidn: d.nidn,
            prodi: d.prodi,
            fakultas: d.fakultas,
            statusAkademik: "Aktif",
            syncedAt: new Date(),
            isActive: true,
            roles: {
              create: {
                roleId: dosenRole.id,
              },
            },
          },
        });
        createdCount++;
      }
    }

    const totalBerkodeSia = lecturers.filter((d) => Boolean(d.kodeSia)).length;
    const biodataSelesai = mauBiodata && offsetBiodata + biodataBatch.length >= totalBerkodeSia;

    res.json({
      status: true,
      message: mauBiodata
        ? `Sinkronisasi Dosen SIAKAD selesai. ${createdCount} akun baru dibuat, ${updatedCount} akun diperbarui. Biodata: ${biodataTerisi} diisi, ${biodataKosongDiSia} kosong di SIAKAD.`
        : `Sinkronisasi Dosen SIAKAD selesai. ${createdCount} akun baru dibuat, ${updatedCount} akun diperbarui.`,
      data: {
        totalSia: lecturers.length,
        created: createdCount,
        updated: updatedCount,
        // Hanya relevan ketika `biodata: true`.
        biodata: mauBiodata
          ? {
              diminta: true,
              diproses: biodataBatch.length,
              terisi: biodataTerisi,
              kosongDiSia: biodataKosongDiSia,
              offset: offsetBiodata,
              offsetBerikutnya: biodataSelesai ? null : offsetBiodata + biodataBatch.length,
              totalBerkodeSia,
              selesai: biodataSelesai,
            }
          : { diminta: false },
      },
    });
  } catch (error: any) {
    logServerError("POST /api/admin/siakad/sync-dosen", error);
    res.status(500).json({
      status: false,
      message: error?.message || "Gagal menyinkronkan data dosen dari SIAKAD.",
    });
  }
});

// GET /api/admin/siakad/prodi-list (Daftar Prodi SIAKAD untuk filter sinkronisasi mahasiswa)
app.get("/api/admin/siakad/prodi-list", authenticateToken, requirePermission("user:view"), async (_req: AuthRequest, res: Response) => {
  res.json({
    status: true,
    data: SIAKAD_PRODI_LIST,
  });
});

// POST /api/admin/siakad/sync-mahasiswa (Sinkronisasi Data Mahasiswa Massal/Terfilter dari SIAKAD)
app.post("/api/admin/siakad/sync-mahasiswa", authenticateToken, requirePermission("user:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const adminUser = process.env.SIAKAD_ADMIN_USER;
    const adminPass = process.env.SIAKAD_ADMIN_PASS;

    if (!adminUser || !adminPass) {
      logServerError(
        "POST /api/admin/siakad/sync-mahasiswa",
        new Error("SIAKAD_ADMIN_USER / SIAKAD_ADMIN_PASS belum diset di environment.")
      );
      return res.status(503).json({
        status: false,
        message:
          "Kredensial admin SIAKAD belum dikonfigurasi pada berkas environment.",
      });
    }

    const { idJurusan, angkatan } = req.body || {};

    const students = await scrapeMahasiswaFromSia(adminUser, adminPass, {
      idJurusan: idJurusan ? String(idJurusan).trim() : undefined,
      angkatan: angkatan ? String(angkatan).trim() : undefined,
    });

    if (!students || students.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Tidak ditemukan data mahasiswa yang cocok dengan filter yang dipilih pada portal SIAKAD.",
      });
    }

    const mhsRole = await prisma.role.findFirst({
      where: { code: "MAHASISWA" },
    });

    if (!mhsRole) {
      return res.status(500).json({
        status: false,
        message: "Peran MAHASISWA belum terkonfigurasi di sistem.",
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const defaultPasswordHash = await bcrypt.hash(KATA_SANDI_BAWAAN, 10);

    for (const m of students) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { username: m.nim },
            { nim: m.nim },
          ],
        },
      });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            nama: m.nama,
            nim: m.nim,
            prodi: m.prodi || existing.prodi,
            fakultas: m.fakultas || existing.fakultas,
            angkatan: m.angkatan || existing.angkatan,
            jenisKelamin: m.jenisKelamin || existing.jenisKelamin,
            statusAkademik: m.statusAkademik || existing.statusAkademik,
            avatar: existing.avatar || m.fotoUrl || null,
            syncedAt: new Date(),
          },
        });
        updatedCount++;
      } else {
        await prisma.user.create({
          data: {
            username: m.nim,
            password: defaultPasswordHash,
            harusGantiPassword: true,
            nama: m.nama,
            nim: m.nim,
            prodi: m.prodi,
            fakultas: m.fakultas,
            angkatan: m.angkatan,
            jenisKelamin: m.jenisKelamin,
            statusAkademik: m.statusAkademik || "Aktif",
            avatar: m.fotoUrl || null,
            syncedAt: new Date(),
            isActive: true,
            roles: {
              create: {
                roleId: mhsRole.id,
              },
            },
          },
        });
        createdCount++;
      }
    }

    res.json({
      status: true,
      message: `Sinkronisasi Mahasiswa SIAKAD berhasil. ${createdCount} akun baru dibuat, ${updatedCount} akun diperbarui. Total ${students.length} mahasiswa tersinkronkan.`,
      data: {
        totalSia: students.length,
        created: createdCount,
        updated: updatedCount,
      },
    });
  } catch (error: any) {
    logServerError("POST /api/admin/siakad/sync-mahasiswa", error);
    res.status(500).json({
      status: false,
      message: error?.message || "Gagal menyinkronkan data mahasiswa dari SIAKAD.",
    });
  }
});

// GET /api/admin/apps (Daftar Semua Aplikasi Terdaftar)
app.get("/api/admin/apps", authenticateToken, requirePermission("application:view"), async (req: AuthRequest, res: Response) => {
  try {
    const apps = await prisma.ssoApp.findMany({
      orderBy: { order: "asc" }
    });

    // `clientKey` adalah rahasia server-to-server. Nilainya hanya boleh sampai
    // ke peramban pengguna yang berhak mengelolanya, yaitu pemegang izin
    // `application:edit` sekaligus peran admin gateway. Pengguna dengan izin
    // lihat saja menerima `clientKey: null` sehingga daftar tetap tampil tanpa
    // membocorkan rahasia.
    const bolehLihatKunci = await bolehMelihatClientKey(req);

    res.json({
      status: true,
      data: apps.map((app) => ({
        ...app,
        clientKey: bolehLihatKunci ? app.clientKey : null,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat aplikasi SSO." });
  }
});

// POST /api/admin/apps/sync — Sinkronisasi registry aplikasi bawaan kampus & kunci admin
app.post("/api/admin/apps/sync", authenticateToken, requirePermission("application:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || "";
    const prodiBaseUrl = process.env.PRODI_BASE_URL || "";
    if (!publicBaseUrl || !prodiBaseUrl) {
      return res.status(500).json({
        status: false,
        message: "PUBLIC_BASE_URL dan PRODI_BASE_URL wajib diisi di .env sebelum sinkronisasi.",
      });
    }

    // Registri aplikasi didefinisikan satu kali di `prisma/ssoApps.ts`, sama
    // persis dengan yang dipakai seeder. Server tidak menyimpan salinan daftar.
    const defaultApps = buildSsoAppDefinitions(process.env, { publicBaseUrl, prodiBaseUrl });
    const { createdCount, updatedCount } = await seedSsoApps(prisma, defaultApps);

    res.json({
      status: true,
      message: `Sinkronisasi berhasil: ${createdCount} aplikasi baru, ${updatedCount} diperbarui.`,
      data: {
        createdCount,
        updatedCount,
        totalApps: defaultApps.length,
      },
    });
  } catch (error: any) {
    logServerError("POST /api/admin/apps/sync", error);
    res.status(500).json({ status: false, message: "Gagal menjalankan sinkronisasi data aplikasi." });
  }
});

// POST /api/admin/apps (Tambah Aplikasi Cabang Baru)
app.post("/api/admin/apps", authenticateToken, requirePermission("application:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { clientId, clientKey, nameApp, description, icon, badge, urlRedirect, tingkatMasuk } = body;

    if (typeof clientId !== "string" || typeof clientKey !== "string" || typeof nameApp !== "string") {
      return res.status(400).json({ status: false, message: "client_id, client_key, nama aplikasi, dan URL redirect wajib diisi." });
    }

    const trimmedClientId = clientId.trim();
    const trimmedNameApp = nameApp.trim();
    const normalizedUrl = normalizeHttpUrl(urlRedirect);

    if (!/^[A-Za-z0-9._-]{3,100}$/.test(trimmedClientId)) {
      return res.status(400).json({ status: false, message: "Client ID hanya boleh huruf, angka, titik, garis bawah, atau strip (3-100 karakter)." });
    }
    if (clientKey.trim().length < 16 || clientKey.trim().length > 200) {
      return res.status(400).json({ status: false, message: "Client Key minimal 16 karakter." });
    }
    if (!trimmedNameApp || trimmedNameApp.length > 120) {
      return res.status(400).json({ status: false, message: "Nama aplikasi wajib diisi maksimal 120 karakter." });
    }
    if (!normalizedUrl) {
      return res.status(400).json({ status: false, message: "URL redirect harus berupa alamat http atau https yang valid." });
    }

    // Tingkat masuk yang diminta; default tiga-tiganya. Izin inilah yang
    // nanti dilekatkan pada peran, menggantikan `targetRoles`.
    const tingkatDiminta: TingkatMasuk[] = Array.isArray(tingkatMasuk)
      ? TINGKAT_MASUK.filter((tingkat: TingkatMasuk) => tingkatMasuk.includes(tingkat))
      : [...TINGKAT_MASUK];

    if (tingkatDiminta.length === 0) {
      return res.status(400).json({ status: false, message: "Pilih minimal satu tingkat masuk (admin, dosen, atau mahasiswa)." });
    }
    const normalizedIcon = icon === undefined ? "LayoutGrid" : normalizeIconValue(icon);
    if (!normalizedIcon) {
      return res.status(400).json({ status: false, message: "Ikon aplikasi tidak valid." });
    }

    const existing = await prisma.ssoApp.findUnique({ where: { clientId: trimmedClientId } });
    if (existing) {
      return res.status(400).json({ status: false, message: "Aplikasi dengan Client ID tersebut sudah terdaftar." });
    }

    const newApp = await prisma.ssoApp.create({
      data: {
        clientId: trimmedClientId,
        clientKey: clientKey.trim(),
        nameApp: trimmedNameApp,
        description: typeof description === "string" && description.trim() ? description.trim() : null,
        icon: normalizedIcon,
        badge: typeof badge === "string" && badge.trim() ? badge.trim().slice(0, 40) : "Internal",
        urlRedirect: normalizedUrl,
        // Keterangan saja; bukan sumber otorisasi. Akses ditentukan oleh izin
        // masuk di bawah, yang dilekatkan pada peran lewat role_permissions.
        targetRoles: JSON.stringify(["SUPERADMIN", "DOSEN", "MAHASISWA"]),
        isActive: true
      }
    });

    res.json({
      status: true,
      message: "Aplikasi SSO berhasil didaftarkan. Pengguna aplikasi ini didaftarkan admin masing-masing dari direktori ONE UNUSU.",
      data: newApp
    });
  } catch (error: any) {
    logServerError("POST /api/admin/apps", error);
    res.status(500).json({ status: false, message: "Gagal mendaftarkan aplikasi." });
  }
});

// PUT /api/admin/apps/:id (Update Aplikasi Cabang)
app.put("/api/admin/apps/:id", authenticateToken, requirePermission("application:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID aplikasi tidak valid." });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const { nameApp, description, icon, badge, urlRedirect, isActive, clientKey } = body;

    const data: {
      nameApp?: string;
      description?: string | null;
      icon?: string;
      badge?: string;
      urlRedirect?: string;
      clientKey?: string;
      isActive?: boolean;
    } = {};

    if (nameApp !== undefined) {
      if (typeof nameApp !== "string" || !nameApp.trim() || nameApp.trim().length > 120) {
        return res.status(400).json({ status: false, message: "Nama aplikasi tidak valid." });
      }
      data.nameApp = nameApp.trim();
    }
    if (description !== undefined) {
      data.description = typeof description === "string" && description.trim() ? description.trim() : null;
    }
    if (icon !== undefined) {
      const normalizedIcon = normalizeIconValue(icon);
      if (!normalizedIcon) {
        return res.status(400).json({ status: false, message: "Ikon aplikasi tidak valid." });
      }
      data.icon = normalizedIcon;
    }
    if (badge !== undefined) {
      if (typeof badge !== "string" || !badge.trim()) {
        return res.status(400).json({ status: false, message: "Badge aplikasi tidak valid." });
      }
      data.badge = badge.trim().slice(0, 40);
    }
    if (urlRedirect !== undefined) {
      const normalizedUrl = normalizeHttpUrl(urlRedirect);
      if (!normalizedUrl) {
        return res.status(400).json({ status: false, message: "URL redirect harus berupa alamat http atau https yang valid." });
      }
      data.urlRedirect = normalizedUrl;
    }
    if (clientKey !== undefined && clientKey !== "") {
      if (typeof clientKey !== "string" || clientKey.trim().length < 16 || clientKey.trim().length > 200) {
        return res.status(400).json({ status: false, message: "Client Key minimal 16 karakter." });
      }
      data.clientKey = clientKey.trim();
    }
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ status: false, message: "Status aktif harus berupa boolean." });
      }
      data.isActive = isActive;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ status: false, message: "Tidak ada data yang diubah." });
    }

    const updated = await prisma.ssoApp.update({
      where: { id },
      data
    });

    res.json({ status: true, message: "Data aplikasi SSO berhasil diperbarui.", data: updated });
  } catch (error: any) {
    logServerError("PUT /api/admin/apps/:id", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui aplikasi." });
  }
});

// DELETE /api/admin/apps/:id (Hapus Aplikasi Terdaftar)
app.delete("/api/admin/apps/:id", authenticateToken, requirePermission("application:delete"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID aplikasi tidak valid." });
    }

    const app = await prisma.ssoApp.findUnique({ where: { id } });
    if (!app) {
      return res.status(404).json({ status: false, message: "Aplikasi tidak ditemukan." });
    }

    // Hapus juga token auth terkait jika ada
    await prisma.ssoAuthToken.deleteMany({ where: { clientId: app.clientId } });
    await prisma.ssoApp.delete({ where: { id } });

    res.json({ status: true, message: `Aplikasi ${app.nameApp} berhasil dihapus.` });
  } catch (error: any) {
    logServerError("DELETE /api/admin/apps/:id", error);
    res.status(500).json({ status: false, message: "Gagal menghapus aplikasi." });
  }
});

// ==========================================
// 4. OTORISASI: PERMISSION & ROLE
// ==========================================

// GET /api/admin/permissions (Katalog izin format resource:action)
app.get("/api/admin/permissions", authenticateToken, requirePermission("permission:view"), async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
      select: {
        id: true,
        key: true,
        resource: true,
        action: true,
        label: true,
        _count: {
          select: { roles: true }
        }
      }
    });

    const data = permissions.map((perm) => ({
      id: perm.id,
      key: perm.key,
      resource: perm.resource,
      action: perm.action,
      label: perm.label,
      roleCount: perm._count.roles,
      isUsed: perm._count.roles > 0
    }));

    res.json({ status: true, data });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat katalog izin." });
  }
});

// POST /api/admin/permissions (Tambah Izin Baru)
app.post("/api/admin/permissions", authenticateToken, requirePermission("permission:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { resource, action, label } = body;

    if (typeof resource !== "string" || !resource.trim()) {
      return res.status(400).json({ status: false, message: "Resource / Aplikasi izin wajib diisi." });
    }
    if (typeof action !== "string" || !action.trim()) {
      return res.status(400).json({ status: false, message: "Aksi izin (action) wajib diisi." });
    }

    const trimmedResource = resource.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const trimmedAction = action.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const key = `${trimmedResource}:${trimmedAction}`;
    const trimmedLabel = typeof label === "string" && label.trim() ? label.trim() : key;

    const existing = await prisma.permission.findUnique({ where: { key } });
    if (existing) {
      return res.status(400).json({ status: false, message: `Izin dengan kunci "${key}" sudah terdaftar.` });
    }

    const newPerm = await prisma.permission.create({
      data: {
        key,
        resource: trimmedResource,
        action: trimmedAction,
        label: trimmedLabel,
      },
    });

    res.json({
      status: true,
      message: `Izin "${newPerm.label}" (${newPerm.key}) berhasil dibuat.`,
      data: newPerm,
    });
  } catch (error: any) {
    logServerError("POST /api/admin/permissions", error);
    res.status(500).json({ status: false, message: "Gagal menambahkan izin." });
  }
});

// DELETE /api/admin/permissions/:id (Hapus Izin Kustom)
app.delete("/api/admin/permissions/:id", authenticateToken, requirePermission("permission:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID izin tidak valid." });
    }

    const perm = await prisma.permission.findUnique({ where: { id } });
    if (!perm) {
      return res.status(404).json({ status: false, message: "Izin tidak ditemukan." });
    }

    // Lepas relasi role_permissions terlebih dahulu
    await prisma.rolePermission.deleteMany({ where: { permissionId: id } });
    await prisma.permission.delete({ where: { id } });

    res.json({
      status: true,
      message: `Izin "${perm.label}" (${perm.key}) berhasil dihapus.`,
    });
  } catch (error: any) {
    logServerError("DELETE /api/admin/permissions/:id", error);
    res.status(500).json({ status: false, message: "Gagal menghapus izin." });
  }
});

// POST /api/admin/permissions/sync (Sinkronkan katalog izin resmi ke database & hapus izin usang)
app.post("/api/admin/permissions/sync", authenticateToken, requirePermission("permission:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { seedAccessControl } = await import("./lib/accessControl.js");
    await seedAccessControl(prisma);

    res.json({
      status: true,
      message: "Berhasil menyinkronkan seluruh katalog izin, membersihkan izin usang/orphan, dan memperbarui relasi peran sistem.",
    });
  } catch (error: any) {
    logServerError("POST /api/admin/permissions/sync", error);
    res.status(500).json({ status: false, message: "Gagal menyinkronkan katalog izin." });
  }
});

// POST /api/admin/permissions/cleanup (Pembersihan izin yang tidak digunakan/orphan atau usang)
app.post("/api/admin/permissions/cleanup", authenticateToken, requirePermission("permission:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Susun daftar kunci izin yang sah. Aturan pembentukan kunci wajib sama
    //    dengan `syncPermissions()` dan `cleanObsoletePermissions()` di
    //    lib/accessControl.ts: resource "akses" memakai action apa adanya,
    //    resource lain memakai `${resource}:${action}`.
    const { PERMISSION_CATALOG } = await import("./lib/accessControl.js");
    const validKeys = new Set<string>();
    for (const group of PERMISSION_CATALOG) {
      for (const action of group.actions) {
        validKeys.add(`${group.resource}:${action}`);
      }
    }

    // Izin masuk `masuk_*` sudah dihapus dari katalog: akses aplikasi cabang
    // ditentukan oleh keanggotaan pengguna di masing-masing aplikasi, bukan oleh
    // izin global. Izin format lama karena itu otomatis terdeteksi usang.

    // Cari izin di database yang kuncinya tidak ada di katalog resmi maupun aplikasi cabang
    // ATAU yang tidak terikat ke peran manapun (roles.none)
    const obsoletePermissions = await prisma.permission.findMany({
      where: {
        OR: [
          {
            key: {
              notIn: Array.from(validKeys),
            },
          },
          {
            roles: {
              none: {},
            },
          },
        ],
      },
      select: { id: true, key: true, label: true },
    });

    if (obsoletePermissions.length === 0) {
      return res.json({
        status: true,
        message: "Tidak ditemukan izin yang usang atau tidak digunakan. Seluruh izin sudah sinkron dengan katalog sub-menu.",
        data: { cleanedCount: 0, cleanedKeys: [] },
      });
    }

    const idsToDelete = obsoletePermissions.map((p) => p.id);
    const keysToDelete = obsoletePermissions.map((p) => p.key);

    // Hapus ikatan role_permissions terlebih dahulu
    await prisma.rolePermission.deleteMany({
      where: {
        permissionId: { in: idsToDelete },
      },
    });

    // Hapus permission yang usang/tidak terikat
    await prisma.permission.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    });

    res.json({
      status: true,
      message: `Berhasil membersihkan ${idsToDelete.length} izin usang/tidak digunakan (${keysToDelete.join(", ")}).`,
      data: {
        cleanedCount: idsToDelete.length,
        cleanedKeys: keysToDelete,
      },
    });
  } catch (error: any) {
    logServerError("POST /api/admin/permissions/cleanup", error);
    res.status(500).json({ status: false, message: "Gagal membersihkan izin yang tidak digunakan." });
  }
});

// GET /api/admin/roles (Daftar peran beserta izin dan jumlah pengguna)
app.get("/api/admin/roles", authenticateToken, requirePermission("role:view"), async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: "asc" },
      include: {
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { userRoles: true } }
      }
    });

    const data = roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.userRoles,
      permissionKeys: role.permissions.map((item) => item.permission.key)
    }));

    res.json({ status: true, data });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat daftar peran." });
  }
});

// POST /api/admin/roles (Tambah peran baru)
app.post("/api/admin/roles", authenticateToken, requirePermission("role:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { code, name, description } = body;

    if (typeof code !== "string" || typeof name !== "string" || !code.trim() || !name.trim()) {
      return res.status(400).json({ status: false, message: "Kode dan nama peran wajib diisi." });
    }

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, "_");
    if (!/^[A-Z0-9_]{2,40}$/.test(normalizedCode)) {
      return res.status(400).json({ status: false, message: "Kode peran hanya boleh huruf, angka, dan garis bawah (2-40 karakter)." });
    }
    if (name.trim().length > 80) {
      return res.status(400).json({ status: false, message: "Nama peran maksimal 80 karakter." });
    }

    const existing = await prisma.role.findUnique({ where: { code: normalizedCode } });
    if (existing) {
      return res.status(400).json({ status: false, message: "Kode peran tersebut sudah digunakan." });
    }

    const role = await prisma.role.create({
      data: {
        code: normalizedCode,
        name: name.trim(),
        description: typeof description === "string" && description.trim() ? description.trim().slice(0, 255) : null,
        isSystem: false
      }
    });

    res.json({ status: true, message: "Peran baru berhasil dibuat.", data: role });
  } catch (error: any) {
    logServerError("POST /api/admin/roles", error);
    res.status(500).json({ status: false, message: "Gagal membuat peran." });
  }
});

// PUT /api/admin/roles/:id (Ubah nama / deskripsi peran)
app.put("/api/admin/roles/:id", authenticateToken, requirePermission("role:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID peran tidak valid." });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const { name, description } = body;

    const data: { name?: string; description?: string | null } = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
        return res.status(400).json({ status: false, message: "Nama peran tidak valid." });
      }
      data.name = name.trim();
    }
    if (description !== undefined) {
      data.description = typeof description === "string" && description.trim() ? description.trim().slice(0, 255) : null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ status: false, message: "Tidak ada data yang diubah." });
    }

    const role = await prisma.role.update({ where: { id }, data });
    res.json({ status: true, message: "Peran berhasil diperbarui.", data: role });
  } catch (error: any) {
    logServerError("PUT /api/admin/roles/:id", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui peran." });
  }
});

app.get("/api/admin/roles/:id/apps", authenticateToken, requirePermission("role:view"), requirePermission("permission:view"), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id)) {
      return res.status(422).json({ status: false, message: "ID peran tidak valid." });
    }
    const role = await prisma.role.findUnique({ where: { id }, select: { code: true } });
    if (!role) return res.status(404).json({ status: false, message: "Peran tidak ditemukan." });
    const ownRoles = await getUserRoleCodes(req.user!.id);
    const apps = await prisma.ssoApp.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, nameApp: true, isActive: true, targetRoles: true }
    });
    return res.json({ status: true, data: apps.map((app) => ({
      id: app.id, nameApp: app.nameApp, isActive: app.isActive,
      selected: parseTargetRoles(app.targetRoles).includes(role.code),
      canGrant: app.isActive && decideAppAccess([], app.targetRoles, ownRoles).allowed
    })) });
  } catch (error: unknown) {
    logServerError("GET /api/admin/roles/:id/apps", error);
    return res.status(500).json({ status: false, message: "Gagal memuat akses aplikasi." });
  }
});

app.put("/api/admin/roles/:id/apps", authenticateToken, requirePermission("role:view"), requirePermission("permission:view"), requirePermission("permission:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  const conflict = new Error("Application mappings changed concurrently");
  try {
    const id = Number(req.params.id);
    const body = isPlainObject(req.body) ? req.body : {};
    const rawIds: unknown = body.appIds;
    if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || !Array.isArray(rawIds) ||
        rawIds.length > 500 || rawIds.some((value) => typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)) {
      return res.status(422).json({ status: false, message: "ID peran atau daftar aplikasi tidak valid." });
    }
    const appIds = new Set(rawIds as number[]);
    const result = await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { id }, select: { code: true } });
      if (!role) return { status: 404, message: "Peran tidak ditemukan." };
      const actor = await tx.user.findUnique({ where: { id: req.user!.id }, select: {
        roles: { select: { role: { select: { code: true } } } }
      } });
      const ownRoles = actor?.roles.map((item) => item.role.code) ?? [];
      const apps = await tx.ssoApp.findMany({ select: { id: true, isActive: true, targetRoles: true } });
      if ([...appIds].some((appId) => !apps.some((app) => app.id === appId && app.isActive))) {
        return { status: 422, message: "Aplikasi harus terdaftar dan aktif." };
      }
      const changed = apps.filter((app) => app.isActive && parseTargetRoles(app.targetRoles).includes(role.code) !== appIds.has(app.id));
      if (changed.some((app) => !decideAppAccess([], app.targetRoles, ownRoles).allowed)) {
        return { status: 403, message: "Anda tidak dapat mengubah akses aplikasi yang tidak Anda miliki." };
      }
      if (changed.some((app) => !parseAppRoles(app.targetRoles))) {
        return { status: 422, message: "Konfigurasi peran aplikasi tidak valid." };
      }
      for (const app of changed) {
        const updated = await tx.ssoApp.updateMany({
          where: { id: app.id, isActive: true, targetRoles: app.targetRoles },
          data: { targetRoles: mapAppRole(app.targetRoles, role.code, appIds.has(app.id)) }
        });
        if (updated.count !== 1) throw conflict;
      }
      return { status: 200, message: "Akses aplikasi peran berhasil diperbarui." };
    });
    return res.status(result.status).json({ status: result.status === 200, message: result.message });
  } catch (error: unknown) {
    if (error === conflict) return res.status(409).json({ status: false, message: "Akses berubah bersamaan. Muat ulang dan coba kembali." });
    logServerError("PUT /api/admin/roles/:id/apps", error);
    return res.status(500).json({ status: false, message: "Gagal menyimpan akses aplikasi." });
  }
});

// PUT /api/admin/roles/:id/permissions (Ganti seluruh izin milik peran)
app.put("/api/admin/roles/:id/permissions", authenticateToken, requirePermission("permission:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID peran tidak valid." });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const rawKeys: unknown = body.permissionKeys;

    if (!Array.isArray(rawKeys) || rawKeys.some((key) => typeof key !== "string")) {
      return res.status(400).json({ status: false, message: "permissionKeys harus berupa array string." });
    }
    if (rawKeys.length > 500) {
      return res.status(400).json({ status: false, message: "Jumlah izin melebihi batas." });
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ status: false, message: "Peran tidak ditemukan." });
    }

    const requestedKeys = Array.from(new Set(rawKeys as string[]));

    // Mencegah eskalasi hak akses: pengguna non-superadmin hanya boleh membagikan izin yang
    // memang sudah dimilikinya sendiri.
    const userRoleCodes = await getUserRoleCodes(req.user!.id);
    const isSuperOrSsoAdmin = userRoleCodes.includes("SUPERADMIN") || userRoleCodes.includes("ADMIN_SSO");

    if (!isSuperOrSsoAdmin) {
      const ownKeys = await getUserPermissionKeys(req.user!.id);
      const unauthorizedKeys = requestedKeys.filter((key) => !ownKeys.includes(key));
      if (unauthorizedKeys.length > 0) {
        return res.status(403).json({
          status: false,
          message: "Anda tidak dapat memberikan izin yang tidak Anda miliki sendiri."
        });
      }
    }

    const permissions = await prisma.permission.findMany({
      where: { key: { in: requestedKeys } },
      select: { id: true }
    });

    const existing = await prisma.rolePermission.findMany({
      where: { roleId: id },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((r) => r.permissionId));
    const wantedIds = new Set(permissions.map((p) => p.id));

    const toAdd = permissions
      .filter((p) => !existingIds.has(p.id))
      .map((p) => ({ roleId: id, permissionId: p.id }));
    const toRemove = [...existingIds].filter((pid) => !wantedIds.has(pid));

    const ops: any[] = [];
    if (toRemove.length > 0) {
      ops.push(
        prisma.rolePermission.deleteMany({
          where: { roleId: id, permissionId: { in: toRemove } },
        })
      );
    }
    if (toAdd.length > 0) {
      ops.push(
        prisma.rolePermission.createMany({
          data: toAdd,
          skipDuplicates: true,
        })
      );
    }

    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }

    res.json({
      status: true,
      message: `Izin peran ${role.name} berhasil diperbarui.`,
      data: { roleId: id, totalPermissions: permissions.length }
    });
  } catch (error: any) {
    logServerError("PUT /api/admin/roles/:id/permissions", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui izin peran." });
  }
});

// DELETE /api/admin/roles/:id (Hapus peran non-sistem yang belum dipakai)
app.delete("/api/admin/roles/:id", authenticateToken, requirePermission("role:delete"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID peran tidak valid." });
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } }
    });

    if (!role) {
      return res.status(404).json({ status: false, message: "Peran tidak ditemukan." });
    }

    if (role.isSystem) {
      return res.status(400).json({ status: false, message: "Peran sistem tidak dapat dihapus." });
    }

    if (role._count.userRoles > 0) {
      return res.status(400).json({ status: false, message: "Peran masih dipakai pengguna dan tidak dapat dihapus." });
    }

    await prisma.role.delete({ where: { id } });
    res.json({ status: true, message: "Peran berhasil dihapus." });
  } catch (error: any) {
    logServerError("DELETE /api/admin/roles/:id", error);
    res.status(500).json({ status: false, message: "Gagal menghapus peran." });
  }
});

// ==========================================
// 5. DIREKTORI & PORTAL PUBLIK (LayananKampus)
// ==========================================

// GET /api/directories (Daftar direktori publik yang aktif)
app.get("/api/directories", async (req: Request, res: Response) => {
  try {
    // Diurutkan dari yang paling sering dikunjungi agar dashboard bisa
    // menaruh direktori terpopuler di depan. Bila hitCount sama (mis. semua
    // masih 0 pada instalasi baru), urutan manual `urutan` jadi penentu
    // berikutnya supaya hasilnya tetap stabil dan tidak acak.
    const directories = await prisma.layananKampus.findMany({
      where: { active: true },
      orderBy: [{ hitCount: "desc" }, { urutan: "asc" }],
      select: {
        id: true,
        nama: true,
        kategori: true,
        deskripsi: true,
        urlTarget: true,
        icon: true,
        isExternal: true,
        urutan: true,
        active: true,
        hitCount: true
      }
    });
    res.json({ status: true, data: directories });
  } catch (error: any) {
    logServerError("GET /api/directories", error);
    res.status(500).json({ status: false, message: "Gagal memuat direktori publik." });
  }
});

// POST /api/directories/:id/hit (Catat kunjungan direktori dari dashboard)
// Sengaja tanpa autentikasi: endpoint GET /api/directories juga publik, dan
// tombol "Kunjungi Tautan" bisa dipakai dari halaman yang tidak membawa token.
// Yang dinaikkan hanya penghitung, tidak ada data pengguna yang disimpan.
app.post("/api/directories/:id/hit", writeLimiter, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ status: false, message: "ID direktori tidak valid." });
  }

  try {
    await prisma.layananKampus.update({
      where: { id },
      data: { hitCount: { increment: 1 }, lastUsedAt: new Date() }
    });
    res.json({ status: true });
  } catch (error: any) {
    // P2025 = baris tidak ada. Itu bukan kegagalan server; cukup dilaporkan
    // sebagai 404 agar pemanggil tahu id-nya salah tanpa memicu log galat.
    if (error?.code === "P2025") {
      return res.status(404).json({ status: false, message: "Direktori tidak ditemukan." });
    }
    logServerError("POST /api/directories/:id/hit", error);
    res.status(500).json({ status: false, message: "Gagal mencatat kunjungan." });
  }
});

// GET /api/admin/directories (Seluruh direktori termasuk yang nonaktif)
app.get("/api/admin/directories", authenticateToken, requirePermission("non_sso:view"), async (req: AuthRequest, res: Response) => {
  try {
    const directories = await prisma.layananKampus.findMany({
      orderBy: { urutan: "asc" }
    });
    res.json({ status: true, data: directories });
  } catch (error: any) {
    logServerError("GET /api/admin/directories", error);
    res.status(500).json({ status: false, message: "Gagal memuat direktori publik." });
  }
});

// POST /api/admin/directories (Tambah item direktori publik)
app.post("/api/admin/directories", authenticateToken, requirePermission("non_sso:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { nama, kategori, deskripsi, urlTarget, icon, isExternal, urutan, active } = body;

    if (typeof nama !== "string" || !nama.trim()) {
      return res.status(400).json({ status: false, message: "Nama direktori dan URL target wajib diisi." });
    }
    if (nama.trim().length > 120) {
      return res.status(400).json({ status: false, message: "Nama direktori maksimal 120 karakter." });
    }

    const normalizedUrl = normalizeHttpUrl(urlTarget);
    if (!normalizedUrl) {
      return res.status(400).json({ status: false, message: "URL target harus berupa alamat http atau https yang valid." });
    }

    const normalizedIcon = icon === undefined ? "GlobeAltIcon" : normalizeIconValue(icon);
    if (!normalizedIcon) {
      return res.status(400).json({ status: false, message: "Ikon direktori tidak valid." });
    }

    const created = await prisma.layananKampus.create({
      data: {
        nama: nama.trim(),
        kategori: typeof kategori === "string" && kategori.trim() ? kategori.trim().slice(0, 60) : "Portal",
        deskripsi: typeof deskripsi === "string" && deskripsi.trim() ? deskripsi.trim().slice(0, 500) : null,
        urlTarget: normalizedUrl,
        icon: normalizedIcon,
        isExternal: isExternal === true,
        urutan: toPositiveInt(urutan, 0),
        active: active === undefined ? true : active === true
      }
    });

    res.json({ status: true, message: "Direktori publik berhasil ditambahkan.", data: created });
  } catch (error: any) {
    logServerError("POST /api/admin/directories", error);
    res.status(500).json({ status: false, message: "Gagal menambahkan direktori." });
  }
});

// PUT /api/admin/directories/:id (Update item direktori publik)
app.put("/api/admin/directories/:id", authenticateToken, requirePermission("non_sso:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID direktori tidak valid." });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const { nama, kategori, deskripsi, urlTarget, icon, isExternal, urutan, active } = body;

    const data: {
      nama?: string;
      kategori?: string;
      deskripsi?: string | null;
      urlTarget?: string;
      icon?: string;
      isExternal?: boolean;
      urutan?: number;
      active?: boolean;
    } = {};

    if (nama !== undefined) {
      if (typeof nama !== "string" || !nama.trim() || nama.trim().length > 120) {
        return res.status(400).json({ status: false, message: "Nama direktori tidak valid." });
      }
      data.nama = nama.trim();
    }
    if (kategori !== undefined) {
      if (typeof kategori !== "string" || !kategori.trim()) {
        return res.status(400).json({ status: false, message: "Kategori direktori tidak valid." });
      }
      data.kategori = kategori.trim().slice(0, 60);
    }
    if (deskripsi !== undefined) {
      data.deskripsi = typeof deskripsi === "string" && deskripsi.trim() ? deskripsi.trim().slice(0, 500) : null;
    }
    if (urlTarget !== undefined) {
      const normalizedUrl = normalizeHttpUrl(urlTarget);
      if (!normalizedUrl) {
        return res.status(400).json({ status: false, message: "URL target harus berupa alamat http atau https yang valid." });
      }
      data.urlTarget = normalizedUrl;
    }
    if (icon !== undefined) {
      const normalizedIcon = normalizeIconValue(icon);
      if (!normalizedIcon) {
        return res.status(400).json({ status: false, message: "Ikon direktori tidak valid." });
      }
      data.icon = normalizedIcon;
    }
    if (isExternal !== undefined) {
      if (typeof isExternal !== "boolean") {
        return res.status(400).json({ status: false, message: "Status eksternal harus berupa boolean." });
      }
      data.isExternal = isExternal;
    }
    if (urutan !== undefined) {
      data.urutan = toPositiveInt(urutan, 0);
    }
    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return res.status(400).json({ status: false, message: "Status aktif harus berupa boolean." });
      }
      data.active = active;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ status: false, message: "Tidak ada data yang diubah." });
    }

    const updated = await prisma.layananKampus.update({
      where: { id },
      data
    });

    res.json({ status: true, message: "Direktori publik berhasil diperbarui.", data: updated });
  } catch (error: any) {
    logServerError("PUT /api/admin/directories/:id", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui direktori." });
  }
});

// DELETE /api/admin/directories/:id (Hapus item direktori publik)
app.delete("/api/admin/directories/:id", authenticateToken, requirePermission("non_sso:delete"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID direktori tidak valid." });
    }

    await prisma.layananKampus.delete({ where: { id } });
    res.json({ status: true, message: "Direktori publik berhasil dihapus." });
  } catch (error: any) {
    logServerError("DELETE /api/admin/directories/:id", error);
    res.status(500).json({ status: false, message: "Gagal menghapus direktori." });
  }
});

// ==========================================
// 6. MANAJEMEN FOTO SLIDER HERO (BannerSlider)
// ==========================================

function isValidImageUrl(val: any): boolean {
  if (typeof val !== "string" || !val.trim()) return false;
  const s = val.trim();
  if (s.startsWith("data:image/") || s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://")) {
    return true;
  }
  return false;
}

// GET /api/sliders (Daftar slider aktif untuk landing page publik)
app.get("/api/sliders", async (req: Request, res: Response) => {
  try {
    const sliders = await prisma.bannerSlider.findMany({
      where: { active: true },
      orderBy: { urutan: "asc" },
      select: {
        id: true,
        judul: true,
        subjudul: true,
        gambarUrl: true,
        gambarMobileUrl: true,
        linkUrl: true,
        urutan: true,
        active: true,
      },
    });
    res.json({ status: true, data: sliders });
  } catch (error: any) {
    logServerError("GET /api/sliders", error);
    res.status(500).json({ status: false, message: "Gagal memuat foto slider." });
  }
});

// GET /api/admin/sliders (Seluruh slider hero termasuk non-aktif)
app.get("/api/admin/sliders", authenticateToken, requirePermission("slider:view"), async (req: AuthRequest, res: Response) => {
  try {
    const sliders = await prisma.bannerSlider.findMany({
      orderBy: { urutan: "asc" },
    });
    res.json({ status: true, data: sliders });
  } catch (error: any) {
    logServerError("GET /api/admin/sliders", error);
    res.status(500).json({ status: false, message: "Gagal memuat daftar slider." });
  }
});

// POST /api/admin/sliders (Tambah media slider hero: gambar atau video)
//
// Body `multipart/form-data`, field `berkas` berisi gambar atau video. Kolom
// database diisi path hasil unggahan, bukan base64.
app.post("/api/admin/sliders", authenticateToken, requirePermission("slider:edit"), writeLimiter, unggahMediaSlider, async (req: AuthRequest, res: Response) => {
  const berkas = req.file as Express.Multer.File | undefined;
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { judul, subjudul, linkUrl, urutan, active } = body;

    if (typeof judul !== "string" || !judul.trim()) {
      if (berkas) hapusMediaSliderFisik(berkas.filename);
      return res.status(400).json({ status: false, message: "Judul slider wajib diisi." });
    }
    if (judul.trim().length > 150) {
      if (berkas) hapusMediaSliderFisik(berkas.filename);
      return res.status(400).json({ status: false, message: "Judul slider maksimal 150 karakter." });
    }

    if (!berkas) {
      return res.status(400).json({ status: false, message: "Berkas gambar atau video slider wajib diunggah." });
    }

    const galatUkuran = periksaUkuranMediaSlider(berkas);
    if (galatUkuran) {
      hapusMediaSliderFisik(berkas.filename);
      return res.status(400).json({ status: false, message: galatUkuran });
    }

    let parsedUrutan = 0;
    if (urutan !== undefined && urutan !== null && urutan !== "") {
      const parsed = Number.parseInt(String(urutan), 10);
      if (!Number.isInteger(parsed) || parsed < 0) {
        hapusMediaSliderFisik(berkas.filename);
        return res.status(400).json({ status: false, message: "Urutan harus berupa angka positif." });
      }
      parsedUrutan = parsed;
    }

    const created = await prisma.bannerSlider.create({
      data: {
        judul: judul.trim(),
        subjudul: typeof subjudul === "string" && subjudul.trim() ? subjudul.trim().slice(0, 255) : null,
        gambarUrl: urlMediaSlider(berkas),
        gambarMobileUrl: null,
        linkUrl: typeof linkUrl === "string" && linkUrl.trim() ? linkUrl.trim() : null,
        urutan: parsedUrutan,
        active: active === undefined || active === "" ? true : active === "true" || active === true,
      },
    });

    res.status(201).json({ status: true, message: "Media slider hero berhasil ditambahkan.", data: created });
  } catch (error: any) {
    // Berkas sudah tertulis ke disk; jangan tinggalkan sampah bila simpan gagal.
    if (berkas) hapusMediaSliderFisik(berkas.filename);
    logServerError("POST /api/admin/sliders", error);
    res.status(500).json({ status: false, message: "Gagal menambahkan media slider." });
  }
});

// PUT /api/admin/sliders/:id (Ubah media slider; berkas baru menggantikan lama)
app.put("/api/admin/sliders/:id", authenticateToken, requirePermission("slider:edit"), writeLimiter, unggahMediaSlider, async (req: AuthRequest, res: Response) => {
  const berkas = req.file as Express.Multer.File | undefined;
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      if (berkas) hapusMediaSliderFisik(berkas.filename);
      return res.status(400).json({ status: false, message: "ID slider tidak valid." });
    }

    const galatUkuran = periksaUkuranMediaSlider(berkas);
    if (galatUkuran) {
      if (berkas) hapusMediaSliderFisik(berkas.filename);
      return res.status(400).json({ status: false, message: galatUkuran });
    }

    const existing = await prisma.bannerSlider.findUnique({ where: { id } });
    if (!existing) {
      if (berkas) hapusMediaSliderFisik(berkas.filename);
      return res.status(404).json({ status: false, message: "Data slider tidak ditemukan." });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const { judul, subjudul, linkUrl, urutan, active } = body;

    const updateData: any = {};

    if (judul !== undefined) {
      if (typeof judul !== "string" || !judul.trim()) {
        if (berkas) hapusMediaSliderFisik(berkas.filename);
        return res.status(400).json({ status: false, message: "Judul slider tidak boleh kosong." });
      }
      updateData.judul = judul.trim().slice(0, 150);
    }

    if (subjudul !== undefined) {
      updateData.subjudul = typeof subjudul === "string" && subjudul.trim() ? subjudul.trim().slice(0, 255) : null;
    }

    if (linkUrl !== undefined) {
      updateData.linkUrl = typeof linkUrl === "string" && linkUrl.trim() ? linkUrl.trim() : null;
    }

    if (urutan !== undefined) {
      const parsed = Number.parseInt(String(urutan), 10);
      if (!Number.isInteger(parsed) || parsed < 0) {
        if (berkas) hapusMediaSliderFisik(berkas.filename);
        return res.status(400).json({ status: false, message: "Urutan harus berupa angka positif." });
      }
      updateData.urutan = parsed;
    }

    if (active !== undefined) {
      updateData.active = active === "true" || active === true;
    }

    if (berkas) {
      updateData.gambarUrl = urlMediaSlider(berkas);
    }

    const updated = await prisma.bannerSlider.update({
      where: { id },
      data: updateData,
    });

    // Berkas lama baru dihapus SETELAH pembaruan berhasil, agar baris tidak
    // kehilangan rujukan bila penyimpanan gagal.
    if (berkas) {
      const namaLama = namaBerkasMediaDariUrl(existing.gambarUrl);
      if (namaLama) hapusMediaSliderFisik(namaLama);
    }

    res.json({ status: true, message: "Media slider hero berhasil diperbarui.", data: updated });
  } catch (error: any) {
    if (berkas) hapusMediaSliderFisik(berkas.filename);
    logServerError("PUT /api/admin/sliders/:id", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui slider." });
  }
});

// DELETE /api/admin/sliders/:id (Hapus slider beserta berkas medianya)
app.delete("/api/admin/sliders/:id", authenticateToken, requirePermission("slider:delete"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID slider tidak valid." });
    }

    const existing = await prisma.bannerSlider.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: "Data slider tidak ditemukan." });
    }

    await prisma.bannerSlider.delete({ where: { id } });

    // Berkas dihapus setelah baris hilang; kegagalan pembersihan disk hanya
    // menyisakan berkas yatim dan tidak membatalkan penghapusan data.
    const nama = namaBerkasMediaDariUrl(existing.gambarUrl);
    if (nama) hapusMediaSliderFisik(nama);

    res.json({ status: true, message: "Media slider hero berhasil dihapus." });
  } catch (error: any) {
    logServerError("DELETE /api/admin/sliders/:id", error);
    res.status(500).json({ status: false, message: "Gagal menghapus slider." });
  }
});

// ---------------------------------------------------------------------------
// INTEGRASI & API HUB � katalog endpoint, API key, dan riwayat penggunaan
//
// Tiga tabel di balik panel ini sebelumnya hanya menampilkan data contoh yang
// ditulis langsung di komponen klien. Endpoint di bawah ini menjadikannya
// CRUD sungguhan di atas model `ApiEndpoint`, `ApiKey`, dan `ApiUsageLog`.
//
// Catatan keamanan untuk API key:
//   - Key dibuat server, tidak pernah diterima dari klien.
//   - Key hanya ditampilkan utuh SEKALI saat dibuat. Sesudah itu daftar hanya
//     mengembalikan potongan (8 karakter awal + 4 akhir) supaya nilai rahasia
//     tidak terus-menerus berpindah lewat jaringan setiap kali halaman dibuka.
//   - Key tidak pernah dihapus fisik: pencabutan mengisi `revoked`, `revokedAt`,
//     dan `revokedReason`, sehingga riwayat pemakaiannya tetap utuh.
// ---------------------------------------------------------------------------

/** Metode HTTP yang boleh disimpan pada katalog endpoint. */
const METODE_ENDPOINT = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

/**
 * Menyaring teks masukan menjadi nilai kolom yang aman.
 *
 * Mengembalikan `null` untuk teks kosong agar kolom opsional benar-benar
 * kosong di database, bukan berisi string kosong.
 */
function teksOpsional(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const bersih = value.trim();
  if (!bersih) return null;
  return bersih.slice(0, maxLength);
}

function teksWajib(value: unknown, maxLength: number): string | null {
  const bersih = teksOpsional(value, maxLength);
  return bersih && bersih.length > 0 ? bersih : null;
}

/**
 * Memvalidasi JSON contoh request/response.
 *
 * Disimpan sebagai teks di database, tetapi harus berupa JSON yang sah supaya
 * halaman dokumentasi tidak menampilkan teks rusak. String kosong menjadi null.
 */
function jsonContoh(value: unknown, maxLength: number): { ok: boolean; nilai: string | null } {
  const bersih = teksOpsional(value, maxLength);
  if (bersih === null) return { ok: true, nilai: null };
  try {
    JSON.parse(bersih);
    return { ok: true, nilai: bersih };
  } catch {
    return { ok: false, nilai: null };
  }
}

/**
 * Potongan key yang aman ditampilkan berulang kali.
 *
 * Hanya awalan dan akhiran yang ditampilkan; bagian tengah diganti titik-titik
 * biasa supaya tidak ada karakter kontrol yang merusak tampilan.
 */
function potongKeyApi(key: string): string {
  if (key.length <= 16) return key;
  return `${key.slice(0, 12)}${"·".repeat(6)}${key.slice(-4)}`;
}

/** Membuat API key baru: `unusu_sec_` + 40 karakter heksadesimal acak. */
function buatKeyApi(): string {
  return `unusu_sec_${crypto.randomBytes(20).toString("hex")}`;
}

/**
 * Menerjemahkan `allowedEndpoints` dari body menjadi JSON array id endpoint.
 *
 * `null` berarti key boleh memanggil semua endpoint publik. Array kosong
 * diperlakukan sama dengan `null` karena tidak ada endpoint yang diizinkan
 * akan membuat key tidak berguna sama sekali.
 */
async function normalisasiEndpointDiizinkan(
  value: unknown
): Promise<{ ok: boolean; nilai: string | null; pesan?: string }> {
  if (value === undefined || value === null) return { ok: true, nilai: null };

  const daftar = Array.isArray(value) ? value : [];
  const id = Array.from(
    new Set(
      daftar
        .map((item) => Number(item))
        .filter((n) => Number.isInteger(n) && n > 0)
    )
  );

  if (id.length === 0) return { ok: true, nilai: null };

  const ada = await prisma.apiEndpoint.count({ where: { id: { in: id } } });
  if (ada !== id.length) {
    return { ok: false, nilai: null, pesan: "Sebagian endpoint yang dipilih tidak ditemukan." };
  }

  return { ok: true, nilai: JSON.stringify(id.sort((a, b) => a - b)) };
}

/** GET /api/admin/api-hub/endpoints � daftar katalog endpoint. */
app.get(
  "/api/admin/api-hub/endpoints",
  authenticateToken,
  requirePermission("api_hub:view"),
  async (req: AuthRequest, res: Response) => {
    try {
      const cari = teksOpsional(req.query.search, 150);
      const sumber = teksOpsional(req.query.sourceApp, 100);

      const data = await prisma.apiEndpoint.findMany({
        where: {
          ...(sumber ? { sourceApp: sumber } : {}),
          ...(cari
            ? {
                OR: [
                  { name: { contains: cari } },
                  { endpoint: { contains: cari } },
                  { description: { contains: cari } },
                ],
              }
            : {}),
        },
        orderBy: [{ sourceApp: "asc" }, { name: "asc" }],
      });

      res.json({ status: true, data, meta: { total: data.length } });
    } catch (error: any) {
      logServerError("GET /api/admin/api-hub/endpoints", error);
      res.status(500).json({ status: false, message: "Gagal memuat katalog endpoint." });
    }
  }
);

/** POST /api/admin/api-hub/endpoints � menambah endpoint baru. */
app.post(
  "/api/admin/api-hub/endpoints",
  authenticateToken,
  requirePermission("api_hub:edit"),
  writeLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, endpoint, method, sourceApp, category, description } = req.body;

      const nama = teksWajib(name, 150);
      const alamat = teksWajib(endpoint, 255);
      const metode = teksWajib(method, 10)?.toUpperCase();
      const penyedia = teksWajib(sourceApp, 100);

      if (!nama || !alamat || !metode || !penyedia) {
        return res.status(400).json({
          status: false,
          message: "Nama, endpoint, metode, dan penyedia wajib diisi.",
        });
      }

      if (!METODE_ENDPOINT.includes(metode as (typeof METODE_ENDPOINT)[number])) {
        return res.status(400).json({
          status: false,
          message: `Metode harus salah satu dari: ${METODE_ENDPOINT.join(", ")}.`,
        });
      }

      if (!alamat.startsWith("/")) {
        return res.status(400).json({
          status: false,
          message: "Alamat endpoint harus dimulai dengan garis miring (/).",
        });
      }

      const contohReq = jsonContoh(req.body.exampleRequest, 20000);
      const contohRes = jsonContoh(req.body.exampleResponse, 20000);
      if (!contohReq.ok || !contohRes.ok) {
        return res.status(400).json({
          status: false,
          message: "Contoh request/response harus berupa JSON yang sah.",
        });
      }

      const sudahAda = await prisma.apiEndpoint.findUnique({ where: { endpoint: alamat } });
      if (sudahAda) {
        return res.status(409).json({
          status: false,
          message: `Endpoint ${alamat} sudah terdaftar dengan nama "${sudahAda.name}".`,
        });
      }

      const dibuat = await prisma.apiEndpoint.create({
        data: {
          name: nama,
          endpoint: alamat,
          method: metode,
          sourceApp: penyedia,
          category: teksOpsional(category, 50) ?? "data",
          description: teksOpsional(description, 65535),
          exampleRequest: contohReq.nilai,
          exampleResponse: contohRes.nilai,
          isActive: req.body.isActive !== false,
          isPublic: req.body.isPublic === true,
        },
      });

      res.status(201).json({
        status: true,
        message: "Endpoint berhasil ditambahkan.",
        data: dibuat,
      });
    } catch (error: any) {
      logServerError("POST /api/admin/api-hub/endpoints", error);
      res.status(500).json({ status: false, message: "Gagal menambah endpoint." });
    }
  }
);

/** PUT /api/admin/api-hub/endpoints/:id � memperbarui endpoint. */
app.put(
  "/api/admin/api-hub/endpoints/:id",
  authenticateToken,
  requirePermission("api_hub:edit"),
  writeLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ status: false, message: "ID endpoint tidak valid." });
      }

      const lama = await prisma.apiEndpoint.findUnique({ where: { id } });
      if (!lama) {
        return res.status(404).json({ status: false, message: "Endpoint tidak ditemukan." });
      }

      const data: Record<string, unknown> = {};

      if (req.body.name !== undefined) {
        const nama = teksWajib(req.body.name, 150);
        if (!nama) return res.status(400).json({ status: false, message: "Nama tidak boleh kosong." });
        data.name = nama;
      }

      if (req.body.endpoint !== undefined) {
        const alamat = teksWajib(req.body.endpoint, 255);
        if (!alamat || !alamat.startsWith("/")) {
          return res.status(400).json({
            status: false,
            message: "Alamat endpoint wajib diisi dan dimulai dengan garis miring (/).",
          });
        }
        if (alamat !== lama.endpoint) {
          const bentrok = await prisma.apiEndpoint.findUnique({ where: { endpoint: alamat } });
          if (bentrok) {
            return res.status(409).json({
              status: false,
              message: `Endpoint ${alamat} sudah dipakai oleh "${bentrok.name}".`,
            });
          }
        }
        data.endpoint = alamat;
      }

      if (req.body.method !== undefined) {
        const metode = teksWajib(req.body.method, 10)?.toUpperCase();
        if (!metode || !METODE_ENDPOINT.includes(metode as (typeof METODE_ENDPOINT)[number])) {
          return res.status(400).json({
            status: false,
            message: `Metode harus salah satu dari: ${METODE_ENDPOINT.join(", ")}.`,
          });
        }
        data.method = metode;
      }

      if (req.body.sourceApp !== undefined) {
        const penyedia = teksWajib(req.body.sourceApp, 100);
        if (!penyedia) {
          return res.status(400).json({ status: false, message: "Penyedia tidak boleh kosong." });
        }
        data.sourceApp = penyedia;
      }

      if (req.body.category !== undefined) data.category = teksOpsional(req.body.category, 50) ?? "data";
      if (req.body.description !== undefined) {
        data.description = teksOpsional(req.body.description, 65535);
      }

      if (req.body.exampleRequest !== undefined) {
        const hasil = jsonContoh(req.body.exampleRequest, 20000);
        if (!hasil.ok) {
          return res.status(400).json({ status: false, message: "Contoh request harus JSON yang sah." });
        }
        data.exampleRequest = hasil.nilai;
      }

      if (req.body.exampleResponse !== undefined) {
        const hasil = jsonContoh(req.body.exampleResponse, 20000);
        if (!hasil.ok) {
          return res.status(400).json({ status: false, message: "Contoh response harus JSON yang sah." });
        }
        data.exampleResponse = hasil.nilai;
      }

      if (req.body.isActive !== undefined) data.isActive = req.body.isActive === true;
      if (req.body.isPublic !== undefined) data.isPublic = req.body.isPublic === true;

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ status: false, message: "Tidak ada perubahan yang dikirim." });
      }

      const diperbarui = await prisma.apiEndpoint.update({ where: { id }, data });

      res.json({ status: true, message: "Endpoint berhasil diperbarui.", data: diperbarui });
    } catch (error: any) {
      logServerError("PUT /api/admin/api-hub/endpoints/:id", error);
      res.status(500).json({ status: false, message: "Gagal memperbarui endpoint." });
    }
  }
);

/** DELETE /api/admin/api-hub/endpoints/:id � menghapus endpoint dari katalog. */
app.delete(
  "/api/admin/api-hub/endpoints/:id",
  authenticateToken,
  requirePermission("api_hub:delete"),
  writeLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ status: false, message: "ID endpoint tidak valid." });
      }

      const ada = await prisma.apiEndpoint.findUnique({ where: { id } });
      if (!ada) {
        return res.status(404).json({ status: false, message: "Endpoint tidak ditemukan." });
      }

      await prisma.apiEndpoint.delete({ where: { id } });

      res.json({ status: true, message: `Endpoint "${ada.name}" berhasil dihapus.` });
    } catch (error: any) {
      logServerError("DELETE /api/admin/api-hub/endpoints/:id", error);
      res.status(500).json({ status: false, message: "Gagal menghapus endpoint." });
    }
  }
);

/** GET /api/admin/api-hub/apps � pilihan aplikasi pemilik key. */
app.get(
  "/api/admin/api-hub/apps",
  authenticateToken,
  requirePermission("api_hub:view"),
  async (_req: AuthRequest, res: Response) => {
    try {
      const data = await prisma.ssoApp.findMany({
        select: { id: true, nameApp: true, isActive: true },
        orderBy: { nameApp: "asc" },
      });
      res.json({ status: true, data });
    } catch (error: any) {
      logServerError("GET /api/admin/api-hub/apps", error);
      res.status(500).json({ status: false, message: "Gagal memuat daftar aplikasi." });
    }
  }
);

/**
 * GET /api/admin/api-hub/keys � daftar API key.
 *
 * Nilai `key` yang dikirim ke klien sudah dipotong. Nilai utuh hanya keluar
 * sekali pada respons pembuatan key.
 */
app.get(
  "/api/admin/api-hub/keys",
  authenticateToken,
  requirePermission("api_hub:view"),
  async (req: AuthRequest, res: Response) => {
    try {
      const cari = teksOpsional(req.query.search, 150);

      const rows = await prisma.apiKey.findMany({
        where: cari
          ? {
              OR: [
                { name: { contains: cari } },
                { description: { contains: cari } },
                { app: { nameApp: { contains: cari } } },
              ],
            }
          : undefined,
        include: { app: { select: { id: true, nameApp: true } } },
        orderBy: { createdAt: "desc" },
      });

      const data = rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        key: potongKeyApi(row.key),
        appId: row.appId,
        appName: row.app.nameApp,
        allowedEndpoints: row.allowedEndpoints
          ? (JSON.parse(row.allowedEndpoints) as number[])
          : null,
        isActive: row.isActive,
        revoked: row.revoked,
        revokedAt: row.revokedAt,
        revokedReason: row.revokedReason,
        lastUsedAt: row.lastUsedAt,
        lastUsedIp: row.lastUsedIp,
        usageCount: row.usageCount,
        createdAt: row.createdAt,
      }));

      res.json({ status: true, data, meta: { total: data.length } });
    } catch (error: any) {
      logServerError("GET /api/admin/api-hub/keys", error);
      res.status(500).json({ status: false, message: "Gagal memuat daftar API key." });
    }
  }
);

/**
 * POST /api/admin/api-hub/keys � membuat API key baru.
 *
 * Respons ini satu-satunya tempat nilai key utuh dikirim ke klien.
 */
app.post(
  "/api/admin/api-hub/keys",
  authenticateToken,
  requirePermission("api_hub:edit"),
  writeLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const nama = teksWajib(req.body.name, 150);
      const appId = Number(req.body.appId);

      if (!nama) {
        return res.status(400).json({ status: false, message: "Nama key wajib diisi." });
      }

      if (!Number.isInteger(appId) || appId <= 0) {
        return res.status(400).json({ status: false, message: "Aplikasi pemilik key wajib dipilih." });
      }

      const app = await prisma.ssoApp.findUnique({ where: { id: appId } });
      if (!app) {
        return res.status(404).json({ status: false, message: "Aplikasi pemilik key tidak ditemukan." });
      }

      const diizinkan = await normalisasiEndpointDiizinkan(req.body.allowedEndpoints);
      if (!diizinkan.ok) {
        return res.status(400).json({ status: false, message: diizinkan.pesan });
      }

      const dibuat = await prisma.apiKey.create({
        data: {
          key: buatKeyApi(),
          name: nama,
          description: teksOpsional(req.body.description, 65535),
          appId,
          allowedEndpoints: diizinkan.nilai,
          createdBy: req.user?.id ?? null,
        },
        include: { app: { select: { nameApp: true } } },
      });

      res.status(201).json({
        status: true,
        message: `API key untuk "${app.nameApp}" berhasil dibuat. Simpan nilainya sekarang � tidak akan ditampilkan lagi.`,
        // Nilai utuh, hanya sekali.
        data: {
          id: dibuat.id,
          name: dibuat.name,
          description: dibuat.description,
          key: dibuat.key,
          appId: dibuat.appId,
          appName: dibuat.app.nameApp,
          allowedEndpoints: diizinkan.nilai ? (JSON.parse(diizinkan.nilai) as number[]) : null,
          isActive: dibuat.isActive,
          revoked: dibuat.revoked,
          usageCount: dibuat.usageCount,
          createdAt: dibuat.createdAt,
        },
      });
    } catch (error: any) {
      logServerError("POST /api/admin/api-hub/keys", error);
      res.status(500).json({ status: false, message: "Gagal membuat API key." });
    }
  }
);

/** PUT /api/admin/api-hub/keys/:id � memperbarui nama, deskripsi, atau izin endpoint. */
app.put(
  "/api/admin/api-hub/keys/:id",
  authenticateToken,
  requirePermission("api_hub:edit"),
  writeLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ status: false, message: "ID key tidak valid." });
      }

      const lama = await prisma.apiKey.findUnique({ where: { id } });
      if (!lama) {
        return res.status(404).json({ status: false, message: "API key tidak ditemukan." });
      }

      const data: Record<string, unknown> = {};

      if (req.body.name !== undefined) {
        const nama = teksWajib(req.body.name, 150);
        if (!nama) return res.status(400).json({ status: false, message: "Nama key tidak boleh kosong." });
        data.name = nama;
      }

      if (req.body.description !== undefined) {
        data.description = teksOpsional(req.body.description, 65535);
      }

      if (req.body.allowedEndpoints !== undefined) {
        const diizinkan = await normalisasiEndpointDiizinkan(req.body.allowedEndpoints);
        if (!diizinkan.ok) {
          return res.status(400).json({ status: false, message: diizinkan.pesan });
        }
        data.allowedEndpoints = diizinkan.nilai;
      }

      // Key yang sudah dicabut tidak boleh diaktifkan lagi lewat jalur ini;
      // pencabutan bersifat final supaya audit trail tidak bisa dihapus jejaknya.
      if (req.body.isActive !== undefined) {
        if (lama.revoked) {
          return res.status(409).json({
            status: false,
            message: "Key yang sudah dicabut tidak dapat diaktifkan kembali. Buat key baru bila diperlukan.",
          });
        }
        data.isActive = req.body.isActive === true;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ status: false, message: "Tidak ada perubahan yang dikirim." });
      }

      const diperbarui = await prisma.apiKey.update({ where: { id }, data });

      res.json({
        status: true,
        message: "API key berhasil diperbarui.",
        data: { ...diperbarui, key: potongKeyApi(diperbarui.key) },
      });
    } catch (error: any) {
      logServerError("PUT /api/admin/api-hub/keys/:id", error);
      res.status(500).json({ status: false, message: "Gagal memperbarui API key." });
    }
  }
);

/**
 * DELETE /api/admin/api-hub/keys/:id � mencabut API key.
 *
 * Baris tidak dihapus. Pencabutan menandai `revoked` agar riwayat pemakaian
 * tetap bisa ditelusuri dan aplikasi pemakai langsung ditolak.
 */
app.delete(
  "/api/admin/api-hub/keys/:id",
  authenticateToken,
  requirePermission("api_hub:delete"),
  writeLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ status: false, message: "ID key tidak valid." });
      }

      const lama = await prisma.apiKey.findUnique({ where: { id } });
      if (!lama) {
        return res.status(404).json({ status: false, message: "API key tidak ditemukan." });
      }

      if (lama.revoked) {
        return res.status(409).json({ status: false, message: "API key ini sudah dicabut sebelumnya." });
      }

      const dicabut = await prisma.apiKey.update({
        where: { id },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: teksOpsional(req.body?.reason, 255) ?? "Dicabut oleh administrator.",
          isActive: false,
        },
      });

      res.json({
        status: true,
        message: `API key "${dicabut.name}" berhasil dicabut.`,
      });
    } catch (error: any) {
      logServerError("DELETE /api/admin/api-hub/keys/:id", error);
      res.status(500).json({ status: false, message: "Gagal mencabut API key." });
    }
  }
);

/** GET /api/admin/api-hub/logs � riwayat pemakaian key. */
app.get(
  "/api/admin/api-hub/logs",
  authenticateToken,
  requirePermission("api_hub:view"),
  async (req: AuthRequest, res: Response) => {
    try {
      const take = Math.min(Math.max(Number(req.query.take) || 100, 1), 500);
      const endpointFilter = teksOpsional(req.query.endpoint, 255);
      const statusFilter = Number(req.query.statusCode);

      const data = await prisma.apiUsageLog.findMany({
        where: {
          ...(endpointFilter ? { endpoint: { contains: endpointFilter } } : {}),
          ...(Number.isInteger(statusFilter) && statusFilter > 0 ? { statusCode: statusFilter } : {}),
        },
        include: {
          key: { select: { id: true, name: true, app: { select: { nameApp: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take,
      });

      res.json({
        status: true,
        data: data.map((log) => ({
          id: log.id,
          keyId: log.keyId,
          keyName: log.key.name,
          appName: log.key.app.nameApp,
          endpoint: log.endpoint,
          method: log.method,
          statusCode: log.statusCode,
          responseTime: log.responseTime,
          requestIp: log.requestIp,
          userAgent: log.userAgent,
          errorMessage: log.errorMessage,
          createdAt: log.createdAt,
        })),
        meta: { total: data.length, take },
      });
    } catch (error: any) {
      logServerError("GET /api/admin/api-hub/logs", error);
      res.status(500).json({ status: false, message: "Gagal memuat riwayat penggunaan." });
    }
  }
);

// ---------------------------------------------------------------------------
// BERKAS DOSEN (unggah mandiri oleh dosen, verifikasi oleh admin)
// ---------------------------------------------------------------------------

type PeranBerkas = "pemilik" | "pengelola";
/**
 * Menentukan peran pengguna pada modul berkas dosen.
 *
 * "pengelola" adalah pemegang izin hapus; mereka dapat melihat dokumen seluruh
 * dosen. "pemilik" hanya mengelola berkasnya sendiri. Pemisahan ini dilakukan
 * di server, bukan hanya di antarmuka, agar dosen tidak dapat membuka dokumen
 * dosen lain lewat ID baris.
 */
async function peranBerkasPengguna(userId: number): Promise<PeranBerkas> {
  const keys = await getUserPermissionKeys(userId);
  if (keys.includes("berkas_dosen:delete")) {
    return "pengelola";
  }
  return "pemilik";
}

/** Profil ringkas dosen pemilik berkas, dipakai daftar monitoring admin. */
const PILIH_PROFIL_PEMILIK = {
  id: true,
  nama: true,
  nidn: true,
  prodi: true,
  fakultas: true,
  avatar: true,
} as const;

/** Memetakan baris DosenBerkas ke bentuk yang dikirim ke antarmuka. */
function bentukBerkas(
  baris: {
    id: number;
    namaFile: string;
    nomorDokumen: string | null;
    tahunSK: string | null;
    keterangan: string | null;
    fileUrl: string;
    fileSize: number;
    uploadedAt: Date;
    isArchived: boolean;
  },
  tipe: { kode: string; nama: string },
  pemilik?: { id: number; nama: string; nidn: string | null; prodi: string | null; fakultas: string | null } | null
) {
  return {
    id: baris.id,
    tipeKode: tipe.kode,
    tipeNama: tipe.nama,
    namaFile: baris.namaFile,
    nomorDokumen: baris.nomorDokumen,
    tahunSK: baris.tahunSK,
    keterangan: baris.keterangan,
    fileUrl: baris.fileUrl,
    fileSize: baris.fileSize,
    uploadedAt: baris.uploadedAt,
    isArchived: baris.isArchived,
    pemilik: pemilik ?? null,
  };
}

// GET /api/admin/berkas-dosen/monitoring � Rekap kelengkapan berkas SELURUH dosen
//
// Berbeda dari `GET /api/berkas-dosen/list` yang hanya mengembalikan baris
// berkas, endpoint ini berangkat dari tabel pengguna berperan DOSEN. Dengan
// begitu dosen yang belum mengunggah apa pun tetap muncul pada daftar, karena
// justru merekalah yang perlu ditindaklanjuti.
app.get(
  "/api/admin/berkas-dosen/monitoring",
  authenticateToken,
  requirePermission("berkas_dosen:view"),
  async (_req: AuthRequest, res: Response) => {
    try {
      const [tipeAktif, dosenList] = await Promise.all([
        prisma.dosenBerkasTipe.findMany({
          where: { isActive: true },
          orderBy: { urutan: "asc" },
          select: { id: true, kode: true, nama: true, isRequired: true },
        }),
        prisma.user.findMany({
          where: {
            isActive: true,
            roles: { some: { role: { code: "DOSEN" } } },
          },
          orderBy: { nama: "asc" },
          select: {
            ...PILIH_PROFIL_PEMILIK,
            berkas: {
              where: { isArchived: false },
              orderBy: { uploadedAt: "desc" },
              select: {
                id: true,
                namaFile: true,
                nomorDokumen: true,
                tahunSK: true,
                keterangan: true,
                fileUrl: true,
                fileSize: true,
                uploadedAt: true,
                isArchived: true,
                tipe: { select: { kode: true, nama: true } },
              },
            },
          },
        }),
      ]);

      const totalTipe = tipeAktif.length;
      const tipeWajib = tipeAktif.filter((tipe) => tipe.isRequired);

      const data = dosenList.map((dosen) => {
        const berkas = dosen.berkas.map((baris) => bentukBerkas(baris, baris.tipe, null));

        // Satu jenis berkas dapat diunggah lebih dari sekali (mis. perpanjangan
        // SK). Kelengkapan dihitung per JENIS, bukan per baris, agar angka tidak
        // melebihi jumlah jenis berkas yang tersedia.
        const kodeTerisi = new Set(berkas.map((b) => b.tipeKode));
        const jenisBelumDiunggah = tipeAktif
          .filter((tipe) => !kodeTerisi.has(tipe.kode))
          .map((tipe) => ({ kode: tipe.kode, nama: tipe.nama, isRequired: tipe.isRequired }));

        const wajibTerpenuhi = tipeWajib.filter((tipe) => kodeTerisi.has(tipe.kode)).length;

        return {
          ...dosen,
          berkas,
          totalJenisBerkas: totalTipe,
          totalBerkasTerunggah: kodeTerisi.size,
          totalBarisBerkas: berkas.length,
          totalTipeWajib: tipeWajib.length,
          wajibTerpenuhi,
          wajibLengkap: tipeWajib.every((tipe) => kodeTerisi.has(tipe.kode)),
          sudahMengunggah: kodeTerisi.size > 0,
          jenisBelumDiunggah,
        };
      });

      const sudahMengunggah = data.filter((dosen) => dosen.sudahMengunggah).length;

      res.json({
        status: true,
        data,
        meta: {
          totalDosen: data.length,
          sudahMengunggah,
          belumMengunggah: data.length - sudahMengunggah,
          totalTipeBerkas: totalTipe,
          totalTipeWajib: tipeWajib.length,
          tipeBerkas: tipeAktif,
        },
      });
    } catch (error: any) {
      logServerError("GET /api/admin/berkas-dosen/monitoring", error);
      res.status(500).json({ status: false, message: "Gagal memuat rekap berkas dosen." });
    }
  }
);

// GET /api/berkas-dosen/tipe � Master 14 jenis berkas + status kelengkapan milik sendiri
app.get("/api/berkas-dosen/tipe", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tipeList = await prisma.dosenBerkasTipe.findMany({
      where: { isActive: true },
      orderBy: { urutan: "asc" },
      select: { id: true, kode: true, nama: true, deskripsi: true, urutan: true, isRequired: true },
    });

    const berkasMilik = await prisma.dosenBerkas.findMany({
      where: { userId: req.user!.id, isArchived: false },
      select: { tipeId: true },
    });

    const terisi = new Set(berkasMilik.map((b) => b.tipeId));

    res.json({
      status: true,
      data: tipeList.map((tipe) => ({
        ...tipe,
        sudahDiunggah: terisi.has(tipe.id),
      })),
    });
  } catch (error: any) {
    logServerError("GET /api/berkas-dosen/tipe", error);
    res.status(500).json({ status: false, message: "Gagal memuat jenis berkas." });
  }
});

// GET /api/berkas-dosen/list � Daftar berkas (milik sendiri, atau seluruh dosen untuk pengelola)
app.get("/api/berkas-dosen/list", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const peran = await peranBerkasPengguna(req.user!.id);

    // Parameter `userId` hanya dihormati untuk pengelola. Bila dosen mengirim
    // userId dosen lain, filternya diabaikan dan tetap dibatasi ke id sendiri.
    const dimintaUserId = Number.parseInt(String(req.query.userId ?? ""), 10);
    const filterUserId =
      peran === "pengelola" && Number.isInteger(dimintaUserId) && dimintaUserId > 0
        ? dimintaUserId
        : req.user!.id;

    const daftar = await prisma.dosenBerkas.findMany({
      where: {
        userId: filterUserId,
        isArchived: false,
      },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        namaFile: true,
        nomorDokumen: true,
        tahunSK: true,
        keterangan: true,
        fileUrl: true,
        fileSize: true,
        uploadedAt: true,
        isArchived: true,
        tipe: { select: { kode: true, nama: true } },
        // Relasi pemilik hanya relevan bagi pengelola; dosen sudah tahu ini
        // berkasnya sendiri sehingga namanya tidak perlu dikirim ulang.
        ...(peran === "pengelola" ? { user: { select: PILIH_PROFIL_PEMILIK } } : {}),
      },
    });

    res.json({
      status: true,
      data: daftar.map((baris) =>
        bentukBerkas(
          baris,
          baris.tipe,
          peran === "pengelola" && "user" in baris ? baris.user : null
        )
      ),
      meta: { peran },
    });
  } catch (error: any) {
    logServerError("GET /api/berkas-dosen/list", error);
    res.status(500).json({ status: false, message: "Gagal memuat daftar berkas." });
  }
});

// POST /api/berkas-dosen/upload � Unggah satu berkas PDF (multipart/form-data)
app.post(
  "/api/berkas-dosen/upload",
  authenticateToken,
  requirePermission("berkas_dosen:upload"),
  writeLimiter,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    unggahBerkasPdf(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }

      const multerErr = err as { code?: string; message?: string };
      if (multerErr.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          status: false,
          message: `Ukuran berkas melebihi batas ${MAKS_UKURAN_BERKAS / (1024 * 1024)} MB.`,
        });
        return;
      }
      if (multerErr.code === "LIMIT_UNEXPECTED_FILE" || multerErr.code === "LIMIT_FILE_COUNT") {
        res.status(400).json({ status: false, message: "Hanya satu berkas yang boleh diunggah." });
        return;
      }
      if (multerErr.message === "Hanya berkas PDF yang diizinkan.") {
        res.status(400).json({ status: false, message: multerErr.message });
        return;
      }

      logServerError("POST /api/berkas-dosen/upload (multer)", err);
      res.status(400).json({ status: false, message: "Berkas tidak dapat diproses." });
    });
  },
  async (req: AuthRequest, res: Response) => {
    const berkas = req.file;
    const hapusBerkasBaru = () => {
      if (berkas) hapusBerkasFisik(berkas.filename);
    };

    try {
      if (!berkas) {
        return res.status(400).json({ status: false, message: "Berkas PDF wajib dilampirkan." });
      }

      // Signature diperiksa dari isi berkas yang sudah tersimpan, karena
      // `mimetype` dapat dipalsukan klien. Berkas yang gagal validasi langsung
      // dibuang agar tidak menumpuk di disk.
      const isi = await fs.promises.readFile(berkas.path);
      if (!berkasBerisiPdf(isi)) {
        hapusBerkasBaru();
        return res.status(400).json({ status: false, message: "Berkas bukan PDF yang sah." });
      }

      const tipeId = Number.parseInt(String(req.body?.tipeId ?? ""), 10);
      if (!Number.isInteger(tipeId) || tipeId <= 0) {
        hapusBerkasBaru();
        return res.status(400).json({ status: false, message: "Jenis berkas tidak valid." });
      }

      const tipe = await prisma.dosenBerkasTipe.findFirst({
        where: { id: tipeId, isActive: true },
        select: { id: true, nama: true },
      });
      if (!tipe) {
        hapusBerkasBaru();
        return res.status(404).json({ status: false, message: "Jenis berkas tidak ditemukan." });
      }

      const teks = (nilai: unknown, maks: number): string | null => {
        if (typeof nilai !== "string") return null;
        const bersih = nilai.trim();
        return bersih === "" ? null : bersih.slice(0, maks);
      };

      const namaFile = teks(req.body?.namaFile, 255);
      if (!namaFile) {
        hapusBerkasBaru();
        return res.status(400).json({ status: false, message: "Nama dokumen wajib diisi." });
      }

      const tahunSK = teks(req.body?.tahunSK, 4);
      if (tahunSK && !/^\d{4}$/.test(tahunSK)) {
        hapusBerkasBaru();
        return res.status(400).json({ status: false, message: "Tahun SK harus berupa 4 angka." });
      }

      const fileUrl = `${PREFIX_URL_BERKAS}/${berkas.filename}`;
      const userId = req.user!.id;

      const tersimpan = await prisma.dosenBerkas.create({
        data: {
          userId,
          tipeId: tipe.id,
          namaFile,
          nomorDokumen: teks(req.body?.nomorDokumen, 100),
          tahunSK,
          keterangan: teks(req.body?.keterangan, 5000),
          fileUrl,
          fileSize: berkas.size,
          mimeType: MIME_PDF,
          uploadedBy: userId,
        },
        select: { id: true, namaFile: true, uploadedAt: true },
      });

      res.status(201).json({
        status: true,
        message: `Berkas "${tipe.nama}" berhasil diunggah dan menunggu verifikasi.`,
        data: tersimpan,
      });
    } catch (error: any) {
      hapusBerkasBaru();
      logServerError("POST /api/berkas-dosen/upload", error);
      res.status(500).json({ status: false, message: "Gagal menyimpan berkas." });
    }
  }
);

// GET /api/berkas-dosen/file/:nama � Unduh / pratinjau berkas (pemilik atau pengelola)
app.get("/api/berkas-dosen/file/:nama", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const nama = String(req.params.nama ?? "");
    const namaBerkas = namaBerkasDariUrl(`${PREFIX_URL_BERKAS}/${nama}`);

    if (!namaBerkas) {
      return res.status(400).json({ status: false, message: "Permintaan berkas tidak valid." });
    }

    const baris = await prisma.dosenBerkas.findFirst({
      where: { fileUrl: `${PREFIX_URL_BERKAS}/${namaBerkas}` },
      select: { userId: true, namaFile: true },
    });

    if (!baris) {
      return res.status(404).json({ status: false, message: "Berkas tidak ditemukan." });
    }

    const peran = await peranBerkasPengguna(req.user!.id);
    if (peran !== "pengelola" && baris.userId !== req.user!.id) {
      return res.status(403).json({ status: false, message: "Anda tidak berhak membuka berkas ini." });
    }

    const lokasi = path.resolve(direktoriBerkasDosen(), namaBerkas);
    if (path.dirname(lokasi) !== direktoriBerkasDosen()) {
      return res.status(400).json({ status: false, message: "Permintaan berkas tidak valid." });
    }

    if (!fs.existsSync(lokasi)) {
      return res.status(404).json({ status: false, message: "Berkas tidak ditemukan di penyimpanan." });
    }

    // `inline` agar bisa dipratinjau di tab baru; nama unduhan diambil dari
    // nama dokumen yang diisi dosen, bukan nama acak di disk.
    const namaUnduhan = baris.namaFile.replace(/[^\w\s().-]/g, "").trim() || "berkas-dosen";
    res.setHeader("Content-Type", MIME_PDF);
    res.setHeader("Content-Disposition", `inline; filename="${namaUnduhan}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    fs.createReadStream(lokasi).pipe(res);
  } catch (error: any) {
    logServerError("GET /api/berkas-dosen/file/:nama", error);
    res.status(500).json({ status: false, message: "Gagal membuka berkas." });
  }
});

// DELETE /api/berkas-dosen/:id � Arsipkan berkas (pemilik atau pengelola)
app.delete("/api/berkas-dosen/:id", authenticateToken, writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID berkas tidak valid." });
    }

    const baris = await prisma.dosenBerkas.findFirst({
      where: { id, isArchived: false },
      select: { id: true, userId: true, namaFile: true },
    });

    if (!baris) {
      return res.status(404).json({ status: false, message: "Berkas tidak ditemukan." });
    }

    const peran = await peranBerkasPengguna(req.user!.id);
    if (peran !== "pengelola" && baris.userId !== req.user!.id) {
      return res.status(403).json({ status: false, message: "Anda tidak berhak menghapus berkas ini." });
    }

    // Penghapusan bersifat arsip: baris tetap ada untuk jejak audit, sedangkan
    // daftar dan pencarian tidak lagi menampilkannya.
    await prisma.dosenBerkas.update({
      where: { id: baris.id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    res.json({ status: true, message: `Berkas "${baris.namaFile}" berhasil dihapus.` });
  } catch (error: any) {
    logServerError("DELETE /api/berkas-dosen/:id", error);
    res.status(500).json({ status: false, message: "Gagal menghapus berkas." });
  }
});

// GET /api/applications/catalog (Katalog publik: hanya aplikasi yang benar-benar
// terhubung ke registry SSO ONE UNUSU. Tidak memuat clientKey/callback internal.)
app.get("/api/applications/catalog", async (req: Request, res: Response) => {
  try {
    const apps = await prisma.ssoApp.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { nameApp: "asc" }],
      select: {
        id: true,
        clientId: true,
        nameApp: true,
        description: true,
        badge: true,
        icon: true,
        urlRedirect: true,
        targetRoles: true,
      },
    });

    const data = apps.map((app) => {
      // Hanya origin yang dibuka ke publik agar alamat callback tidak bocor.
      let origin = "";
      try {
        origin = new URL(app.urlRedirect).origin;
      } catch {
        origin = "";
      }

      // Tingkat akses dibaca dari `targetRoles` registry aplikasi. Sebelumnya
      // nilai ini diturunkan dari izin `<clientId>:masuk_*` yang sudah dihapus,
      // sehingga regex-nya tidak pernah cocok dan katalog selalu kosong.
      const tingkatApp = tingkatDiterimaAplikasi(parseTargetRoles(app.targetRoles));

      return {
        id: app.id,
        clientId: app.clientId,
        name: app.nameApp,
        description: app.description,
        badge: app.badge,
        icon: app.icon,
        tingkatMasuk: TINGKAT_MASUK.filter((tingkat: TingkatMasuk) => tingkatApp.includes(tingkat)),
        origin,
      };
    });

    res.json({ status: true, data });
  } catch (error: any) {
    logServerError("GET /api/applications/catalog", error);
    res.status(500).json({ status: false, message: "Gagal memuat katalog aplikasi SSO." });
  }
});


// GET /api/academic/hierarchy (Hierarki Fakultas & Prodi untuk registrasi/tambah akun)
app.get("/api/academic/hierarchy", async (req: Request, res: Response) => {
  try {
    const prodiBase = process.env.PRODI_BASE_URL || "http://localhost:5010";
    let prodiApiUrl = prodiBase;
    // Jika PRODI_BASE_URL mengarah ke port Vite 5180, coba ke port API 5010 atau langsung ke prodiBase
    if (prodiApiUrl.includes(":5180")) {
      prodiApiUrl = prodiApiUrl.replace(":5180", ":5010");
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const upstreamRes = await fetch(`${prodiApiUrl}/api/v1/public/academic-hierarchy`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (upstreamRes.ok) {
        const json = await upstreamRes.json() as { success?: boolean; faculties?: any[] };
        if (json.success && Array.isArray(json.faculties) && json.faculties.length > 0) {
          return res.json({ status: true, data: json.faculties });
        }
      }
    } catch {
      // Upstream prodi-unusu sedang tidak aktif/timeout, gunakan data statis standar
    }

    // Fallback data statis akademik UNUSU
    const staticHierarchy = [
      {
        id: 1,
        code: "FIK",
        name: "Fakultas Ilmu Komputer",
        studyPrograms: [
          { id: 1, code: "TIF", name: "Teknik Informatika", degree: "S1" },
          { id: 2, code: "SIN", name: "Sistem Informasi", degree: "S1" },
          { id: 3, code: "IKO", name: "Ilmu Komputer", degree: "S1" },
        ],
      },
      {
        id: 2,
        code: "FIP",
        name: "Fakultas Ilmu Pendidikan",
        studyPrograms: [
          { id: 4, code: "PGSD", name: "Pendidikan Guru Sekolah Dasar", degree: "S1" },
          { id: 5, code: "PGPAUD", name: "Pendidikan Guru PAUD", degree: "S1" },
          { id: 6, code: "PBI", name: "Pendidikan Bahasa Inggris", degree: "S1" },
        ],
      },
      {
        id: 3,
        code: "FE",
        name: "Fakultas Ekonomi",
        studyPrograms: [
          { id: 7, code: "MNJ", name: "Manajemen", degree: "S1" },
          { id: 8, code: "AKT", name: "Akuntansi", degree: "S1" },
          { id: 9, code: "EKO", name: "Ekonomi Pembangunan", degree: "S1" },
        ],
      },
      {
        id: 4,
        code: "FP",
        name: "Fakultas Pertanian",
        studyPrograms: [
          { id: 10, code: "AGT", name: "Agroteknologi", degree: "S1" },
          { id: 11, code: "AGB", name: "Agribisnis", degree: "S1" },
        ],
      },
      {
        id: 5,
        code: "FIKES",
        name: "Fakultas Ilmu Kesehatan",
        studyPrograms: [
          { id: 12, code: "KMS", name: "Kesehatan Masyarakat", degree: "S1" },
          { id: 13, code: "GZI", name: "Gizi", degree: "S1" },
        ],
      },
      {
        id: 6,
        code: "FAI",
        name: "Fakultas Agama Islam",
        studyPrograms: [
          { id: 14, code: "PAI", name: "Pendidikan Agama Islam", degree: "S1" },
          { id: 15, code: "HES", name: "Hukum Ekonomi Syariah", degree: "S1" },
        ],
      },
    ];

    res.json({ status: true, data: staticHierarchy });
  } catch (error: any) {
    logServerError("GET /api/academic/hierarchy", error);
    res.status(500).json({ status: false, message: "Gagal memuat hierarki akademik." });
  }
});

// GET /api/v1/inter-service/dosen (Katalog API Hub: Data Induk Dosen & Homebase)
app.get("/api/v1/inter-service/dosen", async (req: Request, res: Response) => {
  try {
    const prodi = typeof req.query.prodi === "string" ? req.query.prodi.trim() : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;

    const where: any = {
      isActive: true,
      roles: {
        some: {
          role: {
            code: "DOSEN",
          },
        },
      },
    };

    if (prodi) {
      where.prodi = { contains: prodi };
    }

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { nidn: { contains: search } },
        { username: { contains: search } },
      ];
    }

    const lecturers = await prisma.user.findMany({
      where,
      orderBy: { nama: "asc" },
      select: {
        id: true,
        nama: true,
        nidn: true,
        email: true,
        prodi: true,
        fakultas: true,
        avatar: true,
        gelarDepan: true,
        gelarBelakang: true,
        jabatanAkademik: true,
        pendidikanTerakhir: true,
        isActive: true,
      },
    });

    const formatted = lecturers.map((d) => {
      const gelarDepan = d.gelarDepan ? `${d.gelarDepan.trim()} ` : "";
      const gelarBelakang = d.gelarBelakang ? `, ${d.gelarBelakang.trim()}` : "";
      const namaLengkap = d.nama?.includes(",") || d.gelarDepan || d.gelarBelakang
        ? `${gelarDepan}${d.nama ?? ""}${gelarBelakang}`.trim()
        : d.nama;

      return {
        id: d.id,
        name: namaLengkap || d.nama || "Tanpa Nama",
        nidn: d.nidn || null,
        email: d.email || null,
        studyProgramName: d.prodi || null,
        facultyName: d.fakultas || null,
        academicRank: d.jabatanAkademik || null,
        education: d.pendidikanTerakhir || null,
        photoUrl: d.avatar || null,
        isActive: d.isActive,
      };
    });

    res.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    logServerError("GET /api/v1/inter-service/dosen", error);
    res.status(500).json({ success: false, message: "Gagal memuat data dosen dari sistem induk." });
  }
});

// =============================================================================
// ARSIP DOKUMEN LPM & LPPM (proxy baca-saja untuk Integrasi & API Hub)
// =============================================================================

/**
 * Menerbitkan token layanan untuk membaca arsip dokumen di aplikasi sumber.
 *
 * Endpoint `POST /api/v2/website/dokumen` dipanggil server-ke-server tanpa sesi
 * pengguna. Aplikasi sumber tetap menuntut `Authorization: Bearer <token>`,
 * sehingga portal menerbitkan token bertanda tangan dengan identitas aplikasi
 * cabang pemanggil. Nilainya deterministik per `clientId` + rahasia portal agar
 * token tidak berubah-ubah dan tidak perlu disimpan.
 *
 * Token TIDAK memberi hak lain: cakupannya hanya `dokumen:view` pada arsip,
 * tidak memiliki peran administrator, dan tidak pernah dikirim ke klien.
 */
const terbitkanTokenLayananArsip = (clientId: string): string => {
  const secret = process.env.ARSIP_SERVICE_TOKEN_SECRET || "";
  if (!secret) {
    throw new Error("ARSIP_SERVICE_TOKEN_SECRET belum dikonfigurasi di portal.");
  }
  const tanda = crypto
    .createHmac("sha256", secret)
    .update(`arsip-dokumen|${clientId}`)
    .digest("hex");
  return `arsip.${clientId}.${tanda}`;
};

/**
 * Mengambil arsip dokumen dari satu aplikasi cabang (LPM atau LPPM).
 * Token sesi pengguna diteruskan apa adanya agar aplikasi tujuan tetap
 * menegakkan otorisasi berbasis izinnya sendiri; endpoint ini hanya membaca.
 */
const ambilDokumenAplikasi = async (
  baseUrl: string,
  label: string,
  query: Record<string, string | undefined>,
  token: string
): Promise<{ ok: boolean; statusCode?: number; message?: string; data: any[] }> => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const url = `${baseUrl.replace(/\/$/, "")}/api/dokumen${params.toString() ? `?${params}` : ""}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const upstreamRes = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    clearTimeout(timeoutId);

    const json = (await upstreamRes.json().catch(() => null)) as
      | { success?: boolean; data?: any[]; message?: string }
      | null;

    if (!upstreamRes.ok || !json?.success) {
      return {
        ok: false,
        statusCode: upstreamRes.status,
        message: json?.message || `Aplikasi ${label} menolak permintaan (HTTP ${upstreamRes.status}).`,
        data: [],
      };
    }

    const rows = Array.isArray(json.data) ? json.data : [];
    return {
      ok: true,
      statusCode: upstreamRes.status,
      data: rows.map((row) => ({
        ...row,
        tautanArsip: `${baseUrl.replace(/\/$/, "")}/admin/arsip-dokumen`,
      })),
    };
  } catch (error: any) {
    return {
      ok: false,
      statusCode: 0,
      message: error?.name === "AbortError"
        ? `Aplikasi ${label} tidak merespons (timeout).`
        : `Gagal menghubungi aplikasi ${label}: ${error?.message ?? "kesalahan jaringan"}`,
      data: [],
    };
  }
};

// POST /api/v2/website/dokumen
//
// Proxy arsip dokumen LPM/LPPM untuk aplikasi cabang (server-to-server).
// Aplikasi cabang tidak memiliki sesi pengguna di portal ini, sehingga
// otorisasi memakai kredensial aplikasi (`client_id` + `client_key`) yang
// terdaftar pada tabel `sso_apps` � pola yang sama dengan `verify-token`.
// Endpoint ini hanya membaca; tidak pernah menulis ke LPM/LPPM.
app.post(
  "/api/v2/website/dokumen",
  serverToServerLimiter,
  async (req: Request, res: Response) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const client_id = body.client_id;
      const client_key = body.client_key;

      if (
        typeof client_id !== "string" ||
        typeof client_key !== "string" ||
        !client_id ||
        !client_key ||
        client_id.length > 100 ||
        client_key.length > 200
      ) {
        return res.status(422).json({
          status: false,
          message: "Parameter tidak lengkap. client_id dan client_key wajib disertakan.",
        });
      }

      const ssoApp = await prisma.ssoApp.findFirst({
        where: { clientId: client_id, clientKey: client_key, isActive: true },
      });

      if (!ssoApp) {
        return res.status(401).json({
          status: false,
          message: "Kredensial aplikasi cabang tidak valid atau belum terdaftar.",
        });
      }

      const sumber = String(body.sumber ?? "").toLowerCase();
      if (sumber !== "lpm" && sumber !== "lppm") {
        return res.status(422).json({
          status: false,
          message: "Parameter `sumber` wajib bernilai `lpm` atau `lppm`.",
        });
      }

      const prodiCode = typeof body.prodiCode === "string" && body.prodiCode.trim()
        ? body.prodiCode.trim().slice(0, 20)
        : undefined;

      // Arsip yang boleh dibaca aplikasi cabang hanya arsip yang memang
      // ditujukan ke program studi. Arsip internal LPM/LPPM tidak diteruskan.
      const tujuanPublish = body.tujuanPublish === "lpm" || body.tujuanPublish === "lppm"
        ? String(body.tujuanPublish)
        : "prodi";

      const baseUrl = sumber === "lpm"
        ? process.env.LPM_BASE_URL || "http://localhost:5004"
        : process.env.LPPM_BASE_URL || "http://localhost:5005";

      // Token layanan untuk membaca arsip di aplikasi sumber.
      //
      // Permintaan ini tidak membawa sesi pengguna, sehingga identitas yang
      // tersedia hanyalah aplikasi cabang pemanggil. Token diturunkan dari
      // `clientId`/`clientKey` yang SUDAH diverifikasi di atas, bukan dari
      // masukan mentah pemanggil, dan diberi cakupan baca arsip saja.
      const tokenLayanan = terbitkanTokenLayananArsip(ssoApp.clientId);

      const hasil = await ambilDokumenAplikasi(
        baseUrl,
        sumber.toUpperCase(),
        {
          skip: body.skip !== undefined ? String(body.skip) : undefined,
          take: body.take !== undefined ? String(body.take) : "50",
          search: typeof body.search === "string" ? body.search.slice(0, 120) : undefined,
          status: typeof body.status === "string" ? body.status.slice(0, 40) : undefined,
          tahun: body.tahun !== undefined ? String(body.tahun) : undefined,
          tujuanPublish,
          prodiCode,
        },
        tokenLayanan
      );

      if (!hasil.ok) {
        return res.status(502).json({
          status: false,
          message: hasil.message || `Arsip dokumen ${sumber.toUpperCase()} tidak dapat dibaca.`,
          data: [],
        });
      }

      return res.json({
        status: true,
        app: sumber,
        data: hasil.data,
        meta: { total: hasil.data.length },
      });
    } catch (error: any) {
      logServerError("POST /api/v2/website/dokumen", error);
      return res.status(500).json({
        status: false,
        message: "Gagal membaca arsip dokumen.",
        data: [],
      });
    }
  }
);

// ==========================================
// 5b. API GATEWAY BERBASIS API KEY (aplikasi cabang)
// ==========================================
//
// Bagian ini adalah penegakan nyata atas katalog yang diatur di /admin/api-hub.
// Sebelumnya `api_keys` hanya menjadi dokumentasi: belum ada satu pun endpoint
// yang benar-benar memeriksa key. Di sini key diperiksa, dibatasi ke endpoint
// yang dicentang saat key dibuat, lalu pemakaiannya dicatat pada `api_usage_logs`.
//
// Identitas pemanggil adalah APLIKASI, bukan pengguna. Tidak ada sesi pengguna
// di jalur ini, sehingga `authenticateToken` tidak dipakai.

interface ApiKeyTerverifikasi {
  id: number;
  appId: number;
  name: string;
  app: { id: number; clientId: string; nameApp: string };
  endpointId: number | null;
}

/** Mencatat satu pemakaian key. Kegagalan mencatat log tidak membatalkan respons. */
async function catatPemakaianApi(params: {
  keyId: number;
  endpoint: string;
  method: string;
  statusCode: number;
  mulai: number;
  req: Request;
  galat?: string;
}): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.apiKey.update({
        where: { id: params.keyId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
          lastUsedIp: (params.req.ip ?? "").slice(0, 45) || null,
        },
      }),
      prisma.apiUsageLog.create({
        data: {
          keyId: params.keyId,
          endpoint: params.endpoint.slice(0, 255),
          method: params.method.slice(0, 10),
          statusCode: params.statusCode,
          responseTime: Math.max(0, Date.now() - params.mulai),
          requestIp: (params.req.ip ?? "").slice(0, 45) || null,
          userAgent: String(params.req.headers["user-agent"] ?? "").slice(0, 255) || null,
          errorMessage: params.galat ? params.galat.slice(0, 500) : null,
        },
      }),
    ]);
  } catch (error: any) {
    // Pencatatan gagal tidak boleh menggagalkan permintaan yang sudah sah.
    console.error("Gagal mencatat pemakaian API key:", error?.message);
  }
}

/**
 * Middleware penjaga endpoint yang dipanggil aplikasi cabang.
 *
 * Menerima header `Authorization: Bearer unusu_sec_...` maupun
 * `X-API-Key: unusu_sec_...`. Key harus aktif (tidak dicabut) dan endpoint yang
 * sedang dipanggil harus termasuk dalam `allowedEndpoints` key tersebut.
 *
 * `endpointWajib` diisi alamat endpoint pada katalog (`api_endpoints.endpoint`),
 * mis. "/api/v2/website/users". Bila endpoint itu belum terdaftar di katalog,
 * key dengan `allowedEndpoints = null` (semua endpoint) tetap boleh lewat,
 * sedangkan key yang dibatasi daftar akan ditolak � supaya penambahan endpoint
 * baru tidak perlu mengubah key yang sudah ada.
 */
const wajibApiKey = (endpointWajib: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const mulai = Date.now();
    let keyIdUntukLog: number | null = null;

    const tolak = async (status: number, pesan: string, galat?: string) => {
      if (keyIdUntukLog !== null) {
        await catatPemakaianApi({
          keyId: keyIdUntukLog,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: status,
          mulai,
          req,
          galat: galat ?? pesan,
        });
      }
      return res.status(status).json({ status: false, message: pesan });
    };

    try {
      const headerAuth = String(req.headers.authorization ?? "");
      const headerKey = String(req.headers["x-api-key"] ?? "");
      const key = headerAuth.startsWith("Bearer ")
        ? headerAuth.slice(7).trim()
        : headerKey.trim();

      if (!key) {
        return res.status(401).json({
          status: false,
          message: "API key wajib disertakan pada header Authorization: Bearer <key> atau X-API-Key.",
        });
      }

      if (key.length > 255) {
        return res.status(401).json({ status: false, message: "API key tidak valid." });
      }

      const found = await prisma.apiKey.findUnique({
        where: { key },
        include: { app: { select: { id: true, clientId: true, nameApp: true, isActive: true } } },
      });

      if (!found) {
        return res.status(401).json({ status: false, message: "API key tidak dikenali." });
      }

      keyIdUntukLog = found.id;

      if (found.revoked) {
        return tolak(401, "API key ini sudah dicabut.", "revoked");
      }
      if (!found.isActive) {
        return tolak(401, "API key ini tidak aktif.", "inactive");
      }
      if (!found.app.isActive) {
        return tolak(403, `Aplikasi pemilik key (${found.app.nameApp}) sedang nonaktif.`, "app-inactive");
      }

      const katalog = await prisma.apiEndpoint.findUnique({
        where: { endpoint: endpointWajib },
        select: { id: true, isActive: true },
      });

      if (katalog && !katalog.isActive) {
        return tolak(403, "Endpoint ini sedang dinonaktifkan pada katalog API Hub.", "endpoint-inactive");
      }

      // Batas cakupan: key dengan daftar eksplisit hanya boleh memanggil yang ada
      // di daftar itu. Key tanpa daftar (`null`) boleh memanggil semua endpoint
      // aktif yang memang dijaga endpoint ini.
      if (found.allowedEndpoints && katalog) {
        let daftarId: number[] = [];
        try {
          const parsed = JSON.parse(found.allowedEndpoints);
          if (Array.isArray(parsed)) daftarId = parsed.map((n) => Number(n));
        } catch {
          daftarId = [];
        }
        if (!daftarId.includes(katalog.id)) {
          return tolak(
            403,
            `API key ini tidak berizin memanggil ${endpointWajib}.`,
            "endpoint-not-allowed"
          );
        }
      }

      const terverifikasi: ApiKeyTerverifikasi = {
        id: found.id,
        appId: found.appId,
        name: found.name,
        app: { id: found.app.id, clientId: found.app.clientId, nameApp: found.app.nameApp },
        endpointId: katalog?.id ?? null,
      };
      (req as AuthRequest & { apiKey?: ApiKeyTerverifikasi }).apiKey = terverifikasi;

      // Catat setelah respons selesai supaya statusCode akhir yang tercatat benar.
      res.on("finish", () => {
        void catatPemakaianApi({
          keyId: found.id,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          mulai,
          req,
        });
      });

      next();
    } catch (error: any) {
      logServerError(`wajibApiKey ${endpointWajib}`, error);
      return res.status(500).json({ status: false, message: "Gagal memverifikasi API key." });
    }
  };
};

/**
 * POST /api/v2/website/users
 *
 * Pencarian pengguna direktori kampus untuk aplikasi cabang (server-to-server).
 * Dipakai LPM/LPPM/Prodi/BAKSI/BAKSA agar Admin aplikasi tidak perlu mengetik
 * pengguna secara manual — cukup memilih orang yang memang sudah ada.
 *
 * Mendukung empat cara pakai:
 *
 * 1. **Kotak pencarian** — `search` minimal 2 karakter, mencari pada nama,
 *    username, NIDN, NIP, NIM, dan email.
 * 2. **Filter** — `role`, `fakultas`, dan `prodi` menyaring hasil. Ini yang
 *    dipakai tabel "Tambah Pengguna" agar admin bisa menelusuri peran dan
 *    program studi tanpa harus mengetik nama.
 * 3. **Penelusuran awal** — tanpa `search` sama sekali, endpoint tetap menjawab
 *    (maksimal 20 baris) supaya tabel langsung terisi begitu halaman dibuka.
 *    Sebelumnya ini ditolak 422 dan tabel tampak kosong sampai admin mengetik.
 * 4. **Berdasarkan ID** — `ids` berisi 1–50 angka ID valid, tanpa filter lain;
 *    mengembalikan akun aktif maupun nonaktif beserta ID yang tidak ditemukan.
 *
 * Yang dikembalikan hanya data pengenalan diri. Izin, kata sandi, NIK, dan
 * tanggal lahir sengaja TIDAK dikirim: aplikasi cabang tidak berhak
 * mengetahuinya dan tidak membutuhkannya untuk memilih pengguna. `role` hanya
 * dikirim sebagai label supaya admin tahu siapa dosen dan siapa mahasiswa.
 */
const BATAS_MAKS_USERS_API = 20;

const tanganiDirektoriPengguna = async (req: AuthRequest, res: Response) => {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const validasi = validasiIdsPengguna(body);
      if (validasi.error) {
        return res.status(422).json({ status: false, message: validasi.error });
      }
      const daftarId = validasi.ids;
      const search = typeof body.search === "string" ? body.search.trim() : "";
      const filterRole = typeof body.role === "string" ? body.role.trim().toUpperCase() : "";
      const filterFakultas = typeof body.fakultas === "string" ? body.fakultas.trim() : "";
      const filterProdi = typeof body.prodi === "string" ? body.prodi.trim() : "";

      if (search.length === 1) {
        return res.status(422).json({
          status: false,
          message: "Parameter `search` minimal 2 karakter bila diisi.",
        });
      }
      if (search.length > 100) {
        return res.status(422).json({
          status: false,
          message: "Parameter `search` maksimal 100 karakter.",
        });
      }

      const limitDiminta = Number(body.limit);
      const limit = Number.isInteger(limitDiminta)
        ? Math.min(Math.max(limitDiminta, 1), BATAS_MAKS_USERS_API)
        : BATAS_MAKS_USERS_API;

      // Syarat disusun bertingkat; setiap filter hanya ikut bila benar-benar diisi.
      const syarat: Prisma.UserWhereInput[] = [{ isActive: true }];

      if (search.length >= 2) {
        syarat.push({
          OR: [
            { nama: { contains: search } },
            { username: { contains: search } },
            { nidn: { contains: search } },
            { nip: { contains: search } },
            { nim: { contains: search } },
            { email: { contains: search } },
          ],
        });
      }

      if (filterFakultas) syarat.push({ fakultas: filterFakultas });
      if (filterProdi) syarat.push({ prodi: filterProdi });

      if (filterRole) {
        syarat.push({ roles: { some: { role: { code: filterRole } } } });
      }

      const where: Prisma.UserWhereInput = daftarId
        ? { id: { in: daftarId } }
        : { AND: syarat };

      const rows = await prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nama: true,
          email: true,
          noHp: true,
          nim: true,
          nidn: true,
          nip: true,
          fakultas: true,
          prodi: true,
          jenisKelamin: true,
          avatar: true,
          isActive: true,
          roles: { select: { role: { select: { code: true } } } },
        },
        orderBy: { nama: "asc" },
        take: daftarId ? undefined : limit,
      });

      const data = rows.map((u) => {
        const kodePeran = u.roles.map((r) => r.role.code);
        return {
          id: u.id,
          username: u.username,
          nama: u.nama,
          email: u.email,
          noHp: u.noHp,
          nim: u.nim,
          nidn: u.nidn,
          nip: u.nip,
          fakultas: u.fakultas,
          prodi: u.prodi,
          jenisKelamin: u.jenisKelamin,
          avatar: u.avatar,
          isActive: u.isActive,
          role: kodePeran[0] ?? null,
          roles: kodePeran,
        };
      });

      return res.json({
        status: true,
        data,
        meta: daftarId ? {
          total: data.length,
          diminta: daftarId.length,
          tidakDitemukan: daftarId.filter((id) => !data.some((u) => u.id === id)),
        } : {
          total: data.length,
          limit,
          search,
          role: filterRole || null,
          fakultas: filterFakultas || null,
          prodi: filterProdi || null,
          // Menandakan hasil mungkin terpotong karena mencapai batas maksimum.
          terpotong: data.length >= limit,
        },
      });
    } catch (error: unknown) {
      logServerError(`POST ${req.path}`, error);
      return res.status(500).json({ status: false, message: "Gagal mencari pengguna." });
    }
};

app.post(
  "/api/v2/website/users",
  serverToServerLimiter,
  wajibApiKey("/api/v2/website/users"),
  tanganiDirektoriPengguna
);

/**
 * GET /api/v2/website/organisasi
 *
 * Daftar fakultas beserta program studi di dalamnya, untuk seluruh aplikasi
 * UNUSU. Aplikasi cabang cukup memanggil ONE UNUSU; mereka tidak perlu tahu
 * bahwa data aslinya dikelola Portal Prodi UNUSU.
 *
 * Sumber data satu-satunya adalah Portal Prodi (`POST /api/v1/public/organisasi`).
 * Bila Portal Prodi sedang mati, endpoint ini menjawab 503 dengan pesan yang
 * jelas — bukan daftar kosong yang menyesatkan pemanggil.
 *
 * Hasil disimpan di memori selama 5 menit karena data organisasi jarang
 * berubah, sementara endpoint ini dipanggil setiap kali halaman dibuka.
 */
const CACHE_ORGANISASI_MS = 5 * 60 * 1000;
let cacheOrganisasi: { diambilPada: number; isi: any } | null = null;

app.get(
  "/api/v2/website/organisasi",
  serverToServerLimiter,
  wajibApiKey("/api/v2/website/organisasi"),
  async (_req: AuthRequest, res: Response) => {
    const mulai = Date.now();
    try {
      if (cacheOrganisasi && mulai - cacheOrganisasi.diambilPada < CACHE_ORGANISASI_MS) {
        return res.json({ status: true, ...cacheOrganisasi.isi, meta: { ...cacheOrganisasi.isi.meta, cache: true } });
      }

      const baseProdi = (process.env.PRODI_BASE_URL || "http://localhost:5010").replace(/\/$/, "");
      const kunciProdi = (process.env.PRODI_API_KEY || "").trim();

      if (!kunciProdi) {
        return res.status(503).json({
          status: false,
          message: "PRODI_API_KEY belum dikonfigurasi pada server ONE UNUSU.",
        });
      }

      const pengendali = new AbortController();
      const batasWaktu = setTimeout(() => pengendali.abort(), 8000);

      let jawabanProdi: globalThis.Response;
      try {
        jawabanProdi = await fetch(`${baseProdi}/api/v1/public/organisasi`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${kunciProdi}`,
          },
          signal: pengendali.signal,
        });
      } finally {
        clearTimeout(batasWaktu);
      }

      if (!jawabanProdi.ok) {
        const teks = await jawabanProdi.text().catch(() => "");
        logServerError(
          "GET /api/v2/website/organisasi",
          new Error(`Portal Prodi menjawab ${jawabanProdi.status}: ${teks.slice(0, 200)}`)
        );
        return res.status(502).json({
          status: false,
          message: "Portal Prodi menolak permintaan data organisasi.",
        });
      }

      const isiProdi: any = await jawabanProdi.json();
      const isi = {
        data: Array.isArray(isiProdi?.data) ? isiProdi.data : [],
        meta: {
          totalFakultas: Number(isiProdi?.meta?.totalFakultas) || 0,
          totalProdi: Number(isiProdi?.meta?.totalProdi) || 0,
          sumber: "Portal Prodi UNUSU",
        },
      };

      cacheOrganisasi = { diambilPada: mulai, isi };
      return res.json({ status: true, ...isi, meta: { ...isi.meta, cache: false } });
    } catch (error: any) {
      const terputus = error?.name === "AbortError";
      logServerError("GET /api/v2/website/organisasi", error);
      return res.status(503).json({
        status: false,
        message: terputus
          ? "Portal Prodi tidak menjawab tepat waktu."
          : "Portal Prodi tidak dapat dihubungi.",
      });
    }
  }
);

// GET /api/inter-service/dokumen-lpm
app.get(
  "/api/inter-service/dokumen-lpm",
  authenticateToken,
  requireAnyPermission(["api_hub:view", "api_hub:menu"]),
  async (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const baseUrl = process.env.LPM_BASE_URL || "http://localhost:5004";

    const hasil = await ambilDokumenAplikasi(
      baseUrl,
      "LPM",
      {
        skip: req.query.skip as string | undefined,
        take: req.query.take as string | undefined,
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        tahun: req.query.tahun as string | undefined,
        tujuanPublish: req.query.tujuanPublish as string | undefined,
        prodiCode: req.query.prodiCode as string | undefined,
      },
      token
    );

    if (!hasil.ok) {
      // 401/403 dari aplikasi sumber berarti sesi pengguna tidak berlaku di
      // sana � diteruskan apa adanya; kegagalan jaringan menjadi 502.
      const kode = hasil.statusCode && [401, 403].includes(hasil.statusCode) ? hasil.statusCode : 502;
      return res.status(kode).json({ status: false, app: "lpm", message: hasil.message, data: [] });
    }
    res.json({ status: true, app: "lpm", data: hasil.data, meta: { total: hasil.data.length } });
  }
);

// GET /api/inter-service/dokumen-lppm
app.get(
  "/api/inter-service/dokumen-lppm",
  authenticateToken,
  requireAnyPermission(["api_hub:view", "api_hub:menu"]),
  async (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const baseUrl = process.env.LPPM_BASE_URL || "http://localhost:5005";

    const hasil = await ambilDokumenAplikasi(
      baseUrl,
      "LPPM",
      {
        skip: req.query.skip as string | undefined,
        take: req.query.take as string | undefined,
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        tahun: req.query.tahun as string | undefined,
        tujuanPublish: req.query.tujuanPublish as string | undefined,
        prodiCode: req.query.prodiCode as string | undefined,
      },
      token
    );

    if (!hasil.ok) {
      const kode = hasil.statusCode && [401, 403].includes(hasil.statusCode) ? hasil.statusCode : 502;
      return res.status(kode).json({ status: false, app: "lppm", message: hasil.message, data: [] });
    }
    res.json({ status: true, app: "lppm", data: hasil.data, meta: { total: hasil.data.length } });
  }
);

// GET /api/v1/inter-service/kurikulum-prodi
// Endpoint proxy API Hub untuk mengambil seluruh data kurikulum & mata kuliah lintas prodi
app.get("/api/v1/inter-service/kurikulum-prodi", async (req: Request, res: Response) => {
  try {
    const prodiBase = process.env.PRODI_BASE_URL || "http://localhost:5010";
    let prodiApiUrl = prodiBase;
    if (prodiApiUrl.includes(":5180")) {
      prodiApiUrl = prodiApiUrl.replace(":5180", ":5010");
    }

    const params = new URLSearchParams();
    if (typeof req.query.prodi === "string" && req.query.prodi.trim()) {
      params.set("prodi", req.query.prodi.trim());
    }
    if (typeof req.query.year === "string" && req.query.year.trim()) {
      params.set("year", req.query.year.trim());
    }
    if (typeof req.query.semester === "string" && req.query.semester.trim()) {
      params.set("semester", req.query.semester.trim());
    }
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      params.set("search", req.query.search.trim());
    }
    if (typeof req.query.isActive === "string" && req.query.isActive.trim()) {
      params.set("isActive", req.query.isActive.trim());
    }

    const url = `${prodiApiUrl.replace(/\/$/, "")}/api/v1/public/all-curriculums${params.toString() ? `?${params}` : ""}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const upstreamRes = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({
        success: false,
        message: "Gagal mengambil data kurikulum dari upstream Prodi UNUSU.",
      });
    }

    const data = await upstreamRes.json();
    res.json(data);
  } catch (error: any) {
    logServerError("GET /api/v1/inter-service/kurikulum-prodi", error);
    res.status(502).json({
      success: false,
      message: "Layanan Prodi UNUSU sedang tidak dapat dijangkau (timeout atau offline).",
    });
  }
});

// Rute API yang tidak dikenal tidak boleh jatuh ke fallback SPA.
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({ status: false, message: "Endpoint API tidak ditemukan." });
});

// Root route handler ('/') - pastikan user publik atau unauthenticated guest
// selalu menerima index.html (SPA landing page) dan TIDAK diarahkan ke /admin atau /dashboard secara otomatis.
app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("ONE UNUSU SSO Server Running. Build the client to serve the UI.");
    }
  });
});

// Fallback all non-API routes to index.html (SPA History Fallback)
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("ONE UNUSU SSO Server Running. Build the client to serve the UI.");
    }
  });
});

// Penanganan error terpusat: detail teknis hanya masuk log server, tidak pernah
// dikirim ke klien.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("CORS")) {
    res.status(403).json({ status: false, message: "Origin tidak diizinkan." });
    return;
  }

  logServerError(`${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ status: false, message: "Terjadi kesalahan pada server." });
});

app.listen(PORT, () => {
  console.log(`🚀 ONE UNUSU SSO Central Gateway running on http://localhost:${PORT}`);
});
