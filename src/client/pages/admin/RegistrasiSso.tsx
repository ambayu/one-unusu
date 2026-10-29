import React, { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  KeyIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import { createAdminApp, updateAdminApp, deleteAdminApp, SsoAppItem } from '../../services/api';
import { APP_ROLES, AppRole, ROLE_LABEL, parseTargetRoles } from '../../lib/appRoles';
import { isImageSource } from '../../lib/appIcon';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';

interface ModalNotification {
  isOpen: boolean;
  type: NotificationType;
  title?: string;
  message: string;
}

function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function slugifyClientId(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'aplikasi-unusu';

  return `${base}-${randomHex(4)}`;
}

export const RegistrasiSso: React.FC = () => {
  const { currentUser, stats, apps, loading, reload } = useAdminData();

  const [search, setSearch] = useState('');
  const [notify, setNotify] = useState<ModalNotification>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState<SsoAppItem | null>(null);
  const [appToDelete, setAppToDelete] = useState<SsoAppItem | null>(null);

  const [appName, setAppName] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [appRedirect, setAppRedirect] = useState('');
  const [appImage, setAppImage] = useState<string | null>(null);
  const [appClientId, setAppClientId] = useState('');
  const [appClientKey, setAppClientKey] = useState('');
  const [appRoles, setAppRoles] = useState<AppRole[]>(['DOSEN', 'MAHASISWA']);
  const [appIsActive, setAppIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = hasPermission(currentUser, PERMISSIONS.applicationEdit);
  const canDelete = hasPermission(currentUser, PERMISSIONS.applicationDelete);

  const filteredApps = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return apps;

    return apps.filter(
      (app) =>
        app.nameApp.toLowerCase().includes(term) ||
        app.clientId.toLowerCase().includes(term) ||
        app.urlRedirect.toLowerCase().includes(term)
    );
  }, [apps, search]);

  const generateCredentials = (name: string) => {
    setAppClientId(slugifyClientId(name));
    setAppClientKey(randomHex(48));
  };

  const openCreateModal = () => {
    setEditingApp(null);
    setAppName('');
    setAppDesc('');
    setAppRedirect('');
    setAppImage(null);
    setAppRoles(['DOSEN', 'MAHASISWA']);
    setAppIsActive(true);
    generateCredentials('aplikasi-unusu');
    setShowModal(true);
  };

  const openEditModal = (app: SsoAppItem) => {
    setEditingApp(app);
    setAppName(app.nameApp);
    setAppDesc(app.description || '');
    setAppRedirect(app.urlRedirect);
    setAppImage(isImageSource(app.icon) ? (app.icon as string) : null);
    setAppClientId(app.clientId);
    setAppClientKey(''); // opsional diubah saat edit
    setAppRoles(parseTargetRoles(app.targetRoles));
    setAppIsActive(app.isActive);
    setShowModal(true);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Format Tidak Sesuai',
        message: 'Berkas harus berupa gambar PNG, JPG, atau WebP.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAppImage(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const toggleRole = (role: AppRole) => {
    setAppRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (appRoles.length === 0) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Peran Belum Dipilih',
        message: 'Pilih minimal satu peran yang boleh mengakses aplikasi ini.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingApp) {
        const payload: Parameters<typeof updateAdminApp>[1] = {
          nameApp: appName,
          description: appDesc,
          urlRedirect: appRedirect,
          targetRoles: JSON.stringify(appRoles),
          isActive: appIsActive,
        };
        if (appImage) payload.icon = appImage;
        if (appClientKey.trim()) payload.clientKey = appClientKey.trim();

        const res = await updateAdminApp(editingApp.id, payload);
        if (res.data.status) {
          setShowModal(false);
          setNotify({
            isOpen: true,
            type: 'success',
            title: 'Berhasil Diperbarui',
            message: `Aplikasi ${appName} berhasil diperbarui.`,
          });
          await reload();
        } else {
          setNotify({
            isOpen: true,
            type: 'error',
            title: 'Gagal Memperbarui',
            message: res.data.message || 'Pembaruan aplikasi gagal.',
          });
        }
      } else {
        const res = await createAdminApp({
          clientId: appClientId,
          clientKey: appClientKey,
          nameApp: appName,
          description: appDesc,
          urlRedirect: appRedirect,
          icon: appImage || 'LayoutGrid',
          targetRoles: JSON.stringify(appRoles),
        });

        if (res.data.status) {
          setShowModal(false);
          setNotify({
            isOpen: true,
            type: 'success',
            title: 'Berhasil Didaftarkan',
            message: `Aplikasi ${appName} berhasil didaftarkan ke sistem SSO.`,
          });
          await reload();
        } else {
          setNotify({
            isOpen: true,
            type: 'error',
            title: 'Pendaftaran Gagal',
            message: res.data.message || 'Pendaftaran aplikasi gagal.',
          });
        }
      }
    } catch (error: unknown) {
      let text = '';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string }; status?: number } }).response;
        text = response?.data?.message || (response?.status === 413 ? 'Ukuran gambar terlalu besar.' : '');
      } else if (error instanceof Error) {
        text = error.message;
      }
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan',
        message: text || 'Gagal menyimpan aplikasi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!appToDelete) return;

    try {
      const res = await deleteAdminApp(appToDelete.id);
      const name = appToDelete.nameApp;
      setAppToDelete(null);
      setNotify({
        isOpen: true,
        type: 'success',
        title: 'Berhasil Dihapus',
        message: res.data.message || `Aplikasi ${name} berhasil dihapus.`,
      });
      await reload();
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setAppToDelete(null);
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menghapus',
        message: text || 'Gagal menghapus aplikasi.',
      });
    }
  };

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Registrasi SSO"
      description="Daftarkan aplikasi kampus dan kelola kredensial integrasi Single Sign-On UNUSU."
      onRefresh={reload}
      refreshing={loading}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#64748B]">Aplikasi Terdaftar</span>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalApps ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Layanan SSO aktif</p>
          </div>
          <div className="w-13 h-13 rounded-[14px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center flex-shrink-0 text-[#166534]">
            <Squares2X2Icon className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#64748B]">Token Aktif</span>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalTokens ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Tiket SSO tersimpan</p>
          </div>
          <div className="w-13 h-13 rounded-[14px] bg-[#F1F5F2] border border-[#D8E5DC] flex items-center justify-center flex-shrink-0 text-[#475569]">
            <KeyIcon className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#64748B]">Total Pengguna</span>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalUsers ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Akun civitas terdaftar</p>
          </div>
          <div className="w-13 h-13 rounded-[14px] bg-[#F1F5F2] border border-[#D8E5DC] flex items-center justify-center flex-shrink-0 text-[#475569]">
            <UsersIcon className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#64748B]">Akses Terbuka</span>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">
              {apps.filter((app) => app.isActive).length}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Aplikasi berstatus aktif</p>
          </div>
          <div className="w-13 h-13 rounded-[14px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center flex-shrink-0 text-[#166534]">
            <LinkIcon className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <MagnifyingGlassIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, client ID, atau callback..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-xs transition"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Daftarkan Aplikasi Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F0FDF4] border-b border-[#D8E5DC] text-[#166534] font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Aplikasi</th>
                <th className="py-3 px-4">Client ID</th>
                <th className="py-3 px-4">Callback URL</th>
                <th className="py-3 px-4">Akses Peran</th>
                <th className="py-3 px-4">Status</th>
                {(canEdit || canDelete) && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E5DC]/50">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={canEdit || canDelete ? 6 : 5} className="py-8 text-center text-[#94A3B8]">
                    Tidak ada aplikasi yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const roles = parseTargetRoles(app.targetRoles);
                  return (
                    <tr key={app.id} className="hover:bg-[#F0FDF4] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[10px] border border-[#D8E5DC] bg-[#F0FDF4] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {isImageSource(app.icon) ? (
                              <img
                                src={app.icon as string}
                                alt={`Gambar ${app.nameApp}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Squares2X2Icon className="w-4 h-4 text-[#166534]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1E293B]">{app.nameApp}</p>
                            <p className="text-[11px] text-[#64748B] line-clamp-1">
                              {app.description || 'Layanan digital terintegrasi.'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#475569] font-medium">
                        <span className="px-2 py-0.5 rounded bg-[#F0FDF4] border border-[#D8E5DC]">
                          {app.clientId}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#475569] max-w-xs truncate">
                        <span title={app.urlRedirect}>{app.urlRedirect}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {roles.length === 0 ? (
                            <span className="text-[10px] text-[#94A3B8]">Belum diatur</span>
                          ) : (
                            roles.map((role) => (
                              <span
                                key={role}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F1F5F2] text-[#475569] border border-[#D8E5DC]"
                              >
                                {ROLE_LABEL[role]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            app.isActive
                              ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                              : 'bg-[#F1F5F2] text-[#64748B] border-[#D8E5DC]'
                          }`}
                        >
                          {app.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(app)}
                                title="Ubah Aplikasi"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-[#F1F5F2] hover:bg-[#E8EFEA] text-[#475569] font-semibold text-[11px] transition"
                              >
                                <PencilSquareIcon className="w-3.5 h-3.5" />
                                <span>Ubah</span>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setAppToDelete(app)}
                                title="Hapus Aplikasi"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-[#FEE2E2] hover:bg-[#FECACA] text-[#B91C1C] font-semibold text-[11px] transition"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#D8E5DC] my-8">
            <div className="flex justify-between items-start pb-3.5 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-base">
                  {editingApp ? 'Ubah Aplikasi SSO' : 'Registrasi Aplikasi Baru'}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {editingApp
                    ? `Perbarui konfigurasi integrasi untuk ${editingApp.nameApp}.`
                    : 'Integrasikan portal, sistem fakultas, atau layanan eksternal ke SSO UNUSU.'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2] transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1">
                      Nama Aplikasi <span className="text-[#B91C1C]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={appName}
                      onChange={(event) => {
                        setAppName(event.target.value);
                        if (!editingApp && event.target.value.trim()) generateCredentials(event.target.value);
                      }}
                      placeholder="Contoh: Perpustakaan Digital UNUSU"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1">Deskripsi Singkat</label>
                    <textarea
                      rows={3}
                      value={appDesc}
                      onChange={(event) => setAppDesc(event.target.value)}
                      placeholder="Fungsi sistem dan informasi singkat untuk pengguna"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-[#1E293B]">Gambar Aplikasi</label>
                    {appImage && (
                      <button
                        type="button"
                        onClick={() => setAppImage(null)}
                        className="text-[10px] text-[#B91C1C] hover:underline font-semibold"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                  <div className="relative border-2 border-dashed border-[#D8E5DC] hover:border-[#166534] rounded-[12px] p-3 text-center transition flex flex-col items-center justify-center min-h-[148px] bg-[#F0FDF4]/30">
                    {appImage ? (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden">
                        <img src={appImage} alt="Pratinjau aplikasi" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-2">
                        <div className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#166534] mx-auto flex items-center justify-center">
                          <PhotoIcon className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-[#1E293B]">Klik untuk unggah gambar</p>
                        <p className="text-[10px] text-[#64748B]">PNG, JPG, atau WebP</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-1.5 font-semibold text-[#1E293B]">
                    <KeyIcon className="w-3.5 h-3.5 text-[#166534]" />
                    <span>Kredensial SSO</span>
                    <span className="text-[10px] font-normal text-[#64748B]">
                      {editingApp ? '(Client ID terkunci)' : '(dibuat otomatis)'}
                    </span>
                  </label>
                  {!editingApp && (
                    <button
                      type="button"
                      onClick={() => generateCredentials(appName || 'aplikasi-unusu')}
                      className="text-[11px] font-semibold text-[#166534] hover:text-[#14532D] inline-flex items-center gap-1 hover:underline"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      Acak Ulang
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">Client ID</label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingApp)}
                      value={appClientId}
                      onChange={(event) => setAppClientId(event.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] font-mono text-[11px] text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534] disabled:bg-[#F1F5F2] disabled:text-[#94A3B8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      Client Key {editingApp && <span className="font-normal text-[#94A3B8]">(kosongkan jika tidak diubah)</span>}
                    </label>
                    <input
                      type="text"
                      required={!editingApp}
                      value={appClientKey}
                      onChange={(event) => setAppClientKey(event.target.value)}
                      placeholder={editingApp ? 'Biarkan kosong untuk mempertahankan key lama' : ''}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] font-mono text-[11px] text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-[#64748B]">
                  {editingApp
                    ? 'Client ID tidak dapat diubah agar callback aplikasi yang sedang berjalan tidak terputus.'
                    : 'Nilai dibuat dari nama aplikasi. Boleh diubah manual sebelum disimpan.'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1.5">
                  Peran yang Diizinkan <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {APP_ROLES.map((role) => {
                    const active = appRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border transition ${
                          active
                            ? 'bg-[#166534] text-white border-[#166534]'
                            : 'bg-white text-[#475569] border-[#D8E5DC] hover:bg-[#F0FDF4]'
                        }`}
                      >
                        {ROLE_LABEL[role]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Callback URL <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    type="url"
                    required
                    value={appRedirect}
                    onChange={(event) => setAppRedirect(event.target.value)}
                    placeholder="http://localhost:5174/sso/callback"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#D8E5DC] rounded-[8px] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
                <p className="text-[10px] text-[#64748B] mt-1">
                  URL tujuan penerimaan tiket token SSO di aplikasi tujuan.
                </p>
              </div>

              {editingApp && (
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Status Keaktifan</label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#1E293B]">
                    <input
                      type="checkbox"
                      checked={appIsActive}
                      onChange={(e) => setAppIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-[#D8E5DC] text-[#166534] focus:ring-[#166534] accent-[#166534]"
                    />
                    <span>Aplikasi aktif dan dapat diakses pengguna di Dashboard SSO</span>
                  </label>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#E8EFEA]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-[8px] text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-bold text-xs shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmitting
                    ? editingApp
                      ? 'Menyimpan...'
                      : 'Mendaftarkan...'
                    : editingApp
                      ? 'Simpan Perubahan'
                      : 'Daftarkan Aplikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Notifikasi Sukses / Error */}
      <NotificationModal
        isOpen={notify.isOpen}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modal Konfirmasi Hapus */}
      <NotificationModal
        isOpen={Boolean(appToDelete)}
        type="confirm"
        title="Hapus Aplikasi SSO?"
        message={`Aplikasi "${appToDelete?.nameApp}" (${appToDelete?.clientId}) akan dihapus permanen beserta seluruh tiket SSO terkait. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Aplikasi"
        cancelLabel="Batal"
        onConfirm={handleDelete}
        onClose={() => setAppToDelete(null)}
      />
    </AdminPanelTemplate>
  );
};
