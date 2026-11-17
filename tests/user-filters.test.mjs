import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/client/pages/admin/ManajemenPengguna.tsx', import.meta.url), 'utf8');
const condition = source.match(/const hasActiveFilters = ([\s\S]*?);/)[1];
const defaults = { filterRole: 'ALL', filterStatus: 'ALL', filterFakultas: 'ALL', filterProdi: 'ALL', search: '' };
assert.equal(runInNewContext(condition, defaults), false);
assert.equal(runInNewContext(condition, { ...defaults, search: '   ' }), false);
for (const [key, value] of Object.entries({ filterRole: 'DOSEN', filterStatus: 'AKTIF', filterFakultas: 'Teknik', filterProdi: 'Informatika', search: 'nama' })) {
  assert.equal(runInNewContext(condition, { ...defaults, [key]: value }), true, key);
}

const reset = source.match(/const resetFilters = \(\) => \{([\s\S]*?)\n  \};/)[1];
const state = {};
runInNewContext(reset, {
  URLSearchParams,
  searchParams: new URLSearchParams('role=DOSEN&status=aktif&fakultas=Teknik&prodi=Informatika&keep=1'),
  setFilterRoleState: (value) => { state.role = value; },
  setFilterStatusState: (value) => { state.status = value; },
  setFilterFakultas: (value) => { state.fakultas = value; },
  setFilterProdi: (value) => { state.prodi = value; },
  setSearch: (value) => { state.search = value; },
  setSearchParams: (params, options) => {
    assert.equal(params.toString(), 'keep=1');
    assert.equal(options.replace, true);
  },
});
assert.deepEqual(state, { role: 'ALL', status: 'ALL', fakultas: 'ALL', prodi: 'ALL', search: '' });
assert.equal((source.match(/onClick=\{resetFilters\}/g) ?? []).length, 1);
const updateStatus = source.match(/const updateStatusFilter = .*?=> \{([\s\S]*?)\n  \};/)[1];
for (const role of ['ALL', 'MAHASISWA', 'DOSEN', 'SUPERADMIN']) {
  for (const status of ['ALL', 'AKTIF', 'NONAKTIF']) {
    const selected = {};
    runInNewContext(updateStatus, {
      URLSearchParams, role, newStatus: status,
      searchParams: new URLSearchParams('role=DOSEN&status=aktif&fakultas=Teknik'),
      setFilterRoleState: (value) => { selected.role = value; },
      setFilterStatusState: (value) => { selected.status = value; },
      setSearchParams: (params, options) => {
        assert.equal(params.get('role'), role === 'ALL' ? null : role);
        assert.equal(params.get('status'), status === 'ALL' ? null : status.toLowerCase());
        assert.equal(params.get('fakultas'), 'Teknik');
        assert.equal(options.replace, true);
      },
    });
    assert.deepEqual(selected, { role, status });
  }
}
assert.doesNotMatch(source, /status-akun-heading/);
console.log('PASS: setiap filter memunculkan satu reset, reset membersihkan seluruh filter dan mempertahankan parameter URL lain.');
