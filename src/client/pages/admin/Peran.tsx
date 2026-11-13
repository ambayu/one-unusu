import React, { useCallback, useEffect, useState } from 'react';
import {
  LockClosedIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';
import {
  RoleItem,
  createAdminRole,
  deleteAdminRole,
  fetchAdminRoles,
  updateAdminRole,
} from '../../services/api';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

interface RoleFormState {
  code: string;
  name: string;
  description: string;
}

const EMPTY_FORM: RoleFormState = { code: '', name: '', description: '' };

export const Peran: React.FC = () => {
  const { currentUser, loading, reload } = useAdminData();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = hasPermission(currentUser, PERMISSIONS.roleEdit);
  const canDelete = hasPermission(currentUser, PERMISSIONS.roleDelete);

  const loadRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchAdminRoles();
      if (res.data.status) {
        setRoles(res.data.data);
      }
    } catch {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memuat Peran',
        message: 'Gagal memuat daftar peran pengguna dari server.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const openCreateForm = () => {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (role: RoleItem) => {
    setEditingRole(role);
    setForm({ code: role.code, name: role.name, description: role.description ?? '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);

      if (editingRole) {
        const res = await updateAdminRole(editingRole.id, {
          name: form.name,
          description: form.description || undefined,
        });
        setIsFormOpen(false);
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Peran Diperbarui',
          message: res.data.message || 'Peran berhasil diperbarui.',
        });
      } else {
        const res = await createAdminRole({
          code: form.code,
          name: form.name,
          description: form.description || undefined,
        });
        setIsFormOpen(false);
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Peran Dibuat',
          message: res.data.message || 'Peran berhasil dibuat.',
        });
      }

      await loadRoles();
      await reload();
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan Peran',
        message: text || 'Gagal menyimpan data peran.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await deleteAdminRole(roleToDelete.id);
      const deletedRoleName = roleToDelete.name;
      setRoleToDelete(null);
      setNotify({
        isOpen: true,
        type: 'success',
        title: 'Peran Dihapus',
        message: res.data.message || `Peran "${deletedRoleName}" berhasil dihapus.`,
      });
      await loadRoles();
      await reload();
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menghapus Peran',
        message: text || 'Gagal menghapus peran dari sistem.',
      });
      setRoleToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Peran"
      description="Kelola peran akses beserta jumlah izin yang melekat pada setiap peran."
      onRefresh={loadRoles}
      refreshing={isLoading || loading}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[11px] text-[#64748B]">
          Peran sistem tidak dapat dihapus. Penyesuaian izin dilakukan pada menu Izin.
        </p>

        {canEdit && (
          <button
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-sm transition"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Tambah Peran</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-[14px] border border-[#D8E5DC] p-10 text-center text-xs text-[#64748B]">
          Memuat daftar peran...
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#D8E5DC] p-10 text-center text-xs text-[#64748B]">
          Belum ada peran terdaftar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-sm p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-[9px] bg-[#D3EAD9] text-[#166534] flex items-center justify-center flex-shrink-0">
                    <ShieldCheckIcon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1E293B] text-[13px] truncate">{role.name}</p>
                    <p className="text-[10px] font-mono text-[#94A3B8] truncate">{role.code}</p>
                  </div>
                </div>

                {role.isSystem && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#D8E5DC] bg-[#F1F5F2] text-[10px] font-semibold text-[#64748B] whitespace-nowrap">
                    <LockClosedIcon className="w-3 h-3" />
                    Sistem
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[#64748B] line-clamp-2 min-h-[32px]">
                {role.description || 'Tanpa deskripsi.'}
              </p>

              <div className="flex items-center gap-3 text-[11px] text-[#475569]">
                <span className="inline-flex items-center gap-1">
                  <UsersIcon className="w-3.5 h-3.5 text-[#94A3B8]" />
                  {role.userCount} pengguna
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-[#94A3B8]" />
                  {role.permissionKeys.length} izin
                </span>
              </div>

              {(canEdit || canDelete) && (
                <div className="flex items-center gap-2 pt-2 border-t border-[#E8EFEA]">
                  {canEdit && (
                    <button
                      onClick={() => openEditForm(role)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-[#F1F5F2] hover:bg-[#E8EFEA] text-[#475569] font-semibold text-[11px] transition"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                      Ubah
                    </button>
                  )}
                  {canDelete && !role.isSystem && (
                    <button
                      onClick={() => setRoleToDelete(role)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-[#FEE2E2] hover:bg-[#FECACA] text-[#B91C1C] font-semibold text-[11px] transition"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#D8E5DC]">
            <div className="flex justify-between items-start pb-3 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">
                  {editingRole ? 'Ubah Peran' : 'Tambah Peran Baru'}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {editingRole
                    ? 'Kode peran tidak dapat diubah setelah dibuat.'
                    : 'Kode peran digunakan sebagai pengenal unik.'}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#475569] mb-1">Kode Peran</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingRole)}
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                  placeholder="OPERATOR_LPM"
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#166534] disabled:bg-[#F1F5F2] disabled:text-[#94A3B8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Nama Peran</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Operator LPM"
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534] resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EFEA]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-semibold text-xs shadow-sm disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus Peran */}
      <NotificationModal
        isOpen={Boolean(roleToDelete)}
        type="confirm"
        title="Hapus Peran Ini?"
        message={`Peran "${roleToDelete?.name}" (${roleToDelete?.code}) akan dihapus permanen. Pengguna yang masih memakai peran ini harus dipindahkan terlebih dahulu.`}
        confirmLabel="Hapus Peran"
        cancelLabel="Batal"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setRoleToDelete(null)}
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
