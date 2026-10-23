import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchAdminStats, 
  fetchAdminUsers, 
  fetchAdminApps, 
  createAdminUser, 
  createAdminApp, 
  updateAdminApp, 
  UserProfile, 
  SsoAppItem, 
  AdminStats 
} from '../services/api';
import { 
  ArrowLeft, 
  Users, 
  LayoutGrid, 
  Plus, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Key, 
  ExternalLink,
  Edit,
  Save,
  AlertCircle
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState<'users' | 'apps'>('apps');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [apps, setApps] = useState<SsoAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Add User
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newNama, setNewNama] = useState('');
  const [newRole, setNewRole] = useState<'MAHASISWA' | 'DOSEN' | 'SUPERADMIN'>('MAHASISWA');
  const [newProdi, setNewProdi] = useState('');
  const [newFakultas, setNewFakultas] = useState('');

  // Modal Add/Edit App
  const [showAppModal, setShowAppModal] = useState(false);
  const [appClientId, setAppClientId] = useState('');
  const [appClientKey, setAppClientKey] = useState('');
  const [appName, setAppName] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [appRedirect, setAppRedirect] = useState('');
  const [appRoles, setAppRoles] = useState<string[]>(['DOSEN', 'MAHASISWA', 'SUPERADMIN']);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, appsRes] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminApps(),
      ]);

      if (statsRes.data.status) setStats(statsRes.data.data);
      if (usersRes.data.status) setUsers(usersRes.data.data);
      if (appsRes.data.status) setApps(appsRes.data.data);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
        setMessage({ type: 'success', text: 'Pengguna baru berhasil ditambahkan.' });
        setShowUserModal(false);
        setNewUsername('');
        setNewNama('');
        loadData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menambahkan pengguna.' });
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createAdminApp({
        clientId: appClientId,
        clientKey: appClientKey,
        nameApp: appName,
        description: appDesc,
        urlRedirect: appRedirect,
        targetRoles: JSON.stringify(appRoles),
      });

      if (res.data.status) {
        setMessage({ type: 'success', text: 'Aplikasi SSO baru berhasil didaftarkan.' });
        setShowAppModal(false);
        setAppClientId('');
        setAppClientKey('');
        setAppName('');
        setAppRedirect('');
        loadData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menambahkan aplikasi.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke SSO Portal</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              Super Admin Area
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pusat Konfigurasi & Registry SSO</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola aplikasi cabang yang terintegrasi (URL Callback & Client Keys) serta master data akun NIM/NIDN.
          </p>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aplikasi Terdaftar</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalApps}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pengguna</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalUsers}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Mahasiswa (NIM)</p>
              <p className="text-2xl font-black text-emerald-700">{stats.totalMahasiswa}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Dosen (NIDN)</p>
              <p className="text-2xl font-black text-amber-700">{stats.totalDosen}</p>
            </div>
          </div>
        )}

        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex items-center space-x-2 border-b border-slate-200">
          <button
            onClick={() => setTab('apps')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'apps'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Aplikasi Terdaftar (Registry SSO)
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'users'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Data Akun (NIM / NIDN)
          </button>
        </div>

        {/* TAB 1: REGISTRY APPS */}
        {tab === 'apps' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-slate-700">Daftar Aplikasi yang Terhubung ke SSO Gateway</p>
              <button
                onClick={() => setShowAppModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Daftarkan Aplikasi Baru</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Nama Aplikasi</th>
                    <th className="p-4">Client ID</th>
                    <th className="p-4">URL Callback (Redirect)</th>
                    <th className="p-4">Hak Akses Role</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80">
                      <td className="p-4 font-bold text-slate-800">{app.nameApp}</td>
                      <td className="p-4 font-mono text-emerald-700 font-semibold">{app.clientId}</td>
                      <td className="p-4 font-mono text-slate-500 text-[11px] truncate max-w-xs">{app.urlRedirect}</td>
                      <td className="p-4">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {app.targetRoles}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          app.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {app.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DATA USERS */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-slate-700">Daftar Akun Mahasiswa, Dosen, dan Admin</p>
              <button
                onClick={() => setShowUserModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Akun Baru</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">NIM / NIDN / User</th>
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Prodi / Unit</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="p-4 font-mono font-bold text-slate-800">{u.username}</td>
                      <td className="p-4 font-bold text-slate-800">{u.nama}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'SUPERADMIN' ? 'bg-blue-100 text-blue-800' :
                          u.role === 'DOSEN' ? 'bg-amber-100 text-amber-900' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{u.prodi || '-'}</td>
                      <td className="p-4 text-slate-500 font-mono text-[11px]">{u.email || '-'}</td>
                      <td className="p-4">
                        <span className="text-emerald-700 font-bold text-[11px]">Aktif</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Tambah User */}
        {showUserModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Tambah Akun Pengguna</h3>
                <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e: any) => setNewRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="MAHASISWA">Mahasiswa (NIM)</option>
                    <option value="DOSEN">Dosen (NIDN)</option>
                    <option value="SUPERADMIN">Super Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {newRole === 'MAHASISWA' ? 'NIM' : newRole === 'DOSEN' ? 'NIDN' : 'Username'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Contoh: 2201010099"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Nama lengkap beserta gelar"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Program Studi / Unit</label>
                  <input
                    type="text"
                    value={newProdi}
                    onChange={(e) => setNewProdi(e.target.value)}
                    placeholder="Contoh: S1 Sistem Informasi"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password Awal</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-white bg-emerald-700 font-bold"
                  >
                    Simpan Akun
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tambah Aplikasi */}
        {showAppModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Daftarkan Aplikasi Cabang SSO</h3>
                <button onClick={() => setShowAppModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleCreateApp} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Aplikasi</label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Contoh: Perpustakaan Digital UNUSU"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client ID (Unik)</label>
                  <input
                    type="text"
                    required
                    value={appClientId}
                    onChange={(e) => setAppClientId(e.target.value)}
                    placeholder="Contoh: perpus-unusu"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client Key (Secret)</label>
                  <input
                    type="text"
                    required
                    value={appClientKey}
                    onChange={(e) => setAppClientKey(e.target.value)}
                    placeholder="Secret key untuk validasi token cabang"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">URL Callback / Redirect Cabang</label>
                  <input
                    type="url"
                    required
                    value={appRedirect}
                    onChange={(e) => setAppRedirect(e.target.value)}
                    placeholder="http://localhost:5180/sso/callback"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAppModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-white bg-emerald-700 font-bold"
                  >
                    Daftarkan Aplikasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
