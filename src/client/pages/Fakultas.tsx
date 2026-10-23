import React, { useEffect, useState } from 'react';
import { fetchFakultas, FakultasItem } from '../services/api';
import { GraduationCap, ArrowRight, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FakultasPage: React.FC = () => {
  const [fakultas, setFakultas] = useState<FakultasItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFakultas()
      .then((res) => setFakultas(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-xs font-bold uppercase tracking-wider text-unusu-green bg-emerald-50 px-3 py-1 rounded-full">
          Akademik UNUSU
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 mt-3">6 Fakultas Unggulan</h1>
        <p className="text-slate-600 mt-3 text-base">
          Setiap fakultas di UNUSU mengintegrasikan keunggulan keilmuan kontemporer dengan penanaman nilai moral dan spiritual berlandaskan tradisi keilmuan Nahdlatul Ulama.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {fakultas.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-unusu-green/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-100/70 text-emerald-800">
                  {f.kode || 'FAKULTAS'}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {f.prodiList?.length || 0} Program Studi
                </span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">{f.nama}</h2>
              {f.dekan && (
                <p className="text-xs font-medium text-slate-500 mb-4">
                  Dekan: <span className="font-semibold text-slate-700">{f.dekan}</span>
                </p>
              )}
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {f.deskripsi}
              </p>

              {/* List Prodi */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Program Studi Tersedia:</p>
                {f.prodiList?.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/60 transition group"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-unusu-green">{p.nama}</p>
                      <p className="text-xs text-slate-500">Kaprodi: {p.kaprodi || '-'}</p>
                    </div>
                    <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-emerald-700 font-semibold shadow-2xs">
                      {p.akreditasi || 'Terakreditasi'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
              <a
                href="https://pmb.unusu.ac.id"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-sm font-bold text-unusu-green hover:underline"
              >
                <span>Daftar Lewat PMB Online</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
