import React, { useEffect, useState } from 'react';
import { fetchBerita, BeritaItem } from '../services/api';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BeritaPage: React.FC = () => {
  const [berita, setBerita] = useState<BeritaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBerita(12)
      .then((res) => setBerita(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-xs font-bold uppercase tracking-wider text-unusu-green bg-emerald-50 px-3 py-1 rounded-full">
          Kabar & Informasi
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 mt-3">Berita & Warta UNUSU</h1>
        <p className="text-slate-600 mt-3 text-base">
          Informasi terkini seputar kegiatan akademik, prestasi mahasiswa, pengabdian masyarakat, dan pengumuman resmi rektorat.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {berita.map((item) => (
          <article
            key={item.id}
            className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  src={item.gambar || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'}
                  alt={item.judul}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-unusu-green text-white text-xs font-bold px-3 py-1 rounded-lg shadow">
                  {item.kategori}
                </span>
              </div>

              <div className="p-6">
                <div className="flex items-center space-x-4 text-xs text-slate-400 mb-3">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{item.penulis || 'Humas'}</span>
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-900 group-hover:text-unusu-green transition line-clamp-2 leading-snug mb-3">
                  {item.judul}
                </h2>
                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {item.ringkasan}
                </p>
              </div>
            </div>

            <div className="p-6 pt-0">
              <span className="inline-flex items-center text-xs font-bold text-unusu-green hover:underline">
                <span>Baca Pengumuman Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
