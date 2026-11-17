import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FunnelIcon,
  KeyIcon,
  TrashIcon,
  XMarkIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';
import {
  PermissionItem,
  cleanupUnusedPermissions,
  syncAdminPermissions,
  fetchAdminPermissions,
  createAdminPermission,
} from '../../services/api';

interface PermissionGroup {
  resource: string;
  items: PermissionItem[];
}

const ACTION_LABEL: Record<string, string> = {
  menu: 'Menu',
  view: 'Lihat',
  edit: 'Ubah',
  delete: 'Hapus',
  export: 'Ekspor',
  upload: 'Unggah',
  access: 'Akses Penuh',
};

export const RESOURCE_LABEL: Record<string, string> = {
  dashboard: 'Dashboard SSO',
  profile: 'Biodata Pengguna',
  application: 'Registrasi SSO',
  non_sso: 'Aplikasi Non-SSO',
  slider: 'Slider Hero',
  user: 'Manajemen Pengguna',
  permission: 'Izin',
  role: 'Peran',
  api_hub: 'Integrasi & API Hub',
  berkas_dosen: 'Berkas Dosen',
  superadmin: 'Otoritas Superadmin',
};

const ACTION_TONE: Record<string, string> = {
  menu: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  view: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
  edit: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  delete: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  export: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  upload: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  access: 'bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]',
};

export const Izin: React.FC = () => {
  const { currentUser, loading } = useAdminData();

  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'used' | 'unused'>('all');
  const [notify, setNotify] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  // State Tambah Izin Baru
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResource, setNewResource] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isSubmittingPerm, setIsSubmittingPerm] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  const loadPermissions = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await fetchAdminPermissions();
      if (res.data.status) {
        setPermissions(res.data.data);
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memuat Izin',
          message: 'Gagal memuat katalog izin.',
        });
      }
    } catch {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memuat Izin',
        message: 'Gagal menghubungi server untuk memuat katalog izin.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const handleCleanup = async () => {
    setShowCleanupConfirm(false);
    try {
      setIsCleaning(true);
      const res = await cleanupUnusedPermissions();
      if (res.data.status) {
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Pembersihan Berhasil',
          message: res.data.message || 'Izin yang tidak digunakan berhasil dibersihkan dari database.',
        });
        await loadPermissions();
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Membersihkan Izin',
          message: res.data.message || 'Gagal membersihkan izin yang tidak digunakan.',
        });
      }
    } catch {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: 'Gagal menghubungi server untuk pembersihan izin.',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSyncCatalog = async () => {
    try {
      setIsSyncing(true);
      const res = await syncAdminPermissions();
      if (res.data.status) {
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Sinkronisasi Selesai',
          message: res.data.message || 'Katalog izin sub-menu berhasil disinkronkan dengan spesifikasi sistem.',
        });
        await loadPermissions();
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Menyinkronkan',
          message: res.data.message || 'Gagal menyinkronkan katalog izin.',
        });
      }
    } catch {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: 'Gagal menghubungi server untuk sinkronisasi izin.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredPermissions = useMemo(() => {
    if (filterMode === 'used') {
      return permissions.filter((p) => (p.roleCount ?? 0) > 0);
    }
    if (filterMode === 'unused') {
      return permissions.filter((p) => (p.roleCount ?? 0) === 0);
    }
    return permissions;
  }, [permissions, filterMode]);

  const unusedCount = useMemo(() => {
    return permissions.filter((p) => (p.roleCount ?? 0) === 0).length;
  }, [permissions]);

  const groups = useMemo<PermissionGroup[]>(() => {
    const order: string[] = [];

    filteredPermissions.forEach((permission) => {
      if (!order.includes(permission.resource)) {
        order.push(permission.resource);
      }
    });

    return order.map((resource) => ({
      resource,
      items: filteredPermissions.filter((permission) => permission.resource === resource),
    }));
  }, [filteredPermissions]);

  /**
   * Nomor urut tiap izin, melanjutkan lintas kelompok.
   *
   * Katalog izin dikelompokkan per resource, sehingga menghitung nomor dari
   * indeks di dalam kelompok akan mengulang 1, 2, 3 pada setiap kelompok.
   * Peta ini memberi satu deret utuh dari atas ke bawah saat tabel dibaca.
   */
  const nomorIzin = useMemo(() => {
    const peta = new Map<number, number>();
    let urut = 0;
    groups.forEach((group) => {
      group.items.forEach((permission) => {
        urut += 1;
        peta.set(permission.id, urut);
      });
    });
    return peta;
  }, [groups]);

  const handleCreatePermission = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newResource.trim() || !newAction.trim()) {
      setNotify({
        isOpen: true,
        type: 'warning',
        title: 'Formulir Belum Lengkap',
        message: 'Resource/Aplikasi dan Aksi izin wajib diisi sebelum menyimpan.',
      });
      return;
    }

    try {
      setIsSubmittingPerm(true);
      const res = await createAdminPermission({
        resource: newResource.trim(),
        action: newAction.trim(),
        label: newLabel.trim() || undefined,
      });

      if (res.data.status) {
        setShowAddModal(false);
        setNewResource('');
        setNewAction('');
        setNewLabel('');
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Izin Ditambahkan',
          message: res.data.message || 'Izin baru berhasil ditambahkan ke katalog sistem.',
        });
        await loadPermissions();
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Menambah Izin',
          message: res.data.message || 'Gagal menambahkan izin ke katalog.',
        });
      }
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: text || 'Gagal menambahkan izin baru.',
      });
    } finally {
      setIsSubmittingPerm(false);
    }
  };

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Izin"
      description="Kelola katalog izin menu dan aksi. Penetapan izin untuk setiap peran dilakukan melalui menu Peran."
      onRefresh={loadPermissions}
      refreshing={isLoading || loading}
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncCatalog}
            disabled={isSyncing}
            title="Sinkronkan katalog izin resmi sesuai sub-menu dan bersihkan izin usang"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-white hover:bg-[#F0FDF4] text-[#166534] border border-[#D8E5DC] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sub-Menu'}</span>
          </button>

          {unusedCount > 0 && (
            <button
              onClick={() => setShowCleanupConfirm(true)}
              disabled={isCleaning}
              title="Hapus seluruh izin yang belum terikat ke role manapun"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-white hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#D8E5DC] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>{isCleaning ? 'Membersihkan...' : `Bersihkan ${unusedCount} Izin Kosong`}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white border border-[#D8E5DC] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] transition"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Tambah Izin</span>
          </button>

        </div>
      }
    >
      <div className="flex items-start gap-2.5 text-[11px] text-[#475569] bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] px-3.5 py-2.5">
        <KeyIcon className="w-4 h-4 text-[#166534] flex-shrink-0 mt-0.5" />
        <p>
          Izin bertanda <span className="font-semibold">Menu</span> menentukan tampilnya item navigasi.
          Izin <span className="font-semibold">Lihat</span>, <span className="font-semibold">Ubah</span>, dan{' '}
          <span className="font-semibold">Hapus</span> membatasi akses API di server.
        </p>
      </div>

      {/* Bar Filter Status Izin */}
      <div className="space-y-2">
        <div id="izin-filter-label" className="flex items-center gap-1.5 text-xs">
          <FunnelIcon className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="text-[11px] font-semibold text-[#64748B] mr-1">Filter Tampilan:</span>
        </div>
        <div role="group" aria-labelledby="izin-filter-label" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            aria-pressed={filterMode === 'all'}
            className={`min-h-[44px] px-4 py-3 rounded-[8px] border border-[#D8E5DC] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#166534] transition ${
              filterMode === 'all'
                ? 'bg-[#166534] text-white'
                : 'bg-white text-[#475569] border border-[#D8E5DC] hover:bg-[#F1F5F2]'
            }`}
          >
            Semua ({permissions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('used')}
            aria-pressed={filterMode === 'used'}
            className={`min-h-[44px] px-4 py-3 rounded-[8px] border border-[#D8E5DC] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#166534] transition ${
              filterMode === 'used'
                ? 'bg-[#166534] text-white'
                : 'bg-white text-[#475569] border border-[#D8E5DC] hover:bg-[#F1F5F2]'
            }`}
          >
            Terikat Role ({permissions.length - unusedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unused')}
            aria-pressed={filterMode === 'unused'}
            className={`min-h-[44px] px-4 py-3 rounded-[8px] border border-[#D8E5DC] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#166534] transition ${
              filterMode === 'unused'
                ? 'bg-[#B91C1C] text-white'
                : 'bg-white text-[#475569] border border-[#D8E5DC] hover:bg-[#F1F5F2]'
            }`}
          >
            Belum Terikat ({unusedCount})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-[14px] border border-[#D8E5DC] p-10 text-center text-xs text-[#64748B]">
          Memuat katalog izin...
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#F0FDF4] border-b border-[#D8E5DC] text-[#166534] font-semibold">
                <tr>
                  <th className="py-3 px-3 text-center sticky left-0 bg-[#F0FDF4] z-10 w-[56px]">No.</th>
                  <th className="py-3 px-4 sticky left-[56px] bg-[#F0FDF4] z-10 min-w-[240px]">Izin</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Jumlah Peran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E5DC]/50">
                {groups.map((group) => (
                  <React.Fragment key={group.resource}>
                    <tr className="bg-[#F8FBF9]">
                      <td
                        colSpan={3}
                        className="py-2.5 px-4 text-xs font-bold text-[#1E293B] border-y border-[#D8E5DC]"
                      >
                        <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#166534]"></span>
                        <span>{RESOURCE_LABEL[group.resource] ?? group.resource}</span>
                         <span className="text-[10px] font-mono text-[#64748B] lowercase">({group.resource})</span>
                        </div>
                      </td>
                    </tr>
                    {group.items.map((permission) => (
                      <tr key={permission.id} className="hover:bg-[#F0FDF4] transition-colors">
                        <td className="py-2.5 px-3 text-center sticky left-0 bg-white z-10 text-[11px] font-semibold text-[#94A3B8] tabular-nums">
                          {nomorIzin.get(permission.id)}
                        </td>
                        <td className="py-2.5 px-4 sticky left-[56px] bg-white hover:bg-[#F0FDF4] z-10">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                                ACTION_TONE[permission.action] ?? 'bg-[#F1F5F2] text-[#475569] border-[#D8E5DC]'
                              }`}
                            >
                              {ACTION_LABEL[permission.action] ?? permission.action}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-[#1E293B] truncate">{permission.label}</p>
                                {permission.roleCount === 0 && (
                                  <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                                    Belum terikat
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#94A3B8] font-mono">{permission.key}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums">
                          {permission.roleCount ?? 0}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-[#94A3B8]">
                      Tidak ada izin yang sesuai dengan filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah Izin Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[16px] border border-[#D8E5DC] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E5DC] mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">Tambah Izin Baru</h3>
                <p className="text-[11px] text-[#64748B]">Buat izin akses untuk aplikasi atau fitur.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Tutup tambah izin"
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePermission} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#475569] mb-1">
                  Resource / Aplikasi <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. lppm-unusu, esurat-unusu, dashboard"
                  value={newResource}
                  onChange={(e) => setNewResource(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
                <p className="mt-1 text-[10px] text-[#94A3B8]">Gunakan clientId aplikasi untuk izin masuk aplikasi cabang.</p>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">
                  Aksi (Action) <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. berkas_dosen:view, user:edit"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
                <p className="mt-1 text-[10px] text-[#94A3B8]">
                  Kunci yang terbentuk: <span className="font-mono font-semibold text-[#166534]">{newResource.trim() || 'resource'}:{newAction.trim() || 'action'}</span>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Label Izin</label>
                <input
                  type="text"
                  placeholder="mis. LPPM UNUSU · Masuk Administrator"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8E5DC]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[44px] px-4 py-3 rounded-lg border border-[#D8E5DC] text-sm text-[#475569] hover:bg-[#F1F5F2] font-semibold focus:outline-none focus:ring-2 focus:ring-[#166534]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPerm}
                  className="min-h-[44px] px-4 py-3 rounded-lg border border-[#D8E5DC] bg-[#166534] hover:bg-[#14532D] text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#166534] transition disabled:opacity-50"
                >
                  {isSubmittingPerm ? 'Menyimpan...' : 'Tambah Izin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Dialog Konfirmasi Pembersihan Izin Kosong */}
      <NotificationModal
        isOpen={showCleanupConfirm}
        type="confirm"
        title="Bersihkan Izin Kosong?"
        message={`Sebanyak ${unusedCount} izin yang belum terikat ke peran mana pun akan dihapus permanen dari sistem.`}
        confirmLabel="Ya, Bersihkan Izin"
        cancelLabel="Batal"
        loading={isCleaning}
        onConfirm={handleCleanup}
        onClose={() => setShowCleanupConfirm(false)}
      />

      {/* Modal Notifikasi Hasil Aksi */}
      <NotificationModal
        isOpen={notify.isOpen}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((prev) => ({ ...prev, isOpen: false }))}
      />
    </AdminPanelTemplate>
  );
};
