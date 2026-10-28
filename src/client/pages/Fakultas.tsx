import React from 'react';
import { Topbar } from '../components/layout/Topbar';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { mainNavigation } from '../data/navigation';
import { externalUrls } from '../data/site';
import { faculties, studyPrograms, formatOrder } from '../data/academics';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Icon } from '../components/ui/Icon';

export const FakultasPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Akademik UNUSU"
            title="Fakultas & Program Studi"
            description="6 Fakultas unggulan mengintegrasikan keilmuan kontemporer dengan nilai-nilai Ahlussunnah wal Jama'ah."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {faculties.map((f) => {
              const prodis = studyPrograms.filter((p) => p.facultyId === f.id);
              return (
                <div
                  key={f.id}
                  className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xs hover:shadow-xl hover:border-brand-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-brand-50 text-brand-800 border border-brand-200">
                        FAKULTAS {formatOrder(f.order)}
                      </span>
                      <span className="text-xs font-semibold text-stone-400">
                        {prodis.length} Program Studi
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-brand-950 mb-3">{f.name}</h2>
                    <p className="text-sm text-stone-600 leading-relaxed mb-6">
                      Fakultas yang berdedikasi menghasilkan lulusan berkompetensi tinggi, siap berkarir di era digital, dan berakhlak mulia.
                    </p>

                    <div className="space-y-2 pt-4 border-t border-stone-100">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Program Studi Tersedia:</p>
                      {prodis.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-ivory/80 text-sm font-semibold text-brand-900 border border-stone-100 hover:bg-brand-50/50 transition-colors"
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                            <span>{p.name}</span>
                          </div>
                          <span className="text-xs text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200 font-mono">
                            {p.degree || 'S1'}
                          </span>
                        </div>
                      ))}
                    </div>
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
export default FakultasPage;
