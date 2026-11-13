import React from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '../lib/assets';
import { externalUrls } from '../data/site';
import {
  ChevronLeftIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export const Register: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F1F5F2] relative">
      {/* SISI KIRI (INFORMASI REGISTRASI SSO & PMB) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 z-10 bg-white shadow-sm">
        {/* Navigasi Kembali ke Home / Login */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            data-testid="link-kembali-beranda"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#166534] transition-colors"
            title="Kembali ke Halaman Depan"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Halaman Depan</span>
          </Link>
          <span className="text-[#CBD5E1]">|</span>
          <Link
            to="/login"
            data-testid="link-kembali-login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#166534] transition-colors"
            title="Kembali ke Halaman Masuk"
          >
            <span>Halaman Masuk</span>
          </Link>
        </div>

        {/* Kontainer Form/Informasi Registrasi */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] mb-3">
              Informasi Registrasi Akun
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] tracking-tight">
              Pendaftaran Akun SSO
            </h1>
            <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
              Akun SSO ONE UNUSU terhubung langsung dengan sistem basis data akademik dan kepegawaian Universitas Nahdlatul Ulama Sumatera Utara.
            </p>
          </div>

          {/* Kartu Informasi Ketentuan Akun */}
          <div className="space-y-4 mb-6">
            <div className="p-4 rounded-[10px] bg-[#F0FDF4] border border-[#D8E5DC]">
              <div className="flex items-start gap-3">
                <IdentificationIcon className="w-5 h-5 text-[#166534] shrink-0 mt-0.5" />
                <div className="text-xs text-[#1E293B] space-y-1">
                  <p className="font-bold text-[#166534]">Mahasiswa & Dosen / Tenaga Kependidikan</p>
                  <p className="text-[#475569] leading-relaxed">
                    Akun SSO diterbitkan secara otomatis oleh <strong>Biro PUSTIK UNUSU</strong>. Gunakan NIM atau NIDN resmi yang telah terdaftar di pangkalan data kampus untuk masuk.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[10px] bg-white border border-[#D8E5DC] shadow-sm">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-[#166534] shrink-0 mt-0.5" />
                <div className="text-xs text-[#1E293B] space-y-1">
                  <p className="font-bold text-[#166534]">Calon Mahasiswa Baru</p>
                  <p className="text-[#475569] leading-relaxed">
                    Jika Anda belum memiliki NIM dan ingin mendaftar sebagai mahasiswa baru, silakan lakukan pendaftaran penerimaan mahasiswa baru (PMB).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="space-y-3">
            {externalUrls.pmb ? (
              <a
                href={externalUrls.pmb}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-sm rounded-[8px] shadow-sm transition duration-150"
              >
                <span>Daftar Mahasiswa Baru (Portal PMB)</span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>
            ) : null}

            <Link
              to="/login"
              className="w-full flex items-center justify-center py-3 px-4 bg-white hover:bg-[#F0FDF4] text-[#166534] font-semibold text-sm rounded-[8px] border border-[#D8E5DC] transition duration-150"
            >
              Sudah Memiliki Akun? Masuk ke SSO
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/bantuan"
              className="text-xs text-[#64748B] hover:text-[#166534] transition-colors"
            >
              Kendala aktivasi akun? Hubungi Helpdesk PUSTIK
            </Link>
          </div>
        </div>

        {/* Footer Sisi Kiri */}
        <div className="text-xs text-[#64748B] text-center lg:text-left">
          &copy; {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara
        </div>
      </div>

      {/* SISI KANAN (WALLPAPER KAMPUS) */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-end p-8 sm:p-14 lg:p-16 overflow-hidden min-h-[350px] lg:min-h-screen text-white">
        <img
          src={assetUrl('/assets/campus-login.png')}
          alt="Kampus Universitas Nahdlatul Ulama Sumatera Utara"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.82]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14532D]/95 via-[#14532D]/35 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-lg space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14532D]/70 border border-[#22C55E]/40 text-[#DCFCE7] text-xs font-semibold">
            <ShieldCheckIcon className="w-4 h-4 text-[#22C55E]" />
            <span>Sistem Otentikasi Terpadu</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            Layanan SSO ONE UNUSU
          </h2>

          <p className="text-xs sm:text-sm text-[#DCFCE7] drop-shadow font-medium leading-relaxed">
            Keamanan akses terpusat untuk civitas akademika UNUSU terintegrasi ke seluruh modul layanan kampus.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
