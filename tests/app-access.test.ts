import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { PrismaClient } from '@prisma/client';
import { decideAppAccess, mapAppRole, parseAppRoles } from '../src/server/lib/appAccess.js';
import { buildSsoAppDefinitions, seedSsoApps } from '../src/server/lib/ssoApps.js';

const allowed = (target: string | null, roles: string[]) => decideAppAccess([], target, roles).allowed;
assert.equal(allowed('["ADMIN_LPM"]', ['ADMIN_LPPM']), false);
assert.equal(allowed('["ADMIN_LPM"]', ['DOSEN']), false);
assert.equal(allowed('["DOSEN"]', ['MAHASISWA', 'DOSEN']), true);
assert.equal(allowed('["STAF_UNIT"]', ['STAF_UNIT']), true);
assert.deepEqual(decideAppAccess([], '["STAF_UNIT"]', ['STAF_UNIT']).tingkat, []);
assert.equal(allowed('["STAF_UNIT"]', ['staf_unit']), false);
for (const raw of [null, '', '{}', '[1]', '["DOSEN",null]', 'not-json', '[]']) {
  assert.equal(allowed(raw, ['DOSEN']), false);
  assert.equal(allowed(raw, ['SUPERADMIN']), true);
  assert.equal(allowed(raw, ['ADMIN_SSO']), true);
}
assert.equal(allowed('["DOSEN"]', []), false);
assert.equal(decideAppAccess(['masuk_admin'], '["DOSEN"]', ['ADMIN_OTHER']).allowed, false);
assert.deepEqual(parseAppRoles('["DOSEN","DOSEN"]'), ['DOSEN']);
assert.deepEqual(JSON.parse(mapAppRole('["DOSEN","UNIT_A"]', 'UNIT_B', true)), ['DOSEN', 'UNIT_A', 'UNIT_B']);
assert.deepEqual(JSON.parse(mapAppRole('["DOSEN","UNIT_A","UNIT_B"]', 'UNIT_B', false)), ['DOSEN', 'UNIT_A']);
assert.equal(mapAppRole('["DOSEN"]', 'DOSEN', true), '["DOSEN"]');
assert.throws(() => mapAppRole('[1]', 'DOSEN', true));

const definitions = buildSsoAppDefinitions({}, { publicBaseUrl: 'http://localhost:5173', prodiBaseUrl: '', mode: 'local' });
let storedRoles = '["CUSTOM_ROLE"]';
let createdRoles: string | undefined;
let calls = 0;
const fake = { ssoApp: {
  findUnique: async () => (++calls === 1 ? { id: 1 } : null),
  update: async ({ data }: { data: { targetRoles?: string } }) => {
    assert.equal(Object.hasOwn(data, 'targetRoles'), false);
    storedRoles = data.targetRoles ?? storedRoles;
  },
  create: async ({ data }: { data: { targetRoles: string } }) => { createdRoles = data.targetRoles; }
} } as unknown as PrismaClient;
assert.deepEqual(await seedSsoApps(fake, definitions.slice(0, 2)), { createdCount: 1, updatedCount: 1 });
assert.equal(storedRoles, '["CUSTOM_ROLE"]');
assert.equal(createdRoles, definitions[1].targetRoles);
const server = readFileSync(new URL('../src/server/index.ts', import.meta.url), 'utf8');
const check = server.slice(server.indexOf('app.post("/api/v2/website/check-access"'), server.indexOf('// POST /api/v2/website/verify-token'));
assert.match(check, /serverToServerLimiter/);
assert.match(check, /typeof user_id !== "number" \|\| !Number\.isSafeInteger\(user_id\) \|\| user_id <= 0/);
assert.match(check, /clientId: client_id, clientKey: client_key, isActive: true/);
assert.match(check, /status\(422\)/);
assert.match(check, /status\(401\)/);
assert.match(check, /status\(403\)/);
assert.match(check, /data: \{ allowed: decideAppAccess\(\[\], ssoApp.targetRoles, roles\)\.allowed, roles \}/);
assert.doesNotMatch(check, /req\.query|console\.|user\.email|user\.nama/);
console.log('Application access decisions, single-role mapping, and seed preservation passed.');
