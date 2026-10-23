import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Globe, LayoutGrid, ChevronDown, GraduationCap, BookOpen, ExternalLink } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLayananOpen, setIsLayananOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Fakultas', path: '/fakultas' },
    { name: 'Program Studi', path: '/prodi' },
    { name: 'Layanan Terpadu', path: '/layanan' },
    { name: 'Berita & Acara', path: '/berita' },
  ];

  const quickServices = [
    { name: 'LMS UNUSU', desc: 'Ruang Belajar Online', url: 'http://localhost:5174', tag: 'Internal' },
    { name: 'SIAKAD', desc: 'KRS & Nilai Akademik', url: 'https://siakad.unusu.ac.id', tag: 'Sistem' },
    { name: 'PMB Online', desc: 'Pendaftaran Mahasiswa', url: 'https://pmb.unusu.ac.id', tag: 'Publik' },
    { name: 'E-Surat', desc: 'Tata Naskah & Disposisi', url: 'http://localhost:5175', tag: 'Internal' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      {/* Top bar */}
      <div className="bg-unusu-green text-white text-xs py-1.5 px-4 sm:px-8 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="font-semibold tracking-wide">ONE UNUSU</span>
            <span className="hidden sm:inline text-emerald-200">|</span>
            <span className="hidden sm:inline text-emerald-100">Integrated Digital Campus</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-100">Kampus Peradaban Ahlussunnah wal Jama'ah</span>
            <a 
              href="https://pmb.unusu.ac.id" 
              target="_blank" 
              rel="noreferrer"
              className="bg-unusu-gold text-slate-900 px-2 py-0.5 rounded font-bold hover:bg-yellow-400 transition"
            >
              Daftar PMB
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-unusu-green-dark via-unusu-green to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-7 h-7 text-unusu-gold" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">ONE</span>
                <span className="font-extrabold text-xl tracking-tight text-unusu-green">UNUSU</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Universitas Nahdlatul Ulama Sumatera Utara</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive 
                      ? 'text-unusu-green bg-emerald-50' 
                      : 'text-slate-600 hover:text-unusu-green hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {/* Quick App Launcher Dropdown */}
            <div className="relative ml-2">
              <button
                onClick={() => setIsLayananOpen(!isLayananOpen)}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-emerald-50 hover:text-unusu-green text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold transition"
              >
                <LayoutGrid className="w-4 h-4 text-unusu-green" />
                <span>Portal Apps</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isLayananOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setIsLayananOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Akses Langsung</p>
                    <p className="text-sm font-bold text-slate-800">Layanan Ekosistem UNUSU</p>
                  </div>
                  <div className="space-y-1">
                    {quickServices.map((qs) => (
                      <a
                        key={qs.name}
                        href={qs.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/80 group transition"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-800 group-hover:text-unusu-green">{qs.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{qs.tag}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{qs.desc}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-unusu-green transition" />
                      </a>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <Link
                      to="/layanan"
                      onClick={() => setIsLayananOpen(false)}
                      className="block text-center text-xs font-bold text-unusu-green hover:underline py-1"
                    >
                      Lihat Semua Layanan Kampus →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-semibold text-slate-700 hover:bg-emerald-50 hover:text-unusu-green"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Layanan Terpadu</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="http://localhost:5174"
                className="p-2.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-800 text-center hover:bg-emerald-50"
              >
                LMS UNUSU
              </a>
              <a
                href="https://siakad.unusu.ac.id"
                className="p-2.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-800 text-center hover:bg-emerald-50"
              >
                SIAKAD
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
