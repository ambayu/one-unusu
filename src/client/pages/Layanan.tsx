import React, { useEffect, useState } from 'react';
import { fetchLayanan, LayananItem } from '../services/api';
import { LayoutGrid, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

export const LayananPage: React.FC = () => {
  const [layanan, setLayanan] = useState<LayananItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLayanan()
      .then((res) => setLayanan(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-xs font-bold uppercase tracking-wider text-unusu-green bg-emerald-50 px-3 py-1 rounded-full">
          Portal Gateway
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 mt-3">Layanan Terpadu Ekosistem UNUSU</h1>
        <p className="text-slate-600 mt-3 text-base">
          Akses seluruh sistem aplikasi akademik, perkuliahan digital (LMS), administrasi persuratan, dan layanan penjaminan mutu dalam satu pintu Single Sign-On (SSO).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {layanan.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-unusu-green/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-unusu-green flex items-center justify-center font-bold text-xl shadow-inner">
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                  {item.kategori}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">{item.nama}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {item.deskripsi}
              </p>
            </div>

            <div className="pt-8 mt-8 border-t border-slate-100">
              <a
                href={item.urlTarget}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center py-3.5 px-4 rounded-xl bg-unusu-green hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-900/10 transition group"
              >
                <span>Buka {item.nama}</span>
                <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
