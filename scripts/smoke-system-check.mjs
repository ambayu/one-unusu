import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    })
);

const base = `http://localhost:${env.PORT || 5000}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // tunggu server siap
  for (let i = 0; i < 20; i += 1) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) break;
    } catch {
      /* belum siap */
    }
    await wait(1000);
  }

  const unauth = await fetch(`${base}/api/admin/system-check`);
  console.log('TANPA LOGIN ->', unauth.status);

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: env.SEED_ADMIN_PASSWORD }),
  });
  const loginBody = await loginRes.json();
  console.log('LOGIN ->', loginRes.status, loginBody.status, loginBody.message ?? '');

  const cookie = loginRes.headers.getSetCookie?.().map((c) => c.split(';')[0]).join('; ') || '';
  const token = loginBody?.data?.token;
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}/api/admin/system-check`, { headers });
  const body = await res.json();
  console.log('SYSTEM CHECK ->', res.status, 'overall:', body?.data?.overall);
  console.log('SUMMARY ->', JSON.stringify(body?.data?.summary));
  for (const c of body?.data?.checks ?? []) {
    console.log(` - [${c.status}] ${c.group} / ${c.label}: ${c.detail}`);
  }
}

main().catch((e) => console.error('ERR', e));
