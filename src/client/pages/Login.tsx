import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginSso } from '../services/api';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  RefreshCw,
  Moon,
  ChevronLeft
} from 'lucide-react';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Captcha Matematika Sederhana
  const [captchaNum1, setCaptchaNum1] = useState(3);
  const [captchaNum2, setCaptchaNum2] = useState(4);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 9) + 1;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setCaptchaAnswer('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Silakan masukkan NIM / NIDN dan kata sandi Anda.');
      return;
    }

    // Validasi Captcha
    if (parseInt(captchaAnswer.trim(), 10) !== captchaNum1 + captchaNum2) {
      setError('Jawaban verifikasi keamanan (CAPTCHA) salah. Silakan hitung kembali.');
      generateCaptcha();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await loginSso(identifier, password);
      if (res.data.status && res.data.token) {
        localStorage.setItem('one_unusu_token', res.data.token);
        localStorage.setItem('one_unusu_user', JSON.stringify(res.data.data));
        navigate('/dashboard');
      } else {
        setError(res.data.message || 'Login gagal.');
        generateCaptcha();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      generateCaptcha();
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
    setCaptchaAnswer(String(captchaNum1 + captchaNum2));
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white relative">
      
      {/* SISI KIRI (FORM LOGIN): 50% FULL HEIGHT PUTIH BERSIH */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 z-10">
        
        {/* Navigasi Kembali ke Home */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Home</span>
          </Link>
        </div>

        {/* Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          
          {/* Headline */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Masuk
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Gunakan NIM (Mahasiswa) atau NIDN (Dosen / Tendik)
            </p>
          </div>

          {/* Alert Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* NIM / NIDN */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                NIM / NIDN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan NIM atau NIDN"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition shadow-xs"
                required
              />
            </div>

            {/* Kata Sandi */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Kata Sandi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-4 pr-11 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition shadow-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Lupa Sandi */}
            <div className="flex items-center justify-between text-sm pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Buat tetap Masuk</span>
              </label>
              <Link
                to="/bantuan"
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                Lupa kata sandi?
              </Link>
            </div>

            {/* Verifikasi Keamanan (CAPTCHA) */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/90 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Verifikasi Keamanan (CAPTCHA) <span className="text-red-500">*</span></span>
                </div>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Muat Ulang</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Jawab soal matematika sederhana berikut sebelum masuk.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-center py-2 px-4 bg-white border border-slate-200 rounded-lg font-mono text-base font-bold text-slate-800 tracking-wider shadow-2xs">
                  {captchaNum1} + {captchaNum2} = ?
                </div>
                <input
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Jawaban"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  required
                />
              </div>
            </div>

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm rounded-lg shadow-md shadow-emerald-900/10 transition duration-150 disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>

            {/* Link Sekunder */}
            <div className="text-center pt-2">
              <Link
                to="/aplikasi"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Lihat Katalog Layanan Tanpa Login
              </Link>
            </div>

            {/* Akun Demo Cepat */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs">
              <span className="text-[11px] text-slate-400">Uji Coba:</span>
              <button
                type="button"
                onClick={() => fillQuickAccount('2201010045')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-medium transition"
              >
                Mahasiswa
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('0102038901')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-medium transition"
              >
                Dosen
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-medium transition"
              >
                Superadmin
              </button>
            </div>
          </form>

        </div>

        {/* Footer Sisi Kiri */}
        <div className="text-xs text-slate-400 text-center lg:text-left">
          &copy; {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara
        </div>
      </div>

      {/* SISI KANAN (WALLPAPER KAMPUS JERNIH DENGAN SEDIKIT KATA-KATA): 50% FULL HEIGHT */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-end p-8 sm:p-14 lg:p-16 overflow-hidden min-h-[450px] lg:min-h-screen text-white">
        
        {/* Foto Wallpaper Kampus Jernih */}
        <img
          src="/assets/campus-login.png"
          alt="Kampus Universitas Nahdlatul Ulama Sumatera Utara"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.82]"
        />

        {/* Overlay Gradien Halus Menjaga Foto Tetap Terang & Jernih */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#062419]/95 via-[#062419]/35 to-transparent pointer-events-none" />

        {/* Konten Sedikit & Minimalis di Bawah */}
        <div className="relative z-10 max-w-lg space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-400/40 text-gold-300 text-xs font-semibold backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ONE UNUSU Portal SSO</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            Universitas Nahdlatul Ulama Sumatera Utara
          </h2>

          <p className="text-xs sm:text-sm text-slate-200 drop-shadow font-medium leading-relaxed">
            Satu pintu akses digital terintegrasi untuk seluruh civitas akademika UNUSU.
          </p>
        </div>

        {/* Tombol Tema Bulat di Pojok Kanan Atas */}
        <div className="absolute top-6 right-6 z-20">
          <button
            type="button"
            aria-label="Toggle Theme"
            className="size-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};

export default Login;
