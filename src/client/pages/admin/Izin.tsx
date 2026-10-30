import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  KeyIcon,
  LockClosedIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import {
  PermissionItem,
  RoleItem,
  fetchAdminPermissions,
  fetchAdminRoles,
  updateAdminRolePermissions,
} from '../../services/api';

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

interface PermissionGroup {
  resource: string;
  items: PermissionItem[];
}

const ACTION_LABEL: Record<string, string> = {
  menu: 'Menu',
  view: 'Lihat',
  edit: 'Ubah',
  delete: 'Hapus',
};

const ACTION_TONE: Record<string, string> = {
  menu: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  view: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
  edit: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  delete: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
};

export const Izin: React.FC = () => {
  const { currentUser, loading, reload } = useAdminData();

  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [draft, setDraft] = useState<Record<number, string[]>>({});
  const [dirtyRoleIds, setDirtyRoleIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const loadMatrix = useCallback(async () => {
    try {
      setIsLoading(true);

      const [permissionResult, roleResult] = await Promise.allSettled([
        fetchAdminPermissions(),
        fetchAdminRoles(),
      ]);

      if (permissionResult.status === 'fulfilled' && permissionResult.value.data.status) {
        setPermissions(permissionResult.value.data.data);
      }

      if (roleResult.status === 'fulfilled' && roleResult.value.data.status) {
        const roleList = roleResult.value.data.data;
        setRoles(roleList);
        setDraft(
          roleList.reduce<Record<number, string[]>>((accumulator, role) => {
            accumulator[role.id] = [...role.permissionKeys];
            return accumulator;
          }, {})
        );
        setDirtyRoleIds([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  const groups = useMemo<PermissionGroup[]>(() => {
    const order: string[] = [];

    permissions.forEach((permission) => {
      if (!order.includes(permission.resource)) {
        order.push(permission.resource);
      }
    });

    return order.map((resource) => ({
      resource,
      items: permissions.filter((permission) => permission.resource === resource),
    }));
  }, [permissions]);

  const togglePermission = (roleId: number, key: string) => {
    setDraft((previous) => {
      const current = previous[roleId] ?? [];
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];

      return { ...previous, [roleId]: next };
    });

    setDirtyRoleIds((previous) => (previous.includes(roleId) ? previous : [...previous, roleId]));
  };

  const hasKey = (roleId: number, key: string) => (draft[roleId] ?? []).includes(key);

  const handleSave = async () => {
    if (dirtyRoleIds.length === 0) {
      setMessage({ type: 'error', text: 'Belum ada perubahan izin untuk disimpan.' });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);

      const results = await Promise.allSettled(
        dirtyRoleIds.map((roleId) => updateAdminRolePermissions(roleId, draft[roleId] ?? []))
      );

      const failed = results.filter((result) => result.status === 'rejected').length;

      if (failed > 0) {
        setMessage({
          type: 'error',
          text: `${failed} peran gagal disimpan. Periksa kembali koneksi atau hak akses Anda.`,
        });
      } else {
        setMessage({ type: 'success', text: 'Perubahan izin berhasil disimpan.' });
        setDirtyRoleIds([]);
      }

      await loadMatrix();
      await reload();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Izin"
      description="Atur matriks izin akses per peran. Setiap menu dan aksi dikendalikan oleh izin resource:action."
      onRefresh={loadMatrix}
      refreshing={isLoading || loading}
    >
      {message && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]'
              : 'bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-[#94A3B8] hover:text-[#475569]">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-[11px] text-[#475569] bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] px-3.5 py-2.5">
          <KeyIcon className="w-4 h-4 text-[#166534] flex-shrink-0 mt-0.5" />
          <p>
            Izin bertanda <span className="font-semibold">Menu</span> menentukan tampilnya item navigasi.
            Izin <span className="font-semibold">Lihat</span>, <span className="font-semibold">Ubah</span>, dan{' '}
            <span className="font-semibold">Hapus</span> membatasi akses API di server.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || dirtyRoleIds.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <span>{isSaving ? 'Menyimpan...' : `Simpan Perubahan${dirtyRoleIds.length > 0 ? ` (${dirtyRoleIds.length})` : ''}`}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-[14px] border border-[#D8E5DC] p-10 text-center text-xs text-[#64748B]">
          Memuat matriks izin...
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-xs overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#F0FDF4] border-b border-[#D8E5DC] text-[#166534] font-semibold">
                <tr>
                  <th className="py-3 px-4 sticky left-0 bg-[#F0FDF4] z-10 min-w-[240px]">Izin</th>
                  {roles.map((role) => (
                    <th key={role.id} className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1">
                          {role.isSystem && <LockClosedIcon className="w-3 h-3 text-[#94A3B8]" />}
                          <span>{role.name}</span>
                        </span>
                        <span className="text-[10px] font-medium text-[#94A3B8] normal-case">
                          {role.userCount} pengguna
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E5DC]/50">
                {groups.map((group) => (
                  <React.Fragment key={group.resource}>
                    <tr className="bg-[#F8FBF9]">
                      <td
                        colSpan={roles.length + 1}
                        className="py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-[#64748B]"
                      >
                        {group.resource}
                      </td>
                    </tr>
                    {group.items.map((permission) => (
                      <tr key={permission.id} className="hover:bg-[#F0FDF4] transition-colors">
                        <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-[#F0FDF4] z-10">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                                ACTION_TONE[permission.action] ?? 'bg-[#F1F5F2] text-[#475569] border-[#D8E5DC]'
                              }`}
                            >
                              {ACTION_LABEL[permission.action] ?? permission.action}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1E293B] truncate">{permission.label}</p>
                              <p className="text-[10px] text-[#94A3B8] font-mono">{permission.key}</p>
                            </div>
                          </div>
                        </td>
                        {roles.map((role) => (
                          <td key={role.id} className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={hasKey(role.id, permission.key)}
                              onChange={() => togglePermission(role.id, permission.key)}
                              aria-label={`${permission.key} untuk ${role.name}`}
                              className="w-4 h-4 rounded border-[#C8DDD0] text-[#166534] focus:ring-1 focus:ring-[#166534] cursor-pointer accent-[#166534]"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPanelTemplate>
  );
};
