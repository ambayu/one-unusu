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
import { PrismaClient, UserRole } from "@prisma/client";

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
        scriptSrc: ["'self'"],
        // Google Fonts dipakai di index.html; gaya inline dibutuhkan Tailwind/React.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        // Ikon aplikasi disimpan sebagai data URL base64.
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
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
const UPLOAD_ROUTE_PATTERN = /^\/api\/(admin\/apps|auth\/profile)(\/|$)/;
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
app.use("/portal", express.static(clientDistPath));

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
    role: UserRole;
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
const ALLOWED_ROLES: UserRole[] = Object.values(UserRole);
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

const ALLOWED_ROLE_SET = new Set<string>(ALLOWED_ROLES);

/**
 * Menormalkan daftar peran target menjadi JSON array yang hanya berisi peran
 * yang dikenal sistem. Mengembalikan null bila format tidak valid.
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
    if (typeof item !== "string" || !ALLOWED_ROLE_SET.has(item)) {
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
 * melalui peran yang tersimpan di tabel roles.
 */
async function getUserPermissionKeys(userId: number): Promise<string[]> {
  const rows = await prisma.rolePermission.findMany({
    where: { role: { users: { some: { id: userId } } } },
    select: { permission: { select: { key: true } } }
  });

  return Array.from(new Set(rows.map((row) => row.permission.key)));
}

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
// 1. AUTHENTICATION (LOGIN NIM / NIDN)
// ==========================================

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

    // Generate JWT Session Token (Berlaku 1 hari)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
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
        role: user.role,
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
        role: true,
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

    res.json({ status: true, data: { ...user, permissions: permissionKeys } });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal mengambil data profil pengguna." });
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
        role: true,
        nim: true,
        nidn: true,
        fakultas: true,
        prodi: true,
        avatar: true
      }
    });

    res.json({ status: true, message: "Profil berhasil diperbarui.", data: updatedUser });
  } catch (error: any) {
    logServerError("PUT /api/auth/profile", error);
    res.status(500).json({ status: false, message: "Gagal memperbarui profil." });
  }
});

// ==========================================
// 2. SSO TOKEN V2 ENGINE (SEPERTI SSO MEDAN)
// ==========================================

// GET /api/sso/apps (Ambil daftar aplikasi terintegrasi sesuai role user)
app.get("/api/sso/apps", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Role dibaca ulang dari database supaya perubahan peran langsung berlaku
    // walau token lama masih aktif.
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { role: true, isActive: true }
    });

    if (!currentUser || !currentUser.isActive) {
      return res.status(403).json({ status: false, message: "Akun tidak aktif atau tidak ditemukan." });
    }

    const userRole = currentUser.role;

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
        targetRoles: true,
        isActive: true,
        order: true
      }
    });

    // Seluruh aplikasi aktif dikirim ke dashboard. Penanda `isAllowed` dipakai
    // UI untuk menonaktifkan kartu yang perannya tidak sesuai; penegakan akses
    // tetap dilakukan pada endpoint penerbitan token di bawah (fail-closed).
    const appsWithAccess = apps.map((app) => {
      try {
        const allowedRoles: unknown = JSON.parse(app.targetRoles);
        const isAllowed = Array.isArray(allowedRoles) && allowedRoles.includes(userRole);
        return { ...app, isAllowed };
      } catch {
        logServerError(`targetRoles tidak valid pada aplikasi ${app.clientId}`, app.targetRoles);
        return { ...app, isAllowed: false };
      }
    });

    res.json({ status: true, data: appsWithAccess });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat katalog aplikasi SSO." });
  }
});

// GET /api/sso/app-client/:clientId/v2/redirect
// Menerbitkan token sekali pakai (single-use 64 char) dan menghasilkan URL Callback
app.get("/api/sso/app-client/:clientId/v2/redirect", authenticateToken, writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = req.user!.id;

    if (typeof clientId !== "string" || clientId.length > 100) {
      return res.status(400).json({ status: false, message: "Client ID tidak valid." });
    }

    // Role dan status akun dibaca dari database, bukan dari isi token.
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true }
    });

    if (!currentUser || !currentUser.isActive) {
      return res.status(403).json({ status: false, message: "Akun tidak aktif atau tidak ditemukan." });
    }

    const userRole = currentUser.role;

    const ssoApp = await prisma.ssoApp.findUnique({
      where: { clientId }
    });

    if (!ssoApp || !ssoApp.isActive) {
      return res.status(404).json({ status: false, message: "Aplikasi cabang tidak ditemukan atau sedang tidak aktif." });
    }

    // Cek otorisasi role
    try {
      const allowedRoles: string[] = JSON.parse(ssoApp.targetRoles);
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ status: false, message: `Akun dengan peran ${userRole} tidak memiliki izin akses ke ${ssoApp.nameApp}.` });
      }
    } catch (e) {
      logServerError(`targetRoles tidak valid pada aplikasi ${ssoApp.clientId}`, e);
      return res.status(500).json({ status: false, message: "Konfigurasi aplikasi cabang tidak valid." });
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
      where: { id: authToken.userId }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({
        status: false,
        message: "Pengguna SSO tidak ditemukan atau dalam status nonaktif."
      });
    }

    // 6. Return Payload Profil Terpercaya (Sesuai Format SSO Diskominfo Medan)
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
          role: user.role,
          nim: user.nim,
          nidn: user.nidn,
          fakultas: user.fakultas,
          prodi: user.prodi,
          avatar: user.avatar
        },
        app: {
          clientId: ssoApp.clientId,
          nameApp: ssoApp.nameApp
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
app.get("/api/admin/stats", authenticateToken, requirePermission("dashboard:view"), async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalMahasiswa = await prisma.user.count({ where: { role: "MAHASISWA" } });
    const totalDosen = await prisma.user.count({ where: { role: "DOSEN" } });
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
        role: true,
        nim: true,
        nidn: true,
        fakultas: true,
        prodi: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { id: "desc" }
    });
    res.json({ status: true, data: users });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal mengambil daftar pengguna." });
  }
});

// POST /api/admin/users (Tambah User Baru)
app.post("/api/admin/users", authenticateToken, requirePermission("user:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { username, password, nama, email, noHp, role, nim, nidn, fakultas, prodi } = body;

    if (typeof username !== "string" || typeof password !== "string" || typeof nama !== "string" || typeof role !== "string") {
      return res.status(400).json({ status: false, message: "Username/NIM/NIDN, password, nama, dan role wajib diisi." });
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
    if (!ALLOWED_ROLES.includes(role as UserRole)) {
      return res.status(400).json({ status: false, message: "Peran pengguna tidak valid." });
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: trimmedUsername,
        password: hashedPassword,
        nama: trimmedNama,
        email: typeof email === "string" && email.trim() ? email.trim() : null,
        noHp: typeof noHp === "string" && noHp.trim() ? noHp.trim() : null,
        role: role as UserRole,
        nim: role === "MAHASISWA" ? (typeof nim === "string" && nim.trim() ? nim.trim() : trimmedUsername) : null,
        nidn: role === "DOSEN" ? (typeof nidn === "string" && nidn.trim() ? nidn.trim() : trimmedUsername) : null,
        fakultas: typeof fakultas === "string" && fakultas.trim() ? fakultas.trim() : null,
        prodi: typeof prodi === "string" && prodi.trim() ? prodi.trim() : null,
        isActive: true
      },
      // Password hash tidak pernah dikembalikan ke klien.
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        noHp: true,
        role: true,
        nim: true,
        nidn: true,
        fakultas: true,
        prodi: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({ status: true, message: "Pengguna SSO berhasil didaftarkan.", data: newUser });
  } catch (error: any) {
    logServerError("POST /api/admin/users", error);
    res.status(500).json({ status: false, message: "Gagal menambahkan pengguna." });
  }
});

// GET /api/admin/apps (Daftar Semua Aplikasi Terdaftar)
app.get("/api/admin/apps", authenticateToken, requirePermission("application:view"), async (req: AuthRequest, res: Response) => {
  try {
    const apps = await prisma.ssoApp.findMany({
      orderBy: { order: "asc" }
    });
    res.json({ status: true, data: apps });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat aplikasi SSO." });
  }
});

// POST /api/admin/apps (Tambah Aplikasi Cabang Baru)
app.post("/api/admin/apps", authenticateToken, requirePermission("application:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const { clientId, clientKey, nameApp, description, icon, badge, urlRedirect, targetRoles } = body;

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

    const normalizedRoles = targetRoles === undefined
      ? JSON.stringify(["DOSEN", "MAHASISWA", "SUPERADMIN"])
      : normalizeTargetRoles(targetRoles);

    if (!normalizedRoles) {
      return res.status(400).json({ status: false, message: "Daftar peran target tidak valid." });
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
        targetRoles: normalizedRoles,
        isActive: true
      }
    });

    res.json({ status: true, message: "Aplikasi SSO berhasil didaftarkan.", data: newApp });
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
    const { nameApp, description, icon, badge, urlRedirect, targetRoles, isActive, clientKey } = body;

    const data: {
      nameApp?: string;
      description?: string | null;
      icon?: string;
      badge?: string;
      urlRedirect?: string;
      clientKey?: string;
      targetRoles?: string;
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
    if (targetRoles !== undefined) {
      const normalizedRoles = normalizeTargetRoles(targetRoles);
      if (!normalizedRoles) {
        return res.status(400).json({ status: false, message: "Daftar peran target tidak valid." });
      }
      data.targetRoles = normalizedRoles;
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
      select: { id: true, key: true, resource: true, action: true, label: true }
    });

    res.json({ status: true, data: permissions });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat katalog izin." });
  }
});

// GET /api/admin/roles (Daftar peran beserta izin dan jumlah pengguna)
app.get("/api/admin/roles", authenticateToken, requirePermission("role:view"), async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: "asc" },
      include: {
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { users: true } }
      }
    });

    const data = roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
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
      include: { _count: { select: { users: true } } }
    });

    if (!role) {
      return res.status(404).json({ status: false, message: "Peran tidak ditemukan." });
    }

    if (role.isSystem) {
      return res.status(400).json({ status: false, message: "Peran sistem tidak dapat dihapus." });
    }

    if (role._count.users > 0) {
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
app.get("/api/admin/directories", authenticateToken, requirePermission("directory:view"), async (req: AuthRequest, res: Response) => {
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
app.post("/api/admin/directories", authenticateToken, requirePermission("directory:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
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
app.put("/api/admin/directories/:id", authenticateToken, requirePermission("directory:edit"), writeLimiter, async (req: AuthRequest, res: Response) => {
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
app.delete("/api/admin/directories/:id", authenticateToken, requirePermission("directory:delete"), writeLimiter, async (req: AuthRequest, res: Response) => {
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

// Rute API yang tidak dikenal tidak boleh jatuh ke fallback SPA.
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({ status: false, message: "Endpoint API tidak ditemukan." });
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

