import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { NotificationModal } from '../../components/NotificationModal';
import { useAdminData } from '../../hooks/useAdminData';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { fetchAdminPermissions, fetchAdminRoles, fetchAdminRoleApps, updateAdminRoleApps, updateAdminRolePermissions, PermissionItem, RoleItem, RoleAppItem } from '../../services/api';
import { RESOURCE_LABEL } from './Izin';

export const PeranIzin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, reload } = useAdminData();
  const [role, setRole] = useState<RoleItem | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [apps, setApps] = useState<RoleAppItem[]>([]);
  const [appIds, setAppIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const canEdit = hasPermission(currentUser, PERMISSIONS.permissionView)
    && hasPermission(currentUser, PERMISSIONS.permissionEdit);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setRole(null);
    try {
      if (!id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
        throw new Error('ID peran tidak valid.');
      }
      const [catalog, roles, applications] = await Promise.all([fetchAdminPermissions(), fetchAdminRoles(), fetchAdminRoleApps(Number(id))]);
      if (!catalog.data.status || !roles.data.status || !applications.data.status) throw new Error('Gagal memuat izin peran.');
      const selected = roles.data.data.find((item) => item.id === Number(id));
      if (!selected) throw new Error('Peran tidak ditemukan.');
      setRole(selected);
      setPermissions(catalog.data.data);
      setKeys([...selected.permissionKeys]);
      setApps(applications.data.data);
      setAppIds(applications.data.data.filter((app) => app.selected && app.isActive).map((app) => app.id));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat izin peran.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role || !canEdit || loading || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await updateAdminRolePermissions(role.id, keys);
      if (!result.data.status) throw new Error(result.data.message || 'Gagal menyimpan izin.');
      const applicationResult = await updateAdminRoleApps(role.id, appIds);
      if (!applicationResult.data.status) throw new Error('Gagal menyimpan akses aplikasi.');
      setSaved(true);
    } catch {
      setError('Penyimpanan belum lengkap. Izin tindakan mungkin sudah tersimpan; periksa hak akses dan coba kembali.');
    } finally {
      setSaving(false);
    }
    try {
      await reload();
    } catch {
      setError('Gagal memuat ulang sesi. Muat ulang halaman untuk memastikan hak akses terbaru.');
    }
  };

  const groups = [...new Set(permissions.map((permission) => permission.resource))];

  return (
    <AdminPanelTemplate user={currentUser} title={role ? `Atur Izin — ${role.name}` : 'Atur Izin Peran'} description="Tautkan izin berdasarkan kelompok modul."
      headerAction={<Link to="/admin/peran" className="self-end shrink-0 inline-flex items-center px-4 py-3 rounded-lg border border-[#D8E5DC] bg-white text-xs font-semibold text-[#166534] hover:bg-[#F0FDF4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]">Kembali ke Peran</Link>}
    >
      {loading ? <p role="status">Memuat izin peran...</p> : !role ? (
        <button type="button" onClick={() => void load()} className="text-sm text-[#166534]">Coba Lagi</button>
      ) : (
        <form onSubmit={save} className="space-y-4" aria-busy={saving}>
          <fieldset disabled={saving || !canEdit} className="bg-white border border-[#D8E5DC] rounded-[16px] p-6">
            <legend className="px-2 text-sm font-bold text-[#1E293B]">Akses Aplikasi</legend>
            <p className="text-xs text-[#475569] mb-3">Seluruh pengguna peran ini dapat masuk ke aplikasi yang dipilih. Izin tindakan di dalam aplikasi diatur terpisah. SUPERADMIN dan ADMIN_SSO selalu dapat masuk.</p>
            {apps.length === 0 && <p className="text-sm text-[#475569]">Belum ada aplikasi terdaftar.</p>}
            <ol className="space-y-1">
              {apps.map((app, index) => <li key={app.id}>
                <label className="flex items-center gap-3 py-3 border-b border-[#D8E5DC] text-xs">
                  <span className="w-8 text-center tabular-nums text-[#475569]">{index + 1}.</span>
                  <input type="checkbox" checked={role.code === 'SUPERADMIN' || role.code === 'ADMIN_SSO' || (app.isActive ? appIds.includes(app.id) : app.selected)}
                    disabled={!app.isActive || !app.canGrant || role.code === 'SUPERADMIN' || role.code === 'ADMIN_SSO'}
                    onChange={(event) => { const checked = event.target.checked; setAppIds((previous) => checked ? [...previous, app.id] : previous.filter((value) => value !== app.id)); }}
                    className="h-4 w-4 accent-[#166534] focus:ring-[#166534]" />
                  <span className="font-semibold text-[#1E293B]">{app.nameApp}{!app.isActive ? ' — Nonaktif' : !app.canGrant ? ' — Tidak dapat diubah' : ''}</span>
                </label>
              </li>)}
            </ol>
          </fieldset>
          {permissions.length === 0 && <p className="text-sm text-[#64748B]">Belum ada izin pada katalog.</p>}
          {groups.map((resource) => (
            <fieldset key={resource} disabled={saving || !canEdit} className="bg-white border border-[#D8E5DC] rounded-[16px] p-6">
              <legend className="px-2 text-sm font-bold text-[#1E293B]">{RESOURCE_LABEL[resource] ?? resource.replace(/_/g, ' ')}</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                {permissions.filter((permission) => permission.resource === resource).map((permission) => (
                  <label key={permission.id} className="flex items-start gap-3 py-3 border-b border-[#D8E5DC] text-xs">
                    <input type="checkbox" checked={keys.includes(permission.key)} onChange={(event) => {
                      const checked = event.target.checked;
                      setKeys((previous) => checked ? [...previous, permission.key] : previous.filter((key) => key !== permission.key));
                    }} className="mt-0.5 h-4 w-4 accent-[#166534] focus:ring-[#166534]" />
                    <div><p className="font-semibold text-[#1E293B]">{permission.label}</p><p className="font-mono text-[#64748B] mt-1">{permission.key}</p></div>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button type="submit" disabled={saving || !canEdit} className="px-4 py-3 rounded-lg bg-[#166534] text-white text-xs font-semibold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Izin'}</button>
        </form>
      )}
      <NotificationModal isOpen={saved} type="success" title="Izin Disimpan" message="Penautan izin peran berhasil diperbarui." onClose={() => setSaved(false)} />
      <NotificationModal isOpen={Boolean(error)} type="error" title="Gagal Memproses Izin" message={error} onClose={() => setError('')} />
    </AdminPanelTemplate>
  );
};
