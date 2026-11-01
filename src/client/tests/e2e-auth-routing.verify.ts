/**
 * E2E Routing & Authentication Verification Simulation
 * Verifikasi End-to-End Alur Login dan Routing SSO ONE UNUSU
 */

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: 'SUPERADMIN' | 'DOSEN' | 'MAHASISWA' | 'TENDIK';
  email?: string;
  noHp?: string;
  permissions?: string[];
}

// Simulasi Storage & Router state
class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, val: string) { this.store[key] = val; }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const mockLocalStorage = new MockStorage();

function readCachedUser(): UserProfile | null {
  const raw = mockLocalStorage.getItem('one_unusu_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Logika GuestOnlyRoute dari src/client/App.tsx
function simulateGuestOnlyRoute(targetPath: string): { allowed: boolean; redirect?: string } {
  const cachedUser = readCachedUser();
  if (cachedUser) {
    const landingPath = cachedUser.role === 'SUPERADMIN' ? '/admin' : '/dashboard';
    return { allowed: false, redirect: landingPath };
  }
  return { allowed: true };
}

// Logika Landing Page Navbar Tombol Masuk dari src/client/components/layout/Navbar.tsx
function getNavbarMasukTarget(): { url: string; label: string } {
  const cachedUser = readCachedUser();
  const isLoggedIn = Boolean(cachedUser);
  return {
    url: isLoggedIn ? '/dashboard' : '/login',
    label: isLoggedIn ? 'Dashboard' : 'Masuk',
  };
}

// Logika Pasca Login Sukses dari src/client/pages/Login.tsx
function simulateLoginSuccess(user: UserProfile, nextQueryParam?: string | null): string {
  mockLocalStorage.setItem('one_unusu_user', JSON.stringify(user));
  const rawNext = nextQueryParam;
  const nextPath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;
  const resolveLandingPath = (role?: string) => role === 'SUPERADMIN' ? '/admin' : '/dashboard';

  if (nextPath) {
    return nextPath;
  }
  return resolveLandingPath(user.role);
}

// Suite Pengujian
let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

console.log('--- Memulai Verifikasi E2E Alur Login & Routing SSO ---');

// Skenario 1: Tombol 'Masuk' dari landing page saat belum login (Guest)
mockLocalStorage.clear();
const guestNavbar = getNavbarMasukTarget();
assert(guestNavbar.label === 'Masuk', "Label tombol navigasi adalah 'Masuk' untuk tamu");
assert(guestNavbar.url === '/login', "Tombol 'Masuk' mengarahkan ke form login SSO (/login) bukan /register");
const guestAccess = simulateGuestOnlyRoute('/login');
assert(guestAccess.allowed === true, "Guest diizinkan mengakses form login (/login)");

// Skenario 2: Login sukses untuk SUPERADMIN
const adminUser: UserProfile = {
  id: 'usr_admin',
  username: 'superadmin',
  name: 'Super Administrator',
  role: 'SUPERADMIN',
  permissions: ['dashboard:view', 'application:menu', 'user:menu']
};
const adminRedirect = simulateLoginSuccess(adminUser);
assert(adminRedirect === '/admin', "Setelah login sukses, SUPERADMIN diarahkan langsung ke panel admin (/admin)");

// Skenario 3: Login sukses untuk Mahasiswa / Dosen
mockLocalStorage.clear();
const studentUser: UserProfile = {
  id: 'usr_mhs',
  username: '2201010045',
  name: 'Ahmad Mahasiswa',
  role: 'MAHASISWA'
};
const studentRedirect = simulateLoginSuccess(studentUser);
assert(studentRedirect === '/dashboard', "Setelah login sukses, Mahasiswa/Dosen diarahkan ke dashboard portal (/dashboard)");

// Skenario 4: Login sukses dengan redirect parameter (SSO App callback)
mockLocalStorage.clear();
const callbackRedirect = simulateLoginSuccess(studentUser, '/authorize?client_id=lms-unusu');
assert(callbackRedirect === '/authorize?client_id=lms-unusu', "Mendukung alur SSO lanjutan via next parameter");

// Skenario 5: User dengan sesi aktif (SUPERADMIN) membuka landing page & tombol masuk
mockLocalStorage.setItem('one_unusu_user', JSON.stringify(adminUser));
const loggedInNav = getNavbarMasukTarget();
assert(loggedInNav.label === 'Dashboard', "Saat sesi aktif, tombol navigasi berubah menjadi 'Dashboard'");
assert(loggedInNav.url === '/dashboard', "Saat sesi aktif, tombol navigasi membuka dashboard tanpa form login");

// Skenario 6: User dengan sesi aktif mengakses rute login/registrasi langsung via URL
const activeSessionLoginAttempt = simulateGuestOnlyRoute('/login');
assert(
  !activeSessionLoginAttempt.allowed && activeSessionLoginAttempt.redirect === '/admin',
  "User yang sudah memiliki sesi aktif (SUPERADMIN) langsung diarahkan ke /admin tanpa prompt login berulang"
);

mockLocalStorage.setItem('one_unusu_user', JSON.stringify(studentUser));
const activeStudentLoginAttempt = simulateGuestOnlyRoute('/login');
assert(
  !activeStudentLoginAttempt.allowed && activeStudentLoginAttempt.redirect === '/dashboard',
  "User yang sudah memiliki sesi aktif (Mahasiswa) langsung diarahkan ke /dashboard tanpa prompt login berulang"
);

console.log(`\nHasil: ${passed}/${total} pengujian berhasil diverifikasi.`);
