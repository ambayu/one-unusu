import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchAdminStats, 
  fetchAdminUsers, 
  fetchAdminApps, 
  createAdminUser, 
  createAdminApp, 
  fetchMe,
  UserProfile, 
  SsoAppItem, 
  AdminStats 
} from '../services/api';
import { SidebarLayout } from '../components/SidebarLayout';
import {
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  UsersIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ArrowPathIcon,
  KeyIcon,
  LinkIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

export const AdminPanel: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<'apps' | 'users'>('apps');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [apps, setApps] = useState<SsoAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter State
  const [searchUser, setSearchUser] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'MAHASISWA' | 'DOSEN' | 'SUPERADMIN'>('ALL');
  const [searchApp, setSearchApp] = useState('');

  // Modal Add User
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newNama, setNewNama] = useState('');
  const [newRole, setNewRole] = useState<'MAHASISWA' | 'DOSEN' | 'SUPERADMIN'>('MAHASISWA');
  const [newProdi, setNewProdi] = useState('');
  const [newFakultas, setNewFakultas] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Modal Add App
  const [showAppModal, setShowAppModal] = useState(false);
  const [appClientId, setAppClientId] = useState('');
  const [appClientKey, setAppClientKey] = useState('');
  const [appName, setAppName] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [appRedirect, setAppRedirect] = useState('');
  const [appRoles, setAppRoles] = useState<string[]>(['DOSEN', 'MAHASISWA', 'SUPERADMIN']);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, appsRes, meRes] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminApps(),
        fetchMe(),
      ]);

      if (statsRes.data.status) setStats(statsRes.data.data);
      if (usersRes.data.status) setUsers(usersRes.data.data);
      if (appsRes.data.status) setApps(appsRes.data.data);
      if (meRes.data.status) setCurrentUser(meRes.data.data);
    } catch (err: any) {
      console.error('Error admin load:', err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        alert('Akses hanya untuk Superadmin.');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = filterRole === 'ALL' || u.role === filterRole;
      const term = searchUser.toLowerCase();
      const matchSearch =
        !searchUser ||
        u.username?.toLowerCase().includes(term) ||
        u.nama?.toLowerCase().includes(term) ||
        u.prodi?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term);
      return matchRole && matchSearch;
    });
  }, [users, searchUser, filterRole]);

  // Filtered Apps
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const term = searchApp.toLowerCase();
      return (
        !searchApp ||
        app.nameApp.toLowerCase().includes(term) ||
        app.clientId.toLowerCase().includes(term) ||
        app.urlRedirect.toLowerCase().includes(term)
      );
    });
  }, [apps, searchApp]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingUser(true);
      const res = await createAdminUser({
        username: newUsername,
        password: newPassword,
        nama: newNama,
        role: newRole,
        nim: newRole === 'MAHASISWA' ? newUsername : undefined,
        nidn: newRole === 'DOSEN' ? newUsername : undefined,
        prodi: newProdi,
        fakultas: newFakultas,
      });

      if (res.data.status) {
        setMessage({ type: 'success', text: `Akun ${newUsername} berhasil ditambahkan.` });
        setShowUserModal(false);
        setNewUsername('');
        setNewNama('');
        setNewProdi('');
        setNewFakultas('');
        loadData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menambahkan pengguna.' });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingApp(true);
      const res = await createAdminApp({
        clientId: appClientId,
        clientKey: appClientKey,
        nameApp: appName,
        description: appDesc,
        urlRedirect: appRedirect,
        targetRoles: JSON.stringify(appRoles),
      });

      if (res.data.status) {
        setMessage({ type: 'success', text: `Aplikasi ${appName} berhasil didaftarkan ke registry SSO.` });
        setShowAppModal(false);
        setAppClientId('');
        setAppClientKey('');
        setAppName('');
        setAppDesc('');
        setAppRedirect('');
        loadData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menambahkan aplikasi.' });
    } finally {
      setIsSubmittingApp(false);
    }
  };

  return (
    <SidebarLayout user={currentUser}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#D8E5DC]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B]">
              Pusat Konfigurasi & Registry SSO
            </h1>
            <p className="text-xs text-[#475569] mt-0.5">
              Kelola aplikasi terintegrasi, endpoint redirect SSO, dan master identitas civitas akademika UNUSU.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8E5DC] bg-white text-xs font-semibold text-[#475569] hover:bg-[#F1F5F2] transition"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Operational Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B]">
              <span className="text-xs font-semibold">Aplikasi Terdaftar</span>
              <Squares2X2Icon className="w-4 h-4 text-[#166534]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1E293B]">{stats?.totalApps ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Layanan SSO aktif</p>
          </div>

          <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B]">
              <span className="text-xs font-semibold">Total Pengguna</span>
              <UsersIcon className="w-4 h-4 text-[#475569]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1E293B]">{stats?.totalUsers ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Akun terdaftar di database</p>
          </div>

          <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs">
            <div className="flex items-center justify-between text-[#166534]">
              <span className="text-xs font-semibold text-[#475569]">Mahasiswa</span>
              <AcademicCapIcon className="w-4 h-4 text-[#166534]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#166534]">{stats?.totalMahasiswa ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Identitas terverifikasi NIM</p>
          </div>

          <div className="bg-white p-5 rounded-[14px] border border-[#D8E5DC] shadow-xs">
            <div className="flex items-center justify-between text-[#B45309]">
              <span className="text-xs font-semibold text-[#475569]">Dosen & Tendik</span>
              <BriefcaseIcon className="w-4 h-4 text-[#B45309]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#B45309]">{stats?.totalDosen ?? 0}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Identitas terverifikasi NIDN</p>
          </div>
        </div>

        {/* Notification Banner */}
        {message && (
          <div className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]'
              : 'bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircleIcon className="w-4 h-4 text-[#166534] flex-shrink-0" />
              ) : (
                <ExclamationCircleIcon className="w-4 h-4 text-[#B91C1C] flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-[#94A3B8] hover:text-[#475569]"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#D8E5DC]">
          <button
            onClick={() => setTab('apps')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition ${
              tab === 'apps'
                ? 'border-[#166534] text-[#166534] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Aplikasi SSO ({apps.length})
          </button>
          <button
            onClick={() => setTab('users')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition ${
              tab === 'users'
                ? 'border-[#166534] text-[#166534] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Data Akun Civitas ({users.length})
          </button>
        </div>

        {/* TAB 1: REGISTRY APPS */}
        {tab === 'apps' && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <MagnifyingGlassIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchApp}
                  onChange={(e) => setSearchApp(e.target.value)}
                  placeholder="Cari nama, client ID, atau callback..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                />
              </div>

              <button
                onClick={() => setShowAppModal(true)}
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
                      <th className="py-3 px-4">Akses Role</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8E5DC]/50">
                    {filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                          Tidak ada aplikasi yang sesuai dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredApps.map((app) => (
                        <tr key={app.id} className="hover:bg-[#F0FDF4] transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#1E293B]">{app.nameApp}</p>
                            <p className="text-[11px] text-[#64748B] line-clamp-1">{app.description || 'Layanan digital terintegrasi.'}</p>
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
                            <span className="text-[10px] bg-[#F1F5F2] text-[#475569] px-2 py-0.5 rounded font-mono border border-[#D8E5DC]">
                              {app.targetRoles}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              app.isActive
                                ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                                : 'bg-[#F1F5F2] text-[#64748B] border-[#D8E5DC]'
                            }`}>
                              {app.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA USERS */}
        {tab === 'users' && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md w-full">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Cari NIM, NIDN, nama, atau prodi..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={(e: any) => setFilterRole(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#166534]"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="MAHASISWA">Mahasiswa</option>
                  <option value="DOSEN">Dosen</option>
                  <option value="SUPERADMIN">Superadmin</option>
                </select>
              </div>

              <button
                onClick={() => setShowUserModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-xs transition"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Tambah Akun Baru</span>
              </button>
            </div>

            <div className="bg-white rounded-[14px] border border-[#D8E5DC] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F0FDF4] border-b border-[#D8E5DC] text-[#166534] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Pengguna (NIM / NIDN)</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Peran</th>
                      <th className="py-3 px-4">Program Studi</th>
                      <th className="py-3 px-4">Kontak (WhatsApp / Email)</th>
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
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#F0FDF4] transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-[#1E293B]">
                            {u.nim || u.nidn || u.username}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#1E293B]">{u.nama}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              u.role === 'SUPERADMIN' ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]' :
                              u.role === 'DOSEN' ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' :
                              'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#475569]">{u.prodi || '-'}</td>
                          <td className="py-3 px-4 text-[#475569]">
                            <p className="text-[11px] font-mono">{u.email || '-'}</p>
                            <p className="text-[10px] text-[#94A3B8] font-mono">{u.noHp || '-'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[#166534] font-semibold text-[11px]">
                              <ShieldCheckIcon className="w-3.5 h-3.5" />
                              <span>Aktif</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Tambah User */}
        {showUserModal && (
          <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#D8E5DC]">
              <div className="flex justify-between items-center pb-3 border-b border-[#E8EFEA]">
                <div>
                  <h3 className="font-bold text-[#1E293B] text-sm">Tambah Akun Pengguna</h3>
                  <p className="text-[11px] text-[#64748B]">Buat akun akses SSO untuk civitas UNUSU.</p>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Peran (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e: any) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  >
                    <option value="MAHASISWA">Mahasiswa (NIM)</option>
                    <option value="DOSEN">Dosen (NIDN)</option>
                    <option value="SUPERADMIN">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">
                    {newRole === 'MAHASISWA' ? 'Nomor Induk Mahasiswa (NIM)' : newRole === 'DOSEN' ? 'Nomor Induk Dosen Nasional (NIDN)' : 'Username'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder={newRole === 'MAHASISWA' ? 'Contoh: 2201010099' : 'Contoh: 0102038901'}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Nama lengkap beserta gelar akademik"
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Program Studi</label>
                  <input
                    type="text"
                    value={newProdi}
                    onChange={(e) => setNewProdi(e.target.value)}
                    placeholder="Contoh: S1 Sistem Informasi"
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Kata Sandi Default</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EFEA]">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-3.5 py-2 rounded-lg text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="px-4 py-2 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-semibold text-xs shadow-xs disabled:opacity-50 transition"
                  >
                    {isSubmittingUser ? 'Menyimpan...' : 'Simpan Akun'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tambah Aplikasi */}
        {showAppModal && (
          <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#D8E5DC]">
              <div className="flex justify-between items-center pb-3 border-b border-[#E8EFEA]">
                <div>
                  <h3 className="font-bold text-[#1E293B] text-sm">Daftarkan Aplikasi Cabang SSO</h3>
                  <p className="text-[11px] text-[#64748B]">Integrasikan portal atau sistem eksternal ke SSO UNUSU.</p>
                </div>
                <button
                  onClick={() => setShowAppModal(false)}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateApp} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Nama Aplikasi</label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Contoh: Perpustakaan Digital UNUSU"
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Deskripsi Singkat</label>
                  <input
                    type="text"
                    value={appDesc}
                    onChange={(e) => setAppDesc(e.target.value)}
                    placeholder="Deskripsi fungsi sistem..."
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Client ID (Kode Unik)</label>
                  <input
                    type="text"
                    required
                    value={appClientId}
                    onChange={(e) => setAppClientId(e.target.value)}
                    placeholder="Contoh: perpus-unusu"
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Client Key (Secret Token)</label>
                  <input
                    type="text"
                    required
                    value={appClientKey}
                    onChange={(e) => setAppClientKey(e.target.value)}
                    placeholder="Kunci rahasia validasi tiket SSO..."
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#475569] mb-1">Callback URL (Redirect URI)</label>
                  <input
                    type="url"
                    required
                    value={appRedirect}
                    onChange={(e) => setAppRedirect(e.target.value)}
                    placeholder="https://perpus.unusu.ac.id/sso/callback"
                    className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EFEA]">
                  <button
                    type="button"
                    onClick={() => setShowAppModal(false)}
                    className="px-3.5 py-2 rounded-lg text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingApp}
                    className="px-4 py-2 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-semibold text-xs shadow-xs disabled:opacity-50 transition"
                  >
                    {isSubmittingApp ? 'Mendaftarkan...' : 'Daftarkan Aplikasi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
};

export default AdminPanel;
