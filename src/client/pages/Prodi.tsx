import React, { useEffect, useState } from 'react';
import { fetchProdi, ProdiItem } from '../services/api';
import { GraduationCap, Award, BookOpen, CheckCircle2 } from 'lucide-react';

export const ProdiPage: React.FC = () => {
  const [prodis, setProdis] = useState<ProdiItem[]>([]);
  const [filterFakultas, setFilterFakultas] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProdi()
      .then((res) => setProdis(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterFakultas === 'all' 
    ? prodis 
    : prodis.filter(p => p.fakultas?.nama.toLowerCase().includes(filterFakultas.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-xs font-bold uppercase tracking-wider text-unusu-green bg-emerald-50 px-3 py-1 rounded-full">
          Jenjang Sarjana (S1)
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 mt-3">14 Program Studi UNUSU</h1>
        <p className="text-slate-600 mt-3 text-base">
          Temukan program studi yang sesuai dengan minat dan potensi karir masa depan kamu. Semua program studi berorientasi pada kompetensi industri dan nilai integritas luhur.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-unusu-green/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-unusu-green border border-emerald-100">
                  {item.jenjang}
                </span>
                <div className="flex items-center space-x-1 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{item.akreditasi || 'Baik'}</span>
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-1">{item.nama}</h2>
              <p className="text-xs font-medium text-slate-500 mb-3">
                Fakultas: <span className="text-slate-700">{item.fakultas?.nama || 'UNUSU'}</span>
              </p>

              {item.kaprodi && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <span className="text-slate-400 block font-medium">Ketua Program Studi:</span>
                  <span className="font-semibold text-slate-800">{item.kaprodi}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <a
                href="https://pmb.unusu.ac.id"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-unusu-green hover:underline"
              >
                Daftar Sekarang →
              </a>
              <span className="text-[11px] text-slate-400">Reguler & KIP Kuliah</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
