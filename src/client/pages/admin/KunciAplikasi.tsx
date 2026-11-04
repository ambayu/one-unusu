import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  KeyIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { ROLE_LABELS } from '../../lib/landing';
import {
  AppAccessMatrix,
  AppAccessMatrixApp,
  AppAccessMatrixUser,
  fetchAppAccessMatrix,
  updateAppAccessUsers,
} from '../../services/api';

interface Feedback {
  type: 'success' | 'error';
  text: string;
}

/**
 * Matriks kunci admin per aplikasi.
 *
 * Halaman ini melengkapi pengaturan dari sisi pengguna (Manajemen Pengguna →
 * "Kunci Aplikasi"): di sini admin memilih satu aplikasi cabang lalu
 * menentukan akun tata kelola mana yang dikunci ke aplikasi tersebut.
 */
export const KunciAplikasi: React.FC = () => {
  const { currentUser, loading: loadingUser, reload } = useAdminData();

  const [matrix, setMatrix] = useState<AppAccessMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Feedback | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const canEdit = hasPermission(currentUser, PERMISSIONS.applicationEdit);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      const res = await fetchAppAccessMatrix();
      if (res.data.status) {
        setMatrix(res.data.data);
        setSelectedAppId((prev) => {
          if (prev && res.data.data.apps.some((app) => app.id === prev)) return prev;
          return res.data.data.apps[0]?.id ?? null;
        });
      } else {
        setMessage({ type: 'error', text: 'Gagal memuat matriks kunci aplikasi.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal memuat matriks kunci aplikasi. Coba lagi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMatrix();
  }, []);

  const selectedApp: AppAccessMatrixApp | null = useMemo(() => {
    if (!matrix || selectedAppId === null) return null;
    return matrix.apps.find((app) => app.id === selectedAppId) ?? null;
  }, [matrix, selectedAppId]);

  // Sinkronkan centang saat aplikasi terpilih berganti.
  useEffect(() => {
    if (!selectedApp) {
      setSelectedUserIds([]);
      return;
    }
    setSelectedUserIds(selectedApp.grantedUserIds);
    setUserSearch('');
  }, [selectedApp?.id]);

  const filteredUsers = useMemo(() => {
    const users = matrix?.users ?? [];
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;

    return users.filter(
      (user) =>
        user.nama.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term),
    );
  }, [matrix, userSearch]);

  const toggleUser = (userId: number) => {
    if (!canEdit) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const isDirty = useMemo(() => {
    if (!selectedApp) return false;
    const current = [...selectedApp.grantedUserIds].sort((a, b) => a - b);
    const next = [...selectedUserIds].sort((a, b) => a - b);
    return current.length !== next.length || current.some((id, index) => id !== next[index]);
  }, [selectedApp, selectedUserIds]);

  const handleSave = async () => {
    if (!selectedApp || !canEdit) return;

    try {
      setSaving(true);
      const res = await updateAppAccessUsers(selectedApp.id, selectedUserIds);
      setMessage({
        type: res.data.status ? 'success' : 'error',
        text: res.data.message || 'Kunci admin aplikasi disimpan.',
      });
      await loadMatrix();
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setMessage({ type: 'error', text: text || 'Gagal menyimpan kunci admin aplikasi.' });
    } finally {
      setSaving(false);
    }
  };

  const totalGrants = useMemo(
    () => (matrix?.apps ?? []).reduce((sum, app) => sum + app.grantedCount, 0),
    [matrix],
  );
  const lockedUsers = useMemo(
    () => (matrix?.users ?? []).filter((user) => user.locked).length,
    [matrix],
  );

  const roleChips = (app: AppAccessMatrixApp): string[] => {
    try {
      const parsed: unknown = JSON.parse(app.targetRoles);
      return Array.isArray(parsed) ? parsed.map((role) => String(role)) : [];
    } catch {
      return [];
    }
  };

  const userBadge = (user: AppAccessMatrixUser) =>
    user.role === 'SUPERADMIN'
      ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
      : user.role === 'ADMIN_SSO'
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-[#F1F5F2] text-[#475569] border-[#D8E5DC]';

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Kunci Admin per Aplikasi"
      description="Tentukan akun tata kelola mana yang boleh membuka tiap aplikasi cabang SSO. Kunci eksplisit mengaktifkan mode allowlist."
      onRefresh={async () => {
        await loadMatrix();
        await reload();
      }}
      refreshing={loading || loadingUser}
    >
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]'
              : 'bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-[#94A3B8] hover:text-[#475569]">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: 'Aplikasi Cabang',
            value: matrix?.apps.length ?? 0,
            hint: 'Terdaftar di registry SSO',
            icon: Squares2X2Icon,
            tone: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]',
          },
          {
            label: 'Akun Tata Kelola',
            value: matrix?.users.length ?? 0,
            hint: 'Superadmin & admin aplikasi',
            icon: UsersIcon,
            tone: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]',
          },
          {
            label: 'Kunci Aktif',
            value: totalGrants,
            hint: 'Pasangan admin ↔ aplikasi',
            icon: KeyIcon,
            tone: 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]',
          },
          {
            label: 'Akun Terkunci',
            value: lockedUsers,
            hint: 'Mode allowlist aktif',
            icon: LockClosedIcon,
            tone: 'bg-[#F1F5F2] border-[#D8E5DC] text-[#475569]',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-4 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#64748B]">{stat.label}</span>
              <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stat.value}</p>
              <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{stat.hint}</p>
            </div>
            <div
              className={`w-11 h-11 rounded-[12px] border flex items-center justify-center flex-shrink-0 ${stat.tone}`}
            >
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="h-64 rounded-[14px] border border-[#D8E5DC] bg-white animate-pulse" />
          <div className="h-64 rounded-[14px] border border-[#D8E5DC] bg-white animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Daftar aplikasi */}
          <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E8EFEA] bg-[#F9FDFB]">
              <p className="text-xs font-bold text-[#1E293B]">Aplikasi Cabang</p>
              <p className="text-[11px] text-[#64748B]">Pilih aplikasi untuk mengatur kuncinya.</p>
            </div>
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-[#D8E5DC]/60">
              {(matrix?.apps ?? []).map((app) => {
                const active = app.id === selectedAppId;
                return (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedAppId(app.id)}
                      aria-pressed={active}
                      className={`w-full text-left px-4 py-3 min-h-[56px] transition flex items-start justify-between gap-2 ${
                        active
                          ? 'bg-[#F0FDF4] border-l-4 border-[#166534]'
                          : 'border-l-4 border-transparent hover:bg-[#F9FDFB]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            active ? 'text-[#166534]' : 'text-[#1E293B]'
                          }`}
                        >
                          {app.nameApp}
                        </p>
                        <p className="text-[10px] font-mono text-[#94A3B8] truncate">{app.clientId}</p>
                      </div>
                      <span
                        className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          app.grantedCount > 0
                            ? 'bg-[#166534] text-white border-[#166534]'
                            : 'bg-white text-[#64748B] border-[#D8E5DC]'
                        }`}
                      >
                        {app.grantedCount}
                      </span>
                    </button>
                  </li>
                );
              })}
              {(matrix?.apps.length ?? 0) === 0 && (
                <li className="px-4 py-8 text-center text-xs text-[#94A3B8]">
                  Belum ada aplikasi terdaftar.
                </li>
              )}
            </ul>
          </div>

          {/* Panel kunci */}
          <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-xs overflow-hidden">
            {!selectedApp ? (
              <div className="px-6 py-16 text-center">
                <Squares2X2Icon className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                <p className="mt-2 text-xs font-semibold text-[#475569]">
                  Pilih aplikasi di sebelah kiri untuk mulai mengatur kunci admin.
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-[#E8EFEA] bg-[#F9FDFB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#1E293B] truncate">{selectedApp.nameApp}</h2>
                    <p className="text-[10px] font-mono text-[#94A3B8] truncate">{selectedApp.clientId}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {roleChips(selectedApp).map((role) => (
                        <span
                          key={role}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#F1F5F2] text-[#475569] border border-[#D8E5DC]"
                        >
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`self-start sm:self-auto px-2 py-1 rounded-full text-[10px] font-bold border ${
                      selectedApp.isActive
                        ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                        : 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]'
                    }`}
                  >
                    {selectedApp.isActive ? 'Aplikasi aktif' : 'Aplikasi nonaktif'}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="p-3 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] leading-relaxed flex items-start gap-2">
                    <ShieldCheckIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Mencentang akun di sini membuat akun tersebut beroperasi dalam{' '}
                      <strong>mode allowlist</strong>: hanya aplikasi yang dikunci untuknya yang bisa
                      dibuka, meskipun perannya mengizinkan aplikasi lain. Kosongkan semua centang
                      untuk mengembalikan akses berbasis peran (<em>targetRoles</em>).
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        placeholder="Cari nama, username, atau peran..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[#64748B] whitespace-nowrap">
                      {selectedUserIds.length} dipilih
                    </span>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto -mx-1 px-1 space-y-1.5">
                    {filteredUsers.map((user) => {
                      const checked = selectedUserIds.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className={`flex items-start gap-3 p-2.5 rounded-[10px] border transition ${
                            canEdit ? 'cursor-pointer' : 'cursor-not-allowed'
                          } ${
                            checked
                              ? 'bg-[#F0FDF4] border-[#166534]'
                              : 'bg-white border-[#D8E5DC] hover:bg-[#F9FDFB]'
                          } ${!user.isActive ? 'opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canEdit}
                            onChange={() => toggleUser(user.id)}
                            className="mt-0.5 w-4 h-4 accent-[#166534] flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#1E293B] truncate">
                              {user.nama}
                            </p>
                            <p className="text-[10px] font-mono text-[#94A3B8] truncate">
                              {user.username}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${userBadge(user)}`}
                            >
                              {ROLE_LABELS[user.role] ?? user.role}
                            </span>
                            {!user.isActive && (
                              <span className="text-[9px] font-bold text-[#B91C1C]">Nonaktif</span>
                            )}
                          </div>
                        </label>
                      );
                    })}

                    {filteredUsers.length === 0 && (
                      <p className="py-8 text-center text-xs text-[#94A3B8]">
                        Tidak ada akun tata kelola yang cocok dengan pencarian.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-[#E8EFEA]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedUserIds([])}
                        disabled={!canEdit || selectedUserIds.length === 0}
                        className="text-[11px] font-semibold text-[#64748B] hover:text-[#B91C1C] underline underline-offset-2 self-start disabled:opacity-40 disabled:no-underline"
                      >
                        Kosongkan centang (ikuti peran)
                      </button>

                      {selectedApp.defaultAdminRole && (
                        <button
                          type="button"
                          onClick={() => {
                            const seeded = (matrix?.users ?? [])
                              .filter((user) => user.role === selectedApp.defaultAdminRole)
                              .map((user) => user.id);
                            setSelectedUserIds((prev) =>
                              Array.from(new Set([...prev, ...seeded])),
                            );
                          }}
                          disabled={!canEdit}
                          className="text-[11px] font-semibold text-[#166534] hover:text-[#14532D] underline underline-offset-2 self-start disabled:opacity-40 disabled:no-underline"
                          title="Tambahkan akun dengan peran pengelola bawaan sesuai seed"
                        >
                          Pilih pengelola bawaan ({ROLE_LABELS[selectedApp.defaultAdminRole] ?? selectedApp.defaultAdminRole})
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedUserIds(selectedApp.grantedUserIds)}
                        disabled={!canEdit || !isDirty}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-[8px] bg-white hover:bg-[#F1F5F2] text-[#475569] border border-[#D8E5DC] text-xs font-semibold transition disabled:opacity-40"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        Batalkan
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canEdit || !isDirty || saving}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold shadow-xs transition disabled:opacity-40"
                      >
                        <KeyIcon className="w-3.5 h-3.5" />
                        {saving ? 'Menyimpan...' : 'Simpan Kunci'}
                      </button>
                    </div>
                  </div>

                  {!canEdit && (
                    <p className="text-[11px] text-[#B45309]">
                      Peran Anda hanya dapat melihat matriks ini. Perubahan memerlukan izin
                      application:edit.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminPanelTemplate>
  );
};

export default KunciAplikasi;
