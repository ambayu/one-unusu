import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchBanners, 
  fetchFakultas, 
  fetchLayanan, 
  fetchBerita, 
  BannerItem, 
  FakultasItem, 
  LayananItem, 
  BeritaItem 
} from '../services/api';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  Building, 
  ExternalLink, 
  ArrowRight, 
  Calendar, 
  Award, 
  ChevronRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const Home: React.FC = () => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [fakultas, setFakultas] = useState<FakultasItem[]>([]);
  const [layanan, setLayanan] = useState<LayananItem[]>([]);
  const [berita, setBerita] = useState<BeritaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bannersRes, fakultasRes, layananRes, beritaRes] = await Promise.allSettled([
          fetchBanners(),
          fetchFakultas(),
          fetchLayanan(),
          fetchBerita(4)
        ]);

        if (bannersRes.status === 'fulfilled') setBanners(bannersRes.value.data.data);
        if (fakultasRes.status === 'fulfilled') setFakultas(fakultasRes.value.data.data);
        if (layananRes.status === 'fulfilled') setLayanan(layananRes.value.data.data);
        if (beritaRes.status === 'fulfilled') setBerita(beritaRes.value.data.data);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-20 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-900 text-white pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-unusu-green/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 right-10 w-72 h-72 bg-unusu-gold/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-unusu-gold" />
                <span>Portal Digital Terpadu Kampus UNUSU</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Membangun Generasi Unggul Berkarakter <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-yellow-300">Aswaja</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                ONE UNUSU mengintegrasikan sistem akademik, penelitian, pembelajaran modern (LMS), dan tata kelola perguruan tinggi dalam satu pintu digital.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <a
                  href="#layanan"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-unusu-green hover:bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-950/50 hover:shadow-emerald-700/30 transition group"
                >
                  <span>Eksplorasi Layanan Kampus</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
                <Link
                  to="/fakultas"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold hover:text-white transition"
                >
                  Lihat 6 Fakultas & 14 Prodi
                </Link>
              </div>

              {/* Key Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white">6</p>
                  <p className="text-xs text-slate-400 mt-0.5">Fakultas Unggulan</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white">14</p>
                  <p className="text-xs text-slate-400 mt-0.5">Program Studi S1</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-unusu-gold">100%</p>
                  <p className="text-xs text-slate-400 mt-0.5">Terakreditasi</p>
                </div>
              </div>
            </div>

            {/* Right Card / Interactive Preview */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/60 p-6 rounded-3xl shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-mono text-slate-400">one.unusu.ac.id</span>
                </div>

                <div className="py-6 space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Akses Langsung Sistem</p>
                  <div className="space-y-3">
                    <a
                      href="http://localhost:5174"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/40 transition group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-emerald-300">LMS UNUSU</p>
                          <p className="text-xs text-slate-400">E-learning & Ruang Belajar Dosen/Mhs</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-300" />
                    </a>

                    <a
                      href="https://siakad.unusu.ac.id"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/40 transition group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-emerald-300">SIAKAD UNUSU</p>
                          <p className="text-xs text-slate-400">KRS, KHS, & Transkrip Akademik</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-300" />
                    </a>

                    <a
                      href="http://localhost:5175"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/40 transition group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-emerald-300">E-Surat & Tata Usaha</p>
                          <p className="text-xs text-slate-400">Disposisi & Persuratan Mahasiswa</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-300" />
                    </a>
                  </div>
                </div>

                <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-700/50">
                  <span>Single Sign-On Terintegrasi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LAYANAN EKOSISTEM UNUSU */}
      <section id="layanan" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-unusu-green bg-emerald-50 px-3 py-1 rounded-full">
            Akses Terpadu Sivitas Akademika
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-3">Layanan Ekosistem Kampus</h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Kemudahan akses sistem pembelajaran, administrasi, dan registrasi perkuliahan bagi seluruh mahasiswa, dosen, dan staf.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {layanan.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:border-unusu-green/40 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-unusu-green flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
                    {item.kategori}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-unusu-green transition-colors">
                  {item.nama}
                </h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {item.deskripsi}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={item.urlTarget}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm font-bold text-unusu-green hover:underline"
                >
                  <span>Buka Aplikasi</span>
                  <ExternalLink className="w-4 h-4 ml-1.5" />
                </a>
                <span className="text-xs text-slate-400">Aktif</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 6 FAKULTAS UNUSU */}
      <section className="bg-slate-100/70 py-16 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-unusu-green">Pendidikan Berkualitas</span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Fakultas & Program Studi</h2>
              <p className="text-slate-600 text-sm mt-1">Pilihan disiplin ilmu untuk menyongsong masa depan berlandaskan nilai Islam rahmatan lil 'alamin.</p>
            </div>
            <Link
              to="/fakultas"
              className="mt-4 md:mt-0 inline-flex items-center text-sm font-bold text-unusu-green hover:underline"
            >
              <span>Lihat Detail Semua Fakultas</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fakultas.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition"
              >
                <div className="w-10 h-10 rounded-xl bg-unusu-green/10 text-unusu-green flex items-center justify-center mb-4">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-unusu-gold">{f.kode || 'UNUSU'}</span>
                  <span className="text-xs text-slate-400">{f.prodiList?.length || 0} Program Studi</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">{f.nama}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{f.deskripsi}</p>
                
                {/* List prodi badge */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  {f.prodiList?.slice(0, 3).map((p) => (
                    <div key={p.id} className="text-xs text-slate-600 flex items-center justify-between">
                      <span>• {p.nama}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">{p.jenjang}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BERITA & PENGUMUMAN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-unusu-green">Kabar Kampus</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Warta & Berita UNUSU</h2>
          </div>
          <Link
            to="/berita"
            className="mt-4 md:mt-0 inline-flex items-center text-sm font-bold text-unusu-green hover:underline"
          >
            <span>Semua Berita</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {berita.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={item.gambar || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'}
                    alt={item.judul}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-unusu-green text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow">
                    {item.kategori}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-unusu-green transition line-clamp-2 leading-snug">
                    {item.judul}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {item.ringkasan}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2">
                <Link
                  to={`/berita/${item.slug}`}
                  className="inline-flex items-center text-xs font-bold text-unusu-green hover:underline"
                >
                  <span>Baca Selengkapnya</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
