import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, MapPin, Phone, Mail, Globe, Facebook, Instagram, Youtube } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-unusu-green flex items-center justify-center text-white">
                <GraduationCap className="w-6 h-6 text-unusu-gold" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-white">ONE UNUSU</span>
                <p className="text-[10px] text-slate-400 font-medium">Universitas Nahdlatul Ulama Sumatera Utara</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Mewujudkan perguruan tinggi unggul berlandaskan nilai-nilai Ahlussunnah wal Jama'ah An-Nahdliyah yang responsif terhadap transformasi teknologi dan peradaban global.
            </p>
            <div className="flex space-x-3 text-slate-400 pt-2">
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-unusu-green hover:text-white transition"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-unusu-green hover:text-white transition"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-unusu-green hover:text-white transition"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Col 2: Fakultas */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-l-2 border-unusu-green pl-3">Fakultas</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/fakultas/sains-teknologi" className="hover:text-emerald-400 transition">Fakultas Sains dan Teknologi</Link></li>
              <li><Link to="/fakultas/keguruan-ilmu-pendidikan" className="hover:text-emerald-400 transition">Fakultas Keguruan & Ilmu Pendidikan</Link></li>
              <li><Link to="/fakultas/agama-islam" className="hover:text-emerald-400 transition">Fakultas Agama Islam</Link></li>
              <li><Link to="/fakultas/ekonomi-bisnis" className="hover:text-emerald-400 transition">Fakultas Ekonomi dan Bisnis</Link></li>
              <li><Link to="/fakultas/pertanian" className="hover:text-emerald-400 transition">Fakultas Pertanian</Link></li>
              <li><Link to="/fakultas/ilmu-kesehatan" className="hover:text-emerald-400 transition">Fakultas Ilmu Kesehatan</Link></li>
            </ul>
          </div>

          {/* Col 3: Portal Ekosistem */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-l-2 border-unusu-gold pl-3">Portal Terpadu</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="http://localhost:5174" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition flex items-center justify-between">LMS Ruang Belajar <span>↗</span></a></li>
              <li><a href="https://siakad.unusu.ac.id" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition flex items-center justify-between">SIAKAD Online <span>↗</span></a></li>
              <li><a href="https://pmb.unusu.ac.id" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition flex items-center justify-between">Penerimaan Mhs Baru <span>↗</span></a></li>
              <li><a href="http://localhost:5175" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition flex items-center justify-between">E-Surat Digital <span>↗</span></a></li>
              <li><a href="http://localhost:5176" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition flex items-center justify-between">SDM & Sarpras <span>↗</span></a></li>
              <li><a href="http://localhost:5177" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition flex items-center justify-between">LPM / Mutu Kampus <span>↗</span></a></li>
            </ul>
          </div>

          {/* Col 4: Kontak Kampus */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-3">Kampus UNUSU</h4>
            <div className="flex items-start space-x-3 text-sm">
              <MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Jl. H.A. Manaf Lubis No. 2, Gaperta Ujung, Helvetia, Medan, Sumatera Utara</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>(061) 8440055</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>rektorat@unusu.ac.id</span>
            </div>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara (UNUSU). All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-medium">ONE UNUSU Platform • Powered by React Vite & Prisma</p>
        </div>
      </div>
    </footer>
  );
};
