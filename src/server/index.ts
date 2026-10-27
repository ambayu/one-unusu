import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, Role } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET belum diset di environment. Server dihentikan demi keamanan.");
  process.exit(1);
}

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Serve static frontend build files when in production
const clientDistPath = path.resolve(process.cwd(), "dist/client");
app.use(express.static(clientDistPath));

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
    role: Role;
    nama: string;
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = headerValue && headerValue.startsWith("Bearer ") ? headerValue.split(" ")[1] : (typeof req.query.token === "string" ? req.query.token : null);

  if (!token) {
    return res.status(401).json({ status: false, message: "Akses ditolak. Token tidak disediakan." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ status: false, message: "Sesi login kedaluwarsa atau token tidak valid." });
    }
    req.user = decoded;
    next();
  });
};

const requireSuperadmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "SUPERADMIN") {
    return res.status(403).json({ status: false, message: "Akses terbatas hanya untuk Super Administrator." });
  }
  next();
};

// ==========================================
// 1. AUTHENTICATION (LOGIN NIM / NIDN)
// ==========================================

// POST /api/auth/login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        status: false,
        message: "NIM / NIDN dan password wajib diisi."
      });
    }

    const trimmedIdentifier = String(identifier).trim();

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
      return res.status(401).json({
        status: false,
        message: "NIM / NIDN atau password salah."
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
        message: "NIM / NIDN atau password salah."
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
      JWT_SECRET,
      { expiresIn: "1d" }
    );

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
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Terjadi kesalahan server saat login.", error: error?.message });
  }
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

    res.json({ status: true, data: user });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal mengambil data profil pengguna." });
  }
});

// PUT /api/auth/profile (Update profil pribadi)
app.put("/api/auth/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { email, noHp, currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
    }

    const updateData: any = {};
    if (email !== undefined) updateData.email = email || null;
    if (noHp !== undefined) updateData.noHp = noHp || null;

    // Jika ingin mengganti password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ status: false, message: "Password saat ini wajib diisi untuk mengganti password." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ status: false, message: "Password saat ini tidak cocok." });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ status: false, message: "Password baru minimal 6 karakter." });
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
        prodi: true
      }
    });

    res.json({ status: true, message: "Profil berhasil diperbarui.", data: updatedUser });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memperbarui profil: " + error.message });
  }
});

// ==========================================
// 2. SSO TOKEN V2 ENGINE (SEPERTI SSO MEDAN)
// ==========================================

// GET /api/sso/apps (Ambil daftar aplikasi terintegrasi sesuai role user)
app.get("/api/sso/apps", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role;

    const apps = await prisma.ssoApp.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" }
    });

    // Filter aplikasi yang diizinkan untuk role user
    const accessibleApps = apps.filter(app => {
      try {
        const allowedRoles: string[] = JSON.parse(app.targetRoles);
        return allowedRoles.includes(userRole);
      } catch {
        return true;
      }
    });

    res.json({ status: true, data: accessibleApps });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memuat katalog aplikasi SSO." });
  }
});

// GET /api/sso/app-client/:clientId/v2/redirect
// Menerbitkan token sekali pakai (single-use 64 char) dan menghasilkan URL Callback
app.get("/api/sso/app-client/:clientId/v2/redirect", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

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
      // Ignore json parse error
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
    res.status(500).json({ status: false, message: "Terjadi kesalahan saat otorisasi SSO: " + error.message });
  }
});

// POST /api/v2/website/verify-token (Dipanggil Server-to-Server oleh LMS, LPPM, E-Surat, dll.)
app.post("/api/v2/website/verify-token", async (req: Request, res: Response) => {
  try {
    const client_id = req.body?.client_id || req.query?.client_id;
    const client_key = req.body?.client_key || req.query?.client_key;
    const token = req.body?.token || req.query?.token;

    // 1. Validasi Input Body
    if (!client_id || !client_key || !token) {
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

    // 4. Bakar Token (Single-Use Protection: isUsed = true)
    await prisma.ssoAuthToken.update({
      where: { id: authToken.id },
      data: { isUsed: true }
    });

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
    res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server SSO: " + error.message
    });
  }
});

// ==========================================
// 3. PANEL SUPERADMIN (PENGELOLAAN SSO)
// ==========================================

// GET /api/admin/stats
app.get("/api/admin/stats", authenticateToken, requireSuperadmin, async (req: AuthRequest, res: Response) => {
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
app.get("/api/admin/users", authenticateToken, requireSuperadmin, async (req: AuthRequest, res: Response) => {
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
app.post("/api/admin/users", authenticateToken, requireSuperadmin, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, nama, email, noHp, role, nim, nidn, fakultas, prodi } = req.body;

    if (!username || !password || !nama || !role) {
      return res.status(400).json({ status: false, message: "Username/NIM/NIDN, password, nama, dan role wajib diisi." });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ status: false, message: "Username / NIM / NIDN sudah terdaftar." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        nama,
        email: email || null,
        noHp: noHp || null,
        role: role as Role,
        nim: role === "MAHASISWA" ? (nim || username) : null,
        nidn: role === "DOSEN" ? (nidn || username) : null,
        fakultas: fakultas || null,
        prodi: prodi || null,
        isActive: true
      }
    });

    res.json({ status: true, message: "Pengguna SSO berhasil didaftarkan.", data: newUser });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal menambahkan pengguna: " + error.message });
  }
});

// GET /api/admin/apps (Daftar Semua Aplikasi Terdaftar)
app.get("/api/admin/apps", authenticateToken, requireSuperadmin, async (req: AuthRequest, res: Response) => {
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
app.post("/api/admin/apps", authenticateToken, requireSuperadmin, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, clientKey, nameApp, description, icon, badge, urlRedirect, targetRoles } = req.body;

    if (!clientId || !clientKey || !nameApp || !urlRedirect) {
      return res.status(400).json({ status: false, message: "client_id, client_key, nama aplikasi, dan URL redirect wajib diisi." });
    }

    const existing = await prisma.ssoApp.findUnique({ where: { clientId } });
    if (existing) {
      return res.status(400).json({ status: false, message: "Aplikasi dengan Client ID tersebut sudah terdaftar." });
    }

    const newApp = await prisma.ssoApp.create({
      data: {
        clientId,
        clientKey,
        nameApp,
        description: description || null,
        icon: icon || "LayoutGrid",
        badge: badge || "Internal",
        urlRedirect,
        targetRoles: typeof targetRoles === "string" ? targetRoles : JSON.stringify(targetRoles || ["DOSEN", "MAHASISWA", "SUPERADMIN"]),
        isActive: true
      }
    });

    res.json({ status: true, message: "Aplikasi SSO berhasil didaftarkan.", data: newApp });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal mendaftarkan aplikasi: " + error.message });
  }
});

// PUT /api/admin/apps/:id (Update Aplikasi Cabang)
app.put("/api/admin/apps/:id", authenticateToken, requireSuperadmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { nameApp, description, icon, badge, urlRedirect, targetRoles, isActive, clientKey } = req.body;

    const data: any = {};
    if (nameApp) data.nameApp = nameApp;
    if (description !== undefined) data.description = description;
    if (icon) data.icon = icon;
    if (badge) data.badge = badge;
    if (urlRedirect) data.urlRedirect = urlRedirect;
    if (clientKey) data.clientKey = clientKey;
    if (targetRoles) data.targetRoles = typeof targetRoles === "string" ? targetRoles : JSON.stringify(targetRoles);
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.ssoApp.update({
      where: { id },
      data
    });

    res.json({ status: true, message: "Data aplikasi SSO berhasil diperbarui.", data: updated });
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Gagal memperbarui aplikasi: " + error.message });
  }
});

// Fallback all non-API routes to index.html (SPA History Fallback)
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("ONE UNUSU SSO Server Running. Build the client to serve the UI.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ONE UNUSU SSO Central Gateway running on http://localhost:${PORT}`);
});
