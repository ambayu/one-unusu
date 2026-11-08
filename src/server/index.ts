import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import {
  TINGKAT_MASUK,
  kunciIzinMasuk,
  tingkatMasukBawaan,
  type TingkatMasuk
} from "./lib/accessControl.js";
import { buildSsoAppDefinitions, seedSsoApps } from "./lib/ssoApps.js";

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
const AUTH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.AUTH_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: AUTH_COOKIE_PATH,
  maxAge: AUTH_TOKEN_TTL_MS,
};

// Di belakang reverse proxy (nginx), IP asli klien dibaca dari X-Forwarded-For
// supaya rate limiter bekerja per klien, bukan per proxy.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}
app.disable("x-powered-by");

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

app.use(
  cors({
    // Tanpa daftar origin eksplisit, hanya origin lokal yang diizinkan.
    origin: (origin, callback) => {
      if (!origin) {
        // Request server-to-server (verify-token) tidak mengirim header Origin.
        callback(null, true);
        return;
      }
      const whitelist = allowedOrigins.length > 0
        ? allowedOrigins
        : ["http://localhost:5173", "http://127.0.0.1:5173"];
      if (whitelist.includes(origin)) {
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

/**
 * Keputusan akses satu pengguna ke satu aplikasi cabang.
 *
 * Sumber kebenarannya adalah tabel `permissions` + `role_permissions`:
 * pengguna boleh masuk aplikasi `clientId` bila salah satu perannya memegang
 * izin `<clientId>:masuk_admin`, `<clientId>:masuk_dosen`, atau
 * `<clientId>:masuk_mahasiswa`.
 *
 * Kolom `sso_apps.targetRoles` TIDAK lagi dipakai untuk memutuskan akses.
 * Nilainya hanya dipertahankan sebagai keterangan peran yang disarankan dan
 * sebagai bahan penyusunan izin awal ketika aplikasi baru didaftarkan.
 *
 * Karena izin dibaca dari database pada setiap permintaan, pencabutan akses
 * oleh administrator langsung berlaku tanpa menunggu JWT kedaluwarsa.
 */
type AppAccessReason = "permission-allowed" | "permission-denied";

interface AppAccessDecision {
  allowed: boolean;
  reason: AppAccessReason;
  /** Tingkat masuk yang dimiliki pengguna, mis. ["admin"] atau ["dosen"]. */
  tingkat: TingkatMasuk[];
}

/** Izin masuk yang dimiliki pengguna untuk satu aplikasi. */
function tingkatMasukDimiliki(permissionKeys: string[], clientId: string): TingkatMasuk[] {
  return TINGKAT_MASUK.filter((tingkat: TingkatMasuk) =>
    permissionKeys.includes(kunciIzinMasuk(clientId, tingkat))
  );
}

function decideAppAccess(
  permissionKeys: string[],
  clientId: string,
  userRoleCodes: string[] = []
): AppAccessDecision {
  // SUPERADMIN dan ADMIN_SSO memiliki hak akses penuh ke seluruh peluncur aplikasi SSO
  if (userRoleCodes.includes("SUPERADMIN") || userRoleCodes.includes("ADMIN_SSO")) {
    return {
      allowed: true,
      reason: "permission-allowed",
      tingkat: ["admin"],
    };
  }

  const tingkat = tingkatMasukDimiliki(permissionKeys, clientId);
  return {
    allowed: tingkat.length > 0,
    reason: tingkat.length > 0 ? "permission-allowed" : "permission-denied",
    tingkat,
  };
}

/**
 * Menyiapkan tiga izin masuk `<clientId>:masuk_*` untuk sebuah aplikasi baru
 * lalu melekatkannya ke peran sesuai cetak biru bawaan.
 *
 * Dipanggil saat aplikasi cabang didaftarkan lewat panel, sehingga registri
 * baru langsung punya izin yang dapat diatur administrator di halaman
 * Peran & Izin — tanpa perlu menjalankan seeder.
 */
async function siapkanIzinMasukAplikasi(
  clientId: string,
  nameApp: string,
  tingkatDiminta: TingkatMasuk[]
): Promise<void> {
  const actionByTingkat: Record<TingkatMasuk, string> = {
    admin: "masuk_admin",
    dosen: "masuk_dosen",
    mahasiswa: "masuk_mahasiswa",
  };
  const labelByTingkat: Record<TingkatMasuk, string> = {
    admin: "Masuk sebagai Administrator",
    dosen: "Masuk sebagai Dosen",
    mahasiswa: "Masuk sebagai Mahasiswa",
  };

  const permissionIdByTingkat = new Map<TingkatMasuk, number>();
  for (const tingkat of TINGKAT_MASUK) {
    const permission = await prisma.permission.upsert({
      where: { key: kunciIzinMasuk(clientId, tingkat) },
      update: {},
      create: {
        key: kunciIzinMasuk(clientId, tingkat),
        resource: clientId,
        action: actionByTingkat[tingkat],
        label: `${nameApp} · ${labelByTingkat[tingkat]}`,
      },
    });
    permissionIdByTingkat.set(tingkat, permission.id);
  }

  const roles = await prisma.role.findMany({ select: { id: true, code: true } });

  const data: { roleId: number; permissionId: number }[] = [];
  for (const role of roles) {
    for (const tingkat of tingkatMasukBawaan(role.code)) {
      if (!tingkatDiminta.includes(tingkat)) continue;
      const permissionId = permissionIdByTingkat.get(tingkat);
      if (permissionId) data.push({ roleId: role.id, permissionId });
    }
  }

  if (data.length > 0) {
    await prisma.rolePermission.createMany({ data, skipDuplicates: true });
  }
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

    // Cari berdasarkan username / NIM / NIDN
    const user = await prisma.user.findFirst({
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "NIM / NIDN / username atau password salah."
      });
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
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ status: false, message: "Data pengguna tidak ditemukan." });
    }

    const permissionKeys = await getUserPermissionKeys(user.id);
    const roleList = user.roles.map((ur) => ur.role);
    const roleCodes = roleList.map((r) => r.code);
    const primaryRole = roleCodes.includes("SUPERADMIN") ? "SUPERADMIN" : (roleCodes[0] ?? null);

    const { roles, ...profil } = user;

    res.json({
      status: true,
      data: { ...profil, role: primaryRole, roles: roleList, permissions: permissionKeys },
    });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal mengambil data profil pengguna." });
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
      select: { id: true, clientId: true, nameApp: true }
    });

    const appAccess = apps.map((app) => {
      const decision = decideAppAccess(permissionKeys, app.clientId, roleCodes);
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
    const { email, noHp, avatar, currentPassword, newPassword } = body;
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
    } = {};

    if (email !== undefined) {
      if (email === null || email === "") {
        updateData.email = null;
      } else if (typeof email !== "string" || email.length > 120 || !EMAIL_PATTERN.test(email.trim())) {
        return res.status(400).json({ status: false, message: "Format email tidak valid." });
      } else {
        updateData.email = email.trim();
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
      updateData.password = await bcrypt.hash(newPassword, 10);
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
        avatar: true
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
      orderBy: { order: "asc" },
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
        order: true
      }
    });

    const userRoleCodes = await getUserRoleCodes(currentUser.id);

    // Katalog dikirim lengkap; status izin dihitung per pengguna dari izin
    // masuk (`<clientId>:masuk_admin|dosen|mahasiswa`) yang tersimpan di
    // `role_permissions`. Aplikasi cabang memvalidasi ulang saat login.
    const appsWithAccess = apps.map((app) => {
      const decision = decideAppAccess(permissionKeys, app.clientId, userRoleCodes);
      return {
        ...app,
        // `targetRoles` tidak lagi menjadi sumber otorisasi; dikirim kosong
        // agar klien tidak lagi menampilkan daftar peran sebagai janji akses.
        targetRoles: "",
        tingkatMasuk: decision.tingkat,
        isAllowed: decision.allowed
      };
    });

    res.json({ status: true, data: appsWithAccess });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat katalog aplikasi SSO." });
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
    const decision = decideAppAccess(permissionKeys, ssoApp.clientId, userRoleCodes);

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

    // 4. Bangun URL redirect ke callback cabang
    const separator = ssoApp.urlRedirect.includes("?") ? "&" : "?";
    const redirectUrl = `${ssoApp.urlRedirect}${separator}client_id=${encodeURIComponent(ssoApp.clientId)}&token=${encodeURIComponent(token)}`;

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

    // 6. Penegakan Otorisasi Aplikasi Tujuan (Fail-Closed)
    //    Sumber: izin masuk `<clientId>:masuk_*` milik pengguna di
    //    `role_permissions`. Peran mentah tidak lagi dipakai.
    const verifyPermissionKeys = await getUserPermissionKeys(user.id);
    const verifyDecision = decideAppAccess(verifyPermissionKeys, ssoApp.clientId, roleCodes);

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
      (k) => k.startsWith(`${ssoApp.clientId}:`) || !k.includes(":")
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
    const { nama, email, noHp, roleIds, roleId, nim, nidn, fakultas, prodi, isActive, password } = body;

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

    // Buat tiga izin masuk dan lekatkan ke peran sesuai cetak biru bawaan.
    await siapkanIzinMasukAplikasi(newApp.clientId, newApp.nameApp, tingkatDiminta);

    res.json({
      status: true,
      message: "Aplikasi SSO berhasil didaftarkan. Atur peran penerima izin masuk di halaman Peran & Izin.",
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
    // 1. Ambil seluruh izin di DB yang tidak lagi ada di katalog resmi atau orphan
    const { PERMISSION_CATALOG } = await import("./lib/accessControl.js");
    const validKeys = new Set<string>();
    for (const group of PERMISSION_CATALOG) {
      for (const action of group.actions) {
        validKeys.add(`${group.resource}:${action}`);
      }
    }

    // Masukkan seluruh izin masuk aplikasi cabang yang terdaftar di sso_apps
    const apps = await prisma.ssoApp.findMany({ select: { clientId: true } });
    for (const app of apps) {
      validKeys.add(`${app.clientId}:masuk_admin`);
      validKeys.add(`${app.clientId}:masuk_dosen`);
      validKeys.add(`${app.clientId}:masuk_mahasiswa`);
    }

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

    // Mencegah eskalasi hak akses: pengguna hanya boleh membagikan izin yang
    // memang sudah dimilikinya sendiri.
    const ownKeys = await getUserPermissionKeys(req.user!.id);
    const unauthorizedKeys = requestedKeys.filter((key) => !ownKeys.includes(key));
    if (unauthorizedKeys.length > 0) {
      return res.status(403).json({
        status: false,
        message: "Anda tidak dapat memberikan izin yang tidak Anda miliki sendiri."
      });
    }

    const permissions = await prisma.permission.findMany({
      where: { key: { in: requestedKeys } },
      select: { id: true }
    });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: id, permissionId: permission.id })),
        skipDuplicates: true
      })
    ]);

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
    const directories = await prisma.layananKampus.findMany({
      where: { active: true },
      orderBy: { urutan: "asc" },
      select: {
        id: true,
        nama: true,
        kategori: true,
        deskripsi: true,
        urlTarget: true,
        icon: true,
        isExternal: true,
        urutan: true,
        active: true
      }
    });
    res.json({ status: true, data: directories });
  } catch (error: any) {
    logServerError("GET /api/directories", error);
    res.status(500).json({ status: false, message: "Gagal memuat direktori publik." });
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

// POST /api/admin/sliders (Tambah foto slider hero baru)
app.post("/api/admin/sliders", authenticateToken, requirePermission("slider:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { judul, subjudul, gambarUrl, gambarMobileUrl, linkUrl, urutan, active } = body;

    if (typeof judul !== "string" || !judul.trim()) {
      return res.status(400).json({ status: false, message: "Judul slider wajib diisi." });
    }
    if (judul.trim().length > 150) {
      return res.status(400).json({ status: false, message: "Judul slider maksimal 150 karakter." });
    }

    if (!isValidImageUrl(gambarUrl)) {
      return res.status(400).json({ status: false, message: "Gambar desktop wajib diunggah atau berupa URL gambar yang valid." });
    }

    if (gambarMobileUrl && !isValidImageUrl(gambarMobileUrl)) {
      return res.status(400).json({ status: false, message: "Format gambar mobile tidak valid." });
    }

    let parsedUrutan = 0;
    if (urutan !== undefined && urutan !== null && urutan !== "") {
      const parsed = Number.parseInt(String(urutan), 10);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return res.status(400).json({ status: false, message: "Urutan harus berupa angka positif." });
      }
      parsedUrutan = parsed;
    }

    const created = await prisma.bannerSlider.create({
      data: {
        judul: judul.trim(),
        subjudul: typeof subjudul === "string" && subjudul.trim() ? subjudul.trim().slice(0, 255) : null,
        gambarUrl: String(gambarUrl).trim(),
        gambarMobileUrl: gambarMobileUrl ? String(gambarMobileUrl).trim() : null,
        linkUrl: typeof linkUrl === "string" && linkUrl.trim() ? linkUrl.trim() : null,
        urutan: parsedUrutan,
        active: active === undefined ? true : Boolean(active),
      },
    });

    res.status(201).json({ status: true, message: "Foto slider hero berhasil ditambahkan.", data: created });
  } catch (error: any) {
    logServerError("POST /api/admin/sliders", error);
    res.status(500).json({ status: false, message: "Gagal menambahkan foto slider." });
  }
});

// PUT /api/admin/sliders/:id (Update foto slider hero)
app.put("/api/admin/sliders/:id", authenticateToken, requirePermission("slider:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID slider tidak valid." });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const { judul, subjudul, gambarUrl, gambarMobileUrl, linkUrl, urutan, active } = body;

    const existing = await prisma.bannerSlider.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: false, message: "Data slider tidak ditemukan." });
    }

    const updateData: any = {};

    if (judul !== undefined) {
      if (typeof judul !== "string" || !judul.trim()) {
        return res.status(400).json({ status: false, message: "Judul slider tidak boleh kosong." });
      }
      updateData.judul = judul.trim().slice(0, 150);
    }

    if (subjudul !== undefined) {
      updateData.subjudul = typeof subjudul === "string" && subjudul.trim() ? subjudul.trim().slice(0, 255) : null;
    }

    if (gambarUrl !== undefined) {
      if (!isValidImageUrl(gambarUrl)) {
        return res.status(400).json({ status: false, message: "Gambar desktop tidak valid." });
      }
      updateData.gambarUrl = String(gambarUrl).trim();
    }

    if (gambarMobileUrl !== undefined) {
      if (gambarMobileUrl && !isValidImageUrl(gambarMobileUrl)) {
        return res.status(400).json({ status: false, message: "Gambar mobile tidak valid." });
      }
      updateData.gambarMobileUrl = gambarMobileUrl ? String(gambarMobileUrl).trim() : null;
    }

    if (linkUrl !== undefined) {
      updateData.linkUrl = typeof linkUrl === "string" && linkUrl.trim() ? linkUrl.trim() : null;
    }

    if (urutan !== undefined) {
      const parsed = Number.parseInt(String(urutan), 10);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return res.status(400).json({ status: false, message: "Urutan harus berupa angka positif." });
      }
      updateData.urutan = parsed;
    }

    if (active !== undefined) {
      updateData.active = Boolean(active);
    }

    const updated = await prisma.bannerSlider.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: true, message: "Foto slider hero berhasil diperbarui.", data: updated });
  } catch (error: any) {
    logServerError("PUT /api/admin/sliders/:id", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui slider." });
  }
});

// DELETE /api/admin/sliders/:id (Hapus foto slider hero)
app.delete("/api/admin/sliders/:id", authenticateToken, requirePermission("slider:delete"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: false, message: "ID slider tidak valid." });
    }

    await prisma.bannerSlider.delete({ where: { id } });
    res.json({ status: true, message: "Foto slider hero berhasil dihapus." });
  } catch (error: any) {
    logServerError("DELETE /api/admin/sliders/:id", error);
    res.status(500).json({ status: false, message: "Gagal menghapus slider." });
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
      },
    });

    // Tingkat masuk yang benar-benar dilekatkan pada suatu peran. Dipakai
    // halaman publik untuk menyebut siapa yang dapat memakai aplikasi, tanpa
    // membocorkan nama peran internal.
    const izinMasuk = await prisma.rolePermission.findMany({
      where: {
        permission: { resource: { in: apps.map((app) => app.clientId) } },
        role: { userRoles: { some: {} } },
      },
      select: { permission: { select: { key: true } } },
    });

    const tingkatTersedia = new Map<string, Set<string>>();
    for (const item of izinMasuk) {
      const cocok = /^(.+):masuk_(admin|dosen|mahasiswa)$/.exec(item.permission.key);
      if (!cocok) continue;
      const [, clientId, tingkat] = cocok;
      if (!tingkatTersedia.has(clientId)) tingkatTersedia.set(clientId, new Set());
      tingkatTersedia.get(clientId)!.add(tingkat);
    }

    const data = apps.map((app) => {
      // Hanya origin yang dibuka ke publik agar alamat callback tidak bocor.
      let origin = "";
      try {
        origin = new URL(app.urlRedirect).origin;
      } catch {
        origin = "";
      }

      return {
        id: app.id,
        clientId: app.clientId,
        name: app.nameApp,
        description: app.description,
        badge: app.badge,
        icon: app.icon,
        tingkatMasuk: TINGKAT_MASUK.filter((tingkat: TingkatMasuk) =>
          tingkatTersedia.get(app.clientId)?.has(tingkat)
        ),
        origin,
      };
    });

    res.json({ status: true, data });
  } catch (error: any) {
    logServerError("GET /api/applications/catalog", error);
    res.status(500).json({ status: false, message: "Gagal memuat katalog aplikasi SSO." });
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

