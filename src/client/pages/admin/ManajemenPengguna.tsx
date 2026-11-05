import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import {
  createAdminUser,
  UserProfile,
  UserRole,
} from '../../services/api';

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

const ROLE_LABEL: Record<UserRole, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN_SSO: 'Admin SSO',
  ADMIN_LPM: 'Admin LPM',
  ADMIN_LPPM: 'Admin LPPM',
  ADMIN_ESURAT: 'Admin E-Surat',
  ADMIN_SARPRAS: 'Admin Sarpras',
  ADMIN_AKREDITASI: 'Admin Akreditasi',
  ADMIN_LMS: 'Admin LMS',
  DOSEN: 'Dosen',
  MAHASISWA: 'Mahasiswa',
};

export const ManajemenPengguna: React.FC = () => {
  const { currentUser, stats, users, loading, reload } = useAdminData();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleParam = searchParams.get('role');
  const validRoleFilter: 'ALL' | UserRole =
    roleParam && (ROLE_OPTIONS.includes(roleParam as UserRole) || roleParam === 'ALL')
      ? (roleParam as 'ALL' | UserRole)
      : 'ALL';

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRoleState] = useState<'ALL' | UserRole>(validRoleFilter);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  type StatusFilter = 'ALL' | 'AKTIF' | 'NONAKTIF';
  const statusParam = searchParams.get('status');
  const validStatusFilter: StatusFilter =
    statusParam === 'aktif' ? 'AKTIF' : statusParam === 'nonaktif' ? 'NONAKTIF' : 'ALL';
  const [filterStatus, setFilterStatusState] = useState<StatusFilter>(validStatusFilter);

  // Sinkronisasi jika query param URL berubah dari luar
  React.useEffect(() => {
    setFilterRoleState(validRoleFilter);
  }, [roleParam]);

  React.useEffect(() => {
    setFilterStatusState(validStatusFilter);
  }, [statusParam]);

  const updateStatusFilter = (newStatus: StatusFilter) => {
    setFilterStatusState(newStatus);
    const newParams = new URLSearchParams(searchParams);
    if (newStatus === 'ALL') {
      newParams.delete('status');
    } else {
      newParams.set('status', newStatus === 'AKTIF' ? 'aktif' : 'nonaktif');
    }
    setSearchParams(newParams, { replace: true });
  };

  const resetFilters = () => {
    setFilterRoleState('ALL');
    setFilterStatusState('ALL');
    setSearch('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('role');
    newParams.delete('status');
    setSearchParams(newParams, { replace: true });
  };

  const updateRoleFilter = (newFilter: 'ALL' | UserRole) => {
    setFilterRoleState(newFilter);
    const newParams = new URLSearchParams(searchParams);
    if (newFilter === 'ALL') {
      newParams.delete('role');
    } else {
      newParams.set('role', newFilter);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleCardClick = (role: 'ALL' | UserRole) => {
    // Klik card yang sama = toggle off (reset), klik card lain = ganti filter.
    const nextFilter: 'ALL' | UserRole = filterRole === role && role !== 'ALL' ? 'ALL' : role;

    setFilterRoleState(nextFilter);
    // Filter status direset agar hasil dari card peran konsisten
    setFilterStatusState('ALL');

    const params = new URLSearchParams(searchParams);
    params.delete('status');
    if (nextFilter === 'ALL') {
      params.delete('role');
    } else {
      params.set('role', nextFilter);
    }
    setSearchParams(params, { replace: true });
  };

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
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'AKTIF' ? user.isActive : !user.isActive);
      const matchSearch =
        !term ||
        user.username.toLowerCase().includes(term) ||
        user.nama.toLowerCase().includes(term) ||
        (user.prodi ?? '').toLowerCase().includes(term) ||
        (user.email ?? '').toLowerCase().includes(term);

      return matchRole && matchStatus && matchSearch;
    });
  }, [users, search, filterRole, filterStatus]);

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
      {/* Cards Statistik Interaktif */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => handleCardClick('ALL')}
          aria-pressed={filterRole === 'ALL'}
          className={`text-left p-5 rounded-[14px] border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#166534] ${
            filterRole === 'ALL'
              ? 'bg-[#F0FDF4] border-[#166534] shadow-sm ring-1 ring-[#166534]'
              : 'bg-white border-[#D8E5DC] hover:border-[#86EFAC] hover:bg-[#F9FDFB] shadow-xs'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Total Pengguna</span>
              {filterRole === 'ALL' && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#166534] text-white">
                  Aktif
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalUsers ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Semua akun terdaftar</p>
          </div>
          <div
            className={`w-13 h-13 rounded-[14px] border flex items-center justify-center flex-shrink-0 transition-colors ${
              filterRole === 'ALL'
                ? 'bg-[#166534] border-[#166534] text-white'
                : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
            }`}
          >
            <UsersIcon className="w-8 h-8" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick('MAHASISWA')}
          aria-pressed={filterRole === 'MAHASISWA'}
          className={`text-left p-5 rounded-[14px] border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#166534] ${
            filterRole === 'MAHASISWA'
              ? 'bg-[#F0FDF4] border-[#166534] shadow-sm ring-1 ring-[#166534]'
              : 'bg-white border-[#D8E5DC] hover:border-[#86EFAC] hover:bg-[#F9FDFB] shadow-xs'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Mahasiswa</span>
              {filterRole === 'MAHASISWA' && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#166534] text-white">
                  Terpilih
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalMahasiswa ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Identitas NIM</p>
          </div>
          <div
            className={`w-13 h-13 rounded-[14px] border flex items-center justify-center flex-shrink-0 transition-colors ${
              filterRole === 'MAHASISWA'
                ? 'bg-[#166534] border-[#166534] text-white'
                : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
            }`}
          >
            <AcademicCapIcon className="w-8 h-8" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick('DOSEN')}
          aria-pressed={filterRole === 'DOSEN'}
          className={`text-left p-5 rounded-[14px] border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B45309] ${
            filterRole === 'DOSEN'
              ? 'bg-[#FEFCE8] border-[#B45309] shadow-sm ring-1 ring-[#B45309]'
              : 'bg-white border-[#D8E5DC] hover:border-[#FDE68A] hover:bg-[#FFFDF5] shadow-xs'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Dosen</span>
              {filterRole === 'DOSEN' && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#B45309] text-white">
                  Terpilih
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">{stats?.totalDosen ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Identitas NIDN</p>
          </div>
          <div
            className={`w-13 h-13 rounded-[14px] border flex items-center justify-center flex-shrink-0 transition-colors ${
              filterRole === 'DOSEN'
                ? 'bg-[#B45309] border-[#B45309] text-white'
                : 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
            }`}
          >
            <BriefcaseIcon className="w-8 h-8" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick('SUPERADMIN')}
          aria-pressed={filterRole === 'SUPERADMIN'}
          className={`text-left p-5 rounded-[14px] border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] ${
            filterRole === 'SUPERADMIN'
              ? 'bg-[#EFF6FF] border-[#1D4ED8] shadow-sm ring-1 ring-[#1D4ED8]'
              : 'bg-white border-[#D8E5DC] hover:border-[#BFDBFE] hover:bg-[#F8FAFC] shadow-xs'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Superadmin</span>
              {filterRole === 'SUPERADMIN' && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1D4ED8] text-white">
                  Terpilih
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-[#1E293B]">
              {users.filter((user) => user.role === 'SUPERADMIN').length}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Akses tata kelola</p>
          </div>
          <div
            className={`w-13 h-13 rounded-[14px] border flex items-center justify-center flex-shrink-0 transition-colors ${
              filterRole === 'SUPERADMIN'
                ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
            }`}
          >
            <ShieldCheckIcon className="w-8 h-8" />
          </div>
        </button>
      </div>

      {/* Filter status keaktifan â€” chip ringkas, target sentuh >= 44px */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-white rounded-[14px] border border-[#D8E5DC] shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
            Status Akun
          </span>
          {([
            { key: 'ALL' as StatusFilter, label: 'Semua', count: users.length },
            {
              key: 'AKTIF' as StatusFilter,
              label: 'Aktif',
              count: users.filter((user) => user.isActive).length,
            },
            {
              key: 'NONAKTIF' as StatusFilter,
              label: 'Nonaktif',
              count: users.filter((user) => !user.isActive).length,
            },
          ]).map((item) => {
            const isActive = filterStatus === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => updateStatusFilter(isActive ? 'ALL' : item.key)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 text-[11px] font-semibold rounded-full border transition ${
                  isActive
                    ? 'bg-[#166534] border-[#166534] text-white shadow-xs'
                    : 'bg-white border-[#D8E5DC] text-[#475569] hover:bg-[#F0FDF4] hover:border-[#86EFAC]'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`px-1.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F2] text-[#64748B]'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {(filterRole !== 'ALL' || filterStatus !== 'ALL' || search.trim() !== '') && (
          <button
            type="button"
            onClick={resetFilters}
            className="self-start sm:self-auto inline-flex items-center gap-1 min-h-[44px] px-3 text-[11px] font-semibold text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-[8px] transition"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            Reset Semua Filter
          </button>
        )}
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

          <div className="flex items-center gap-1.5">
            <select
              value={filterRole}
              onChange={(event) => updateRoleFilter(event.target.value as 'ALL' | UserRole)}
              className="px-2.5 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#166534]"
            >
              <option value="ALL">Semua Peran</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>

            {filterRole !== 'ALL' && (
              <button
                type="button"
                onClick={() => updateRoleFilter('ALL')}
                title="Reset filter peran"
                className="inline-flex items-center gap-1 px-2 py-2 text-xs font-semibold text-[#64748B] hover:text-[#166534] bg-white hover:bg-[#F0FDF4] border border-[#D8E5DC] rounded-[8px] transition"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={openModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-xs transition"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-[#E8EFEA] bg-[#F9FDFB]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#1E293B]">
              Daftar Pengguna
              <span className="ml-1.5 text-[#64748B] font-normal">
                ({filteredUsers.length} dari {users.length} akun)
              </span>
            </span>
            {filterRole !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                Filter: {ROLE_LABEL[filterRole as UserRole] ?? filterRole}
                <button
                  type="button"
                  onClick={() => updateRoleFilter('ALL')}
                  aria-label="Hapus filter peran"
                  className="hover:text-[#B91C1C]"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                Status: {filterStatus === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
                <button
                  type="button"
                  onClick={() => updateStatusFilter('ALL')}
                  aria-label="Hapus filter status"
                  className="hover:text-[#B91C1C]"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          {(filterRole !== 'ALL' || filterStatus !== 'ALL' || search.trim() !== '') && (
            <button
              type="button"
              onClick={resetFilters}
              className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#166534] bg-white hover:bg-[#F0FDF4] border border-[#D8E5DC] rounded-[8px] transition"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Tampilkan Semua
            </button>
          )}
        </div>
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
                  <td colSpan={6} className="py-10 text-center">
                    <p className="text-xs font-semibold text-[#475569]">
                      Tidak ada akun yang sesuai dengan filter
                      {filterRole !== 'ALL' ? ` "${ROLE_LABEL[filterRole as UserRole] ?? filterRole}"` : ''}
                      {filterStatus !== 'ALL'
                        ? ` dengan status ${filterStatus === 'AKTIF' ? 'Aktif' : 'Nonaktif'}`
                        : ''}
                      {search.trim() ? ` dan kata kunci "${search.trim()}"` : ''}.
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-[#166534] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] transition"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                      Reset Filter
                    </button>
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
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#475569]">{user.prodi || '-'}</td>
                    <td className="py-3 px-4 text-[#475569]">
                      <p className="text-[11px] font-mono">{user.email || '-'}</p>
                      <p className="text-[10px] text-[#94A3B8] font-mono">{user.noHp || '-'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                          user.isActive ? 'text-[#166534]' : 'text-[#B91C1C]'
                        }`}
                      >
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
