import React from 'react';
import { Topbar } from '../components/layout/Topbar';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { mainNavigation } from '../data/navigation';
import { externalUrls } from '../data/site';
import { faculties, studyPrograms, formatOrder } from '../data/academics';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

export const ProdiPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Program Studi"
            title="Daftar 14 Program Studi UNUSU"
            description="Pilihan program sarjana dan diploma berstandar mutu tinggi untuk mempersiapkan karir masa depan Anda."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studyPrograms.map((p) => {
              const faculty = faculties.find((f) => f.id === p.facultyId);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-display font-bold text-xs px-2.5 py-1 rounded bg-brand-50 text-brand-800 border border-brand-200">
                        {p.degree || 'S1'}
                      </span>
                      <span className="text-xs font-semibold text-stone-400 font-mono">
                        #{formatOrder(p.order)}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-brand-950 mb-1">{p.name}</h3>
                    <p className="text-xs text-gold-600 font-medium mb-3">
                      {faculty?.name || 'Fakultas'}
                    </p>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      Program studi unggulan UNUSU dengan kurikulum adaptif industri, riset, dan penguatan nilai Aswaja.
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span>Jenjang: <strong>{p.degree || 'S1'}</strong></span>
                    <span className="font-bold text-brand-700">Akreditasi Baik</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
export default ProdiPage;
