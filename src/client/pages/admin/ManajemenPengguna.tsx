import React, { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import { createAdminUser, UserRole } from '../../services/api';

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

const ROLE_OPTIONS: UserRole[] = [
  'SUPERADMIN',
  'ADMIN_SSO',
  'ADMIN_LPM',
  'ADMIN_LPPM',
  'ADMIN_ESURAT',
  'ADMIN_SARPRAS',
  'ADMIN_AKREDITASI',
  'ADMIN_LMS',
  'DOSEN',
  'MAHASISWA',
];

const ROLE_BADGE: Record<UserRole, string> = {
  SUPERADMIN: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  ADMIN_SSO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ADMIN_LPM: 'bg-blue-50 text-blue-800 border-blue-200',
  ADMIN_LPPM: 'bg-purple-50 text-purple-800 border-purple-200',
  ADMIN_ESURAT: 'bg-amber-50 text-amber-800 border-amber-200',
  ADMIN_SARPRAS: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  ADMIN_AKREDITASI: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  ADMIN_LMS: 'bg-orange-50 text-orange-800 border-orange-200',
  DOSEN: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
  MAHASISWA: 'bg-[#F1F5F2] text-[#475569] border-[#D8E5DC]',
};

export const ManajemenPengguna: React.FC = () => {
  const { currentUser, stats, users, loading, reload } = useAdminData();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | UserRole>('ALL');
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('MAHASISWA');
  const [newUsername, setNewUsername] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNoHp, setNewNoHp] = useState('');
  const [newProdi, setNewProdi] = useState('');
  const [newFakultas, setNewFakultas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchRole = filterRole === 'ALL' || user.role === filterRole;
      const matchSearch =
        !term ||
        user.username.toLowerCase().includes(term) ||
        user.nama.toLowerCase().includes(term) ||
        (user.prodi ?? '').toLowerCase().includes(term) ||
        (user.email ?? '').toLowerCase().includes(term);

      return matchRole && matchSearch;
    });
  }, [users, search, filterRole]);

  const openModal = () => {
    setNewRole('MAHASISWA');
    setNewUsername('');
    setNewNama('');
    setNewPassword('');
    setNewEmail('');
    setNewNoHp('');
    setNewProdi('');
    setNewFakultas('');
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const res = await createAdminUser({
        username: newUsername,
        password: newPassword,
        nama: newNama,
        role: newRole,
        email: newEmail || null,
        noHp: newNoHp || null,
        prodi: newProdi || null,
        fakultas: newFakultas || null,
      });

      if (res.data.status) {
        setMessage({ type: 'success', text: `Akun ${newNama} berhasil dibuat.` });
        setShowModal(false);
        await reload();
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Gagal membuat akun.' });
      }
    } catch (error: unknown) {
      const text =
        typeof error === 'object' && error !== null && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setMessage({ type: 'error', text: text || 'Gagal membuat akun pengguna.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Manajemen Pengguna"
      description="Kelola akun civitas akademika, peran akses, dan status keaktifan identitas SSO."
      onRefresh={reload}
      refreshing={loading}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#64748B]">Total Pengguna</span>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalUsers ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Akun terdaftar</p>
          </div>
          <div className="w-13 h-13 rounded-[14px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center flex-shrink-0 text-[#166534]">
            <UsersIcon className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#64748B]">Mahasiswa</span>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalMahasiswa ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Identitas NIM</p>
          </div>
          <div className="w-13 h-13 rounded-[14px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center flex-shrink-0 text-[#166534]">
            <AcademicCapIcon className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#64748B]">Dosen</span>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalDosen ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Identitas NIDN</p>
          </div>
          <div className="w-13 h-13 rounded-[14px] bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center flex-shrink-0 text-[#B45309]">
            <BriefcaseIcon className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#64748B]">Administrator</span>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">
              {users.filter((user) => user.role === 'SUPERADMIN').length}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Akses tata kelola</p>
          </div>
          <div className="w-13 h-13 rounded-[14px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0 text-[#1D4ED8]">
            <ShieldCheckIcon className="w-8 h-8" />
          </div>
        </div>
      </div>

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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari NIM, NIDN, nama, atau prodi..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
            />
          </div>

          <select
            value={filterRole}
            onChange={(event) => setFilterRole(event.target.value as 'ALL' | UserRole)}
            className="px-2.5 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#166534]"
          >
            <option value="ALL">Semua Peran</option>
            <option value="MAHASISWA">Mahasiswa</option>
            <option value="DOSEN">Dosen</option>
            <option value="SUPERADMIN">Superadmin</option>
          </select>
        </div>

        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-xs transition"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-[#F0FDF4] border-b border-[#D8E5DC] text-[#166534] font-semibold">
              <tr>
                <th className="py-3 px-4">Pengguna (NIM / NIDN)</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Program Studi</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E5DC]/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                    Tidak ada akun yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F0FDF4] transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#1E293B]">
                      {user.nim || user.nidn || user.username}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1E293B]">{user.nama}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${ROLE_BADGE[user.role]}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#475569]">{user.prodi || '-'}</td>
                    <td className="py-3 px-4 text-[#475569]">
                      <p className="text-[11px] font-mono">{user.email || '-'}</p>
                      <p className="text-[10px] text-[#94A3B8] font-mono">{user.noHp || '-'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[#166534] font-semibold text-[11px]">
                        <ShieldCheckIcon className="w-3.5 h-3.5" />
                        <span>{user.isActive ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#D8E5DC] my-8">
            <div className="flex justify-between items-start pb-3 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">Tambah Akun Pengguna</h3>
                <p className="text-[11px] text-[#64748B]">Buat akun akses SSO untuk civitas UNUSU.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#475569] mb-1">Peran (Role)</label>
                <select
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">
                  {newRole === 'MAHASISWA' ? 'Nomor Induk Mahasiswa (NIM)' : newRole === 'DOSEN' ? 'NIDN / NUP' : 'Username'}
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(event) => setNewNama(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={newNoHp}
                    onChange={(event) => setNewNoHp(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Program Studi</label>
                  <input
                    type="text"
                    value={newProdi}
                    onChange={(event) => setNewProdi(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Fakultas</label>
                  <input
                    type="text"
                    value={newFakultas}
                    onChange={(event) => setNewFakultas(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1">Kata Sandi Awal</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EFEA]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-lg text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-semibold text-xs shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Tambah Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPanelTemplate>
  );
};
