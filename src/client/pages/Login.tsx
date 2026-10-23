import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginSso } from '../services/api';
import { SsoLogo } from '../components/SsoLogo';
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Silakan isi NIM / NIDN dan password Anda.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await loginSso(identifier, password);
      if (res.data.status && res.data.token) {
        localStorage.setItem('one_unusu_token', res.data.token);
        localStorage.setItem('one_unusu_user', JSON.stringify(res.data.data));
        navigate('/');
      } else {
        setError(res.data.message || 'Login gagal.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Koneksi timeout. Server SSO sedang sibuk, silakan coba beberapa saat lagi.');
      } else {
        setError(err.response?.data?.message || 'Gagal terhubung ke server SSO. Pastikan server aktif.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (userVal: string) => {
    setIdentifier(userVal);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      {/* Background Islamic / Modern Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-8">
        {/* Brand Header with Animated Interactive SSO Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <SsoLogo
            size="hero"
            subtitle="Central Single Sign-On Gateway"
            className="[&_span.text-slate-900]:text-white [&_p.text-slate-400]:text-emerald-200/80"
          />
          <p className="text-xs text-slate-400">
            Universitas Nahdlatul Ulama Sumatera Utara
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/40 space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Autentikasi Terpadu Kampus</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Satu akun untuk masuk ke seluruh layanan digital UNUSU.
            </p>
          </div>

          {error && (
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Input Identifier (NIM / NIDN) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Login menggunakan NIM / NIDN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan NIM Mahasiswa / NIDN Dosen"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Mahasiswa gunakan <strong>NIM</strong>, Dosen gunakan <strong>NIDN</strong>.
              </p>
            </div>

            {/* Input Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun Anda"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke ONE UNUSU</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Pilih Akun Demo Uji Coba:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('2201010045')}
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-emerald-950/40 border border-slate-700/60 hover:border-emerald-600 text-[11px] text-slate-300 hover:text-emerald-300 font-semibold text-center transition"
              >
                Mahasiswa (NIM)
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('0102038901')}
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-amber-950/40 border border-slate-700/60 hover:border-amber-600 text-[11px] text-slate-300 hover:text-amber-300 font-semibold text-center transition"
              >
                Dosen (NIDN)
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin')}
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-blue-950/40 border border-slate-700/60 hover:border-blue-600 text-[11px] text-slate-300 hover:text-blue-300 font-semibold text-center transition"
              >
                Superadmin
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center pt-1">
              Password default demo: <span className="text-slate-400 font-mono">password123</span>
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-slate-500">
          ONE UNUSU Single Sign-On Platform © 2026. Hak Cipta Dilindungi.
        </p>
      </div>
    </div>
  );
};
