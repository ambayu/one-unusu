import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { loginSso } from '../services/api';
import { assetUrl } from '../lib/assets';
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

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

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /**
   * Tujuan lanjutan setelah login, dipakai alur SSO dari aplikasi cabang.
   * Hanya path internal yang diterima agar tidak bisa dipakai sebagai
   * pengalihan ke situs luar.
   */
  const rawNext = searchParams.get('next');
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;

  const resolveLandingPath = (role?: string) =>
    role === 'SUPERADMIN' ? '/admin' : '/dashboard';

  useEffect(() => {
    generateCaptcha();

    // Sesi aktif ditandai oleh cookie HttpOnly. Bila cache pengguna tersedia,
    // arahkan langsung ke panel; server tetap memvalidasi sesi pada request
    // berikutnya dan mengembalikan pengguna ke halaman ini bila sudah berakhir.
    const existingUserStr = localStorage.getItem('one_unusu_user');
    if (existingUserStr) {
      try {
        const u = JSON.parse(existingUserStr);
        navigate(nextPath ?? resolveLandingPath(u.role), { replace: true });
      } catch (e) {
        // Abaikan parse error
      }
    }
  }, [navigate, nextPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Silakan masukkan NIM / NIDN / username dan kata sandi Anda.');
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
      if (res.data.status) {
        // Hanya profil umum yang disimpan; token sesi berada di cookie HttpOnly.
        localStorage.setItem('one_unusu_user', JSON.stringify(res.data.data));

        // Cek apakah data profil (email & noHp) masih kosong
        const userData = res.data.data;

        // Alur SSO dari aplikasi cabang: lanjutkan ke tujuan semula agar
        // pengguna tidak berhenti di panel portal. Selain itu pengguna selalu
        // masuk ke panel; kelengkapan biodata diperiksa saat membuka aplikasi
        // SSO, bukan pada langkah login.
        if (nextPath) {
          navigate(nextPath);
        } else {
          navigate(resolveLandingPath(userData.role));
        }
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

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white relative">
      
      {/* SISI KIRI (FORM LOGIN): 50% FULL HEIGHT PUTIH BERSIH */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 z-10">
        
        {/* Navigasi Kembali ke Home */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#166534] transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          
          {/* Headline */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1E293B] tracking-tight">
              Masuk
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              Gunakan NIM (Mahasiswa), NIDN (Dosen / Tendik), atau username administrator
            </p>
          </div>

          {/* Alert Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-3.5 rounded-[10px] bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs">
              <ExclamationCircleIcon className="w-4 h-4 mt-0.5 shrink-0 text-[#B91C1C]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* NIM / NIDN */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#1E293B]">
                NIM / NIDN / Username <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan NIM, NIDN, atau username"
                className="w-full px-4 py-3 bg-white border border-[#D8E5DC] rounded-[8px] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534] transition shadow-xs"
                required
              />
            </div>

            {/* Kata Sandi */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#1E293B]">
                Kata Sandi <span className="text-[#B91C1C]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-4 pr-11 py-3 bg-white border border-[#D8E5DC] rounded-[8px] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534] transition shadow-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#475569]"
                >
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Lupa Sandi */}
            <div className="flex items-center justify-between text-sm pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#475569]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D8E5DC] text-[#166534] focus:ring-[#166534]"
                />
                <span>Buat tetap Masuk</span>
              </label>
              <Link
                to="/bantuan"
                className="text-sm font-medium text-[#166534] hover:text-[#14532D]"
              >
                Lupa kata sandi?
              </Link>
            </div>

            {/* Verifikasi Keamanan (CAPTCHA) */}
            <div className="p-4 rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
                  <ShieldCheckIcon className="w-4 h-4 text-[#166534]" />
                  <span>Verifikasi Keamanan (CAPTCHA) <span className="text-[#B91C1C]">*</span></span>
                </div>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="inline-flex items-center gap-1 text-[#166534] hover:text-[#14532D] font-medium transition-colors"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  <span>Muat Ulang</span>
                </button>
              </div>

              <p className="text-[11px] text-[#64748B]">
                Jawab soal matematika sederhana berikut sebelum masuk.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-center py-2 px-4 bg-white border border-[#D8E5DC] rounded-[8px] font-mono text-base font-bold text-[#1E293B] tracking-wider shadow-xs">
                  {captchaNum1} + {captchaNum2} = ?
                </div>
                <input
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Jawaban"
                  className="w-full px-3 py-2 bg-white border border-[#D8E5DC] rounded-[8px] text-sm text-center text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534] shadow-xs"
                  required
                />
              </div>
            </div>

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#166534] hover:bg-[#14532D] active:bg-[#14532D] text-white font-semibold text-sm rounded-[8px] shadow-xs transition duration-150 disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>

            {/* Link Sekunder */}
            <div className="text-center pt-2">
              <Link
                to="/aplikasi"
                className="text-xs font-medium text-[#166534] hover:text-[#14532D] hover:underline"
              >
                Lihat Katalog Layanan Tanpa Login
              </Link>
            </div>
          </form>

        </div>

        {/* Footer Sisi Kiri */}
        <div className="text-xs text-[#64748B] text-center lg:text-left">
          &copy; {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara
        </div>
      </div>

      {/* SISI KANAN (WALLPAPER KAMPUS JERNIH DENGAN SEDIKIT KATA-KATA): 50% FULL HEIGHT */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-end p-8 sm:p-14 lg:p-16 overflow-hidden min-h-[450px] lg:min-h-screen text-white">
        
        {/* Foto Wallpaper Kampus Jernih */}
        <img
          src={assetUrl("/assets/campus-login.png")}
          alt="Kampus Universitas Nahdlatul Ulama Sumatera Utara"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.82]"
        />

        {/* Overlay Gradien Halus Menjaga Foto Tetap Terang & Jernih */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#14532D]/95 via-[#14532D]/35 to-transparent pointer-events-none" />

        {/* Konten Sedikit & Minimalis di Bawah */}
        <div className="relative z-10 max-w-lg space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14532D]/70 border border-[#22C55E]/40 text-[#DCFCE7] text-xs font-semibold">
            <span className="size-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span>ONE UNUSU Portal SSO</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            Universitas Nahdlatul Ulama Sumatera Utara
          </h2>

          <p className="text-xs sm:text-sm text-[#DCFCE7] drop-shadow font-medium leading-relaxed">
            Satu pintu akses digital terintegrasi untuk seluruh civitas akademika UNUSU.
          </p>
        </div>

      </div>

    </div>
  );
};

export default Login;
