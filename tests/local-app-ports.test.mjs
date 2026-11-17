import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('branch Vite ports match the ONE seeder registry', () => {
  const registry = readFileSync(new URL('../src/server/lib/ssoApps.ts', import.meta.url), 'utf8');
  const apps = [
    ['unusu-lms', 'js', '50e3ed28134b379d'],
    ['esurat-unusu', 'ts', 'e538eac90fb83578'],
    ['lppm-unusu', 'ts', '223ea0752e7619e2'],
    ['lpm-unusu', 'ts', '014813db6bffb39f'],
    ['unusu-sarpras', 'js', '38cf6306cea79458'],
    ['unusu-akreditasi', 'js', 'a5776434492cb44a'],
    ['prodi-unusu', 'ts', '70c76ea9b5d5d3a8'],
    ['baksa-unusu', 'ts', 'e18b6c47291a03df'],
    ['baksi-unusu', 'ts', 'f29c7d58302b14ea'],
  ];
  const ports = new Set();
  for (const [app, extension, clientId] of apps) {
    const callback = registry.match(new RegExp(`"${clientId}": "http://localhost:(\\d+)/sso/callback"`));
    assert.ok(callback, `${app}: missing callback`);
    const config = readFileSync(new URL(`../../${app}/vite.config.${extension}`, import.meta.url), 'utf8');
    const port = config.match(/\bport:\s*(\d+)/)?.[1];
    assert.equal(port, callback[1], `${app}: Vite differs from seeder`);
    assert.ok(!ports.has(port), `${app}: duplicate branch port ${port}`);
    ports.add(port);
  }
  const sync = readFileSync(new URL('../prisma/dev-sso-urls.ts', import.meta.url), 'utf8');
  assert.match(sync, /Object\.entries\(LOCAL_DEV_CALLBACKS\)/);
});
