import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSsoAppDefinitions, LOCAL_DEV_CALLBACKS } from "../src/server/lib/ssoApps.js";

const options = { publicBaseUrl: "http://localhost:5183", prodiBaseUrl: "" };
const suffixes = ["UNUSU_LMS", "LPPM_UNUSU", "LPM_UNUSU", "ESURAT_UNUSU", "SDM_SARPRAS", "UNUSU_AKREDITASI", "PRODI_UNUSU", "BAKSA_UNUSU", "BAKSI_UNUSU"];
const callbacks = Object.fromEntries(suffixes.map((suffix) => [
  `SSO_CALLBACK_URL_${suffix}`, `https://${suffix.toLowerCase().replaceAll("_", "-")}.example.org/sso/callback`,
]));

const local = buildSsoAppDefinitions({}, { ...options, mode: "local" });
assert.equal(local.length, 9);
const frontendPorts = [new URL(options.publicBaseUrl).port, ...local.map((app) => new URL(app.urlRedirect).port)];
assert.equal(new Set(frontendPorts).size, frontendPorts.length, "Port portal dan callback aplikasi harus berbeda");
for (const app of local) assert.equal(app.urlRedirect, LOCAL_DEV_CALLBACKS[app.clientId]);
assert.equal(buildSsoAppDefinitions({}, options)[0].urlRedirect, local[0].urlRedirect);
assert.equal(buildSsoAppDefinitions({ SSO_CALLBACK_URL_UNUSU_LMS: " http://localhost:6200/sso/callback " }, options)[0].urlRedirect, "http://localhost:6200/sso/callback");

for (const env of [{ NODE_ENV: "production" }, { SSO_ENV: "production" }, { SSO_ENV: "vps" }]) {
  assert.throws(() => buildSsoAppDefinitions(env, { ...options, mode: "local" }), /local/);
}
assert.throws(() => buildSsoAppDefinitions({}, { ...options, mode: "vps" }), /SSO_CALLBACK_URL_UNUSU_LMS/);
assert.throws(() => buildSsoAppDefinitions({ NODE_ENV: "production" }, options), /SSO_CALLBACK_URL_UNUSU_LMS/);
assert.throws(() => buildSsoAppDefinitions({ SSO_ENV: "invalid" }, options), /SSO_ENV/);

const production = buildSsoAppDefinitions({ ...callbacks, NODE_ENV: "production" }, { ...options, mode: "vps" });
production.forEach((app, index) => assert.equal(app.urlRedirect, callbacks[`SSO_CALLBACK_URL_${suffixes[index]}`]));
for (const suffix of suffixes) {
  const env = { ...callbacks };
  delete env[`SSO_CALLBACK_URL_${suffix}`];
  assert.throws(() => buildSsoAppDefinitions(env, { ...options, mode: "vps" }), new RegExp(`SSO_CALLBACK_URL_${suffix}`));
}
for (const value of ["/relative", "javascript:alert(1)", "ftp://example.org/callback", "https://user:password@example.org/callback"]) {
  assert.throws(() => buildSsoAppDefinitions({ SSO_CALLBACK_URL_UNUSU_LMS: value }, options), /SSO_CALLBACK_URL_UNUSU_LMS/);
}
for (const host of ["localhost", "LOCALHOST.", "app.localhost", "127.0.0.1", "127.23.45.67", "2130706433", "[::1]", "[::ffff:127.0.0.1]", "0.0.0.0", "[::]"]) {
  assert.throws(() => buildSsoAppDefinitions({ ...callbacks, SSO_CALLBACK_URL_UNUSU_LMS: `http://${host}/sso/callback` }, { ...options, mode: "vps" }), /loopback/);
}
for (const mode of ["local", "vps"]) {
  const source = readFileSync(new URL(`../prisma/${mode === "local" ? "dev" : "vps"}-sso-urls.ts`, import.meta.url), "utf8");
  assert.match(source, /buildSsoAppDefinitions\(process\.env/);
  assert.ok(source.includes(`mode: "${mode}"`));
  assert.match(source, /for \(const \{ clientId, urlRedirect \} of apps\)/);
  assert.doesNotMatch(source, /VPS_CALLBACKS|Object\.entries\(LOCAL_DEV_CALLBACKS\)|https?:\/\/|console\.log\([^\n]*\$\{urlRedirect\}/);
}
console.log("SSO callback registry and script checks passed.");
