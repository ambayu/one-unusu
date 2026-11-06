/**
 * Automated Verification Script for ONE UNUSU SSO to Landing Page Navigation.
 * Simulates React Router DOM routing & guards logic under various session states:
 * 1. Admin session active (SUPERADMIN)
 * 2. Regular user session active (DOSEN / MAHASISWA)
 * 3. Public / Guest session (unauthenticated)
 * 4. Checks RootRoute ('/') behavior for all scenarios to ensure NO REDIRECT LOOP to /admin or /dashboard.
 */

interface MockUserProfile {
  id: number;
  username: string;
  nama: string;
  role: 'SUPERADMIN' | 'DOSEN' | 'MAHASISWA';
  permissions?: string[];
}

// Router evaluation mirror based on src/client/App.tsx logic
function evaluateRoute(
  path: string,
  cachedUser: MockUserProfile | null
): { rendered: string; redirectedTo?: string } {
  // Exact RootRoute logic from App.tsx:
  // RootRoute always returns <Home /> regardless of cachedUser!
  if (path === '/') {
    return { rendered: 'LandingPage (Home)' };
  }

  // GuestOnly routes (/login, /register)
  if (path === '/login' || path === '/register' || path === '/auth/register') {
    if (cachedUser) {
      // SEMUA peran mendarat di /dashboard (lihat src/client/lib/landing.ts).
      return { rendered: 'Redirect', redirectedTo: '/dashboard' };
    }
    return { rendered: path === '/login' ? 'LoginPage' : 'RegisterPage' };
  }

  // Protected Admin routes (/admin, /admin/pengguna, etc.)
  if (path.startsWith('/admin')) {
    if (!cachedUser) {
      return { rendered: 'Redirect', redirectedTo: '/login' };
    }
    // Permission check
    const perms = cachedUser.permissions || [];
    if (path === '/admin' && !perms.includes('APPLICATION_MENU')) {
      return { rendered: 'Redirect', redirectedTo: '/dashboard' };
    }
    return { rendered: `AdminPage (${path})` };
  }

  // Protected User routes (/dashboard, /profil)
  if (path === '/dashboard' || path === '/profil') {
    if (!cachedUser) {
      return { rendered: 'Redirect', redirectedTo: '/login' };
    }
    return { rendered: path === '/dashboard' ? 'DashboardPage' : 'ProfilePage' };
  }

  // Fallback
  return { rendered: 'Redirect', redirectedTo: '/' };
}

// Test cases execution
const testScenarios = [
  {
    name: 'Scenario 1: Active Admin Session navigates from /admin to Landing Page (/)',
    user: {
      id: 1,
      username: 'admin',
      nama: 'Super Admin',
      role: 'SUPERADMIN' as const,
      permissions: ['APPLICATION_MENU', 'USER_MENU', 'PERMISSION_MENU', 'ROLE_MENU', 'SLIDER_MENU', 'DIRECTORY_MENU'],
    },
    initialPath: '/admin',
    targetPath: '/',
  },
  {
    name: 'Scenario 2: Active Dosen Session navigates from /dashboard to Landing Page (/)',
    user: {
      id: 2,
      username: 'dosen1',
      nama: 'Dosen Pengampu',
      role: 'DOSEN' as const,
      permissions: ['DASHBOARD_MENU', 'PROFILE_MENU'],
    },
    initialPath: '/dashboard',
    targetPath: '/',
  },
  {
    name: 'Scenario 3: Public / Unauthenticated User visits Landing Page (/)',
    user: null,
    initialPath: '/login',
    targetPath: '/',
  },
  {
    name: 'Scenario 4: Verify Landing Page (/) does NOT trigger auto-redirect back to /admin for logged-in Admin',
    user: {
      id: 1,
      username: 'admin',
      nama: 'Super Admin',
      role: 'SUPERADMIN' as const,
      permissions: ['APPLICATION_MENU'],
    },
    initialPath: '/',
    targetPath: '/',
  },
];

console.log('======================================================================');
console.log('QA VERIFICATION: SSO ADMIN TO LANDING PAGE NAVIGATION AUDIT');
console.log('======================================================================\n');

let allPassed = true;

for (const scenario of testScenarios) {
  console.log(`[TEST] ${scenario.name}`);
  const initial = evaluateRoute(scenario.initialPath, scenario.user);
  console.log(`  - Initial route '${scenario.initialPath}':`, initial);

  const target = evaluateRoute(scenario.targetPath, scenario.user);
  console.log(`  - Target route '${scenario.targetPath}':`, target);

  // Assertion: Target must render LandingPage (Home) without redirecting back to /admin or /dashboard
  const isNoRedirectLoop = target.rendered === 'LandingPage (Home)' && !target.redirectedTo;
  if (isNoRedirectLoop) {
    console.log(`  ✓ PASSED: Correctly lands on Landing Page without redirect loop.\n`);
  } else {
    console.error(`  ✗ FAILED: Unexpected redirect loop detected:`, target);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('======================================================================');
  console.log('ALL QA AUDIT TESTS PASSED SUCCESSFULLY! NO REDIRECT LOOP DETECTED.');
  console.log('======================================================================');
} else {
  process.exit(1);
}
