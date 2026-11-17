import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function defaultPort(config, app) {
  assert.match(config, /import\s*\{[^}]*\bloadEnv\b[^}]*\}\s*from ['"]vite['"]/, `${app}: missing loadEnv import`);
  assert.match(config, /loadEnv\(mode,\s*process\.cwd\(\),\s*['"]['"]\)/, `${app}: missing mode env loading`);
  assert.match(config, /\bport,/, `${app}: server must use parsed port`);
  assert.match(config, /strictPort:\s*true/, `${app}: port fallback must be disabled`);
  const parser = config.match(/const port = Number\(env\.DEV_PORT \|\| (\d+)\);?\s*(if \(!Number\.isInteger\(port\) \|\| port < 1 \|\| port > 65535\) throw new Error\('[^']+'\));?/);
  assert.ok(parser, `${app}: missing validated DEV_PORT with local default`);
  const parse = new Function('env', `${parser[0]}; return port;`);
  assert.equal(parse({}), Number(parser[1]));
  for (const port of ['1', '6200', '65535']) assert.equal(parse({ DEV_PORT: port }), Number(port));
  for (const port of ['0', '-1', '65536', '1.5', 'abc', ' ', 'Infinity']) {
    assert.throws(() => parse({ DEV_PORT: port }), /DEV_PORT/, `${app}: accepted invalid port ${port}`);
  }
  return parser[1];
}

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
  const portal = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  const portalPort = defaultPort(portal, 'one-unusu');
  assert.equal(portalPort, '5173');
  ports.add(portalPort);
  for (const [app, extension, clientId] of apps) {
    const callback = registry.match(new RegExp(`"${clientId}": "http://localhost:(\\d+)/sso/callback"`));
    assert.ok(callback, `${app}: missing callback`);
    const config = readFileSync(new URL(`../../${app}/vite.config.${extension}`, import.meta.url), 'utf8');
    const port = defaultPort(config, app);
    assert.equal(port, callback[1], `${app}: Vite differs from seeder`);
    assert.ok(!ports.has(port), `${app}: duplicate branch port ${port}`);
    ports.add(port);
  }
  const sync = readFileSync(new URL('../prisma/dev-sso-urls.ts', import.meta.url), 'utf8');
  assert.match(sync, /buildSsoAppDefinitions\(/);
  assert.match(sync, /mode:\s*['"]local['"]/);
});

test('development proxy targets can be overridden without changing proxy semantics', () => {
  for (const app of ['one-unusu', 'lpm-unusu', 'lppm-unusu', 'esurat-unusu', 'prodi-unusu', 'baksa-unusu', 'baksi-unusu']) {
    const config = readFileSync(new URL(`../../${app}/vite.config.ts`, import.meta.url), 'utf8');
    assert.match(config, /target:\s*env\.DEV_API_TARGET\s*\|\|\s*['"]http:\/\/localhost:\d+['"]/, `${app}: missing dev API target override`);
    assert.doesNotMatch(config, /target:\s*['"]/, `${app}: unconditional proxy URL`);
    if (app === 'lpm-unusu') assert.match(config, /target:\s*env\.VITE_ONE_UNUSU_URL\s*\|\|\s*['"]http:\/\/localhost:5173['"]/);
  }
});
