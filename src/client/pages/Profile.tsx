import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe, updateProfile, UserProfile } from '../services/api';
import { ProfileSkeleton } from '../components/Skeleton';
import { SsoLogo } from '../components/SsoLogo';
import { 
  ArrowLeft, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  BookOpen, 
  KeyRound
} from 'lucide-react';

export const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await fetchMe();
        if (res.data.status) {
          setUser(res.data.data);
          setEmail(res.data.data.email || '');
          setNoHp(res.data.data.noHp || '');
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await updateProfile({
        email,
        noHp,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (res.data.status) {
        setMessage({ type: 'success', text: 'Profil dan pengaturan berhasil diperbarui.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (res.data.data) {
          setUser(res.data.data);
        }
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Gagal memperbarui profil.' });
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Terjadi kesalahan server.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center space-x-1.5 p-2 rounded-xl text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <SsoLogo size="sm" onClick={() => navigate('/')} />
          </div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Pengaturan Profil
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {loading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {/* Identity Banner Based on Role */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-5">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-emerald-950/10">
                    {user?.nama?.charAt(0) || 'U'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{user?.nama}</h1>
                    </div>
                    <p className="text-xs font-mono font-bold text-emerald-700">
                      {user?.role === 'MAHASISWA' && `NIM: ${user.nim}`}
                      {user?.role === 'DOSEN' && `NIDN: ${user.nidn}`}
                      {user?.role === 'SUPERADMIN' && `Username: ${user.username}`}
                    </p>
                    <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Akun Terverifikasi SSO</span>
                </div>
              </div>

              {/* Detail Atribut Akademik */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fakultas</p>
                  <p className="text-xs font-bold text-slate-800">{user?.fakultas || 'Pusat Kampus'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Program Studi / Unit</p>
                  <p className="text-xs font-bold text-slate-800">{user?.prodi || 'Teknologi Informasi'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Akun</p>
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{user?.isActive ? 'Aktif' : 'Nonaktif'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Notification alert */}
            {message && (
              <div
                className={`p-4 rounded-2xl flex items-start space-x-3 text-xs font-medium ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 text-rose-600 flex-shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Form Edit Profile & Ganti Password */}
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <span>Kontak & Informasi Pribadi</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pastikan email dan nomor WhatsApp Anda aktif untuk menerima notifikasi kampus.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Email Kampus / Pribadi</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@unusu.ac.id"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">No. WhatsApp</label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-700" />
                    <span>Ubah Password SSO</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kosongkan jika Anda tidak bermaksud mengganti password akun Anda.
                  </p>
                </div>

                <div className="space-y-3 max-w-md">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Password Saat Ini</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan password saat ini"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Password Baru</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Ulangi Password Baru</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-950/10 transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
};
