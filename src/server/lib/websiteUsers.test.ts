import assert from "node:assert/strict";
import { validasiIdsPengguna } from "./websiteUsers.js";

assert.deepEqual(validasiIdsPengguna({}), {});
assert.deepEqual(validasiIdsPengguna({ ids: [2, 1, 2] }), { ids: [2, 1] });
assert.equal(validasiIdsPengguna({ ids: Array.from({ length: 50 }, (_, i) => i + 1) }).ids?.length, 50);
for (const ids of [undefined, null, "1", 1, {}, [], ["1"], [true], [null], [0], [-1], [1.5], [NaN], [Infinity], [Number.MAX_SAFE_INTEGER + 1], [1, "2"], Array(51).fill(1)]) {
  assert.ok(validasiIdsPengguna({ ids }).error, `Harus menolak ids: ${String(ids)}`);
}
assert.deepEqual(validasiIdsPengguna({ ids: [Number.MAX_SAFE_INTEGER] }).ids, [Number.MAX_SAFE_INTEGER]);
for (const key of ["search", "role", "fakultas", "prodi", "limit"]) {
  for (const value of ["", null, undefined, 20]) {
    assert.ok(validasiIdsPengguna({ ids: [1], [key]: value }).error, `Harus menolak kombinasi ${key}`);
  }
}
console.log("websiteUsers: validasi ids lulus");
