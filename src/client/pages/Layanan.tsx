import React from 'react';
import { Link } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { mainNavigation } from '../data/navigation';
import { externalUrls } from '../data/site';
import { digitalServices } from '../data/services';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Icon } from '../components/ui/Icon';

export const LayananPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Portal Terpadu"
            title="Layanan Digital Ekosistem UNUSU"
            description="Seluruh sistem akademik, perkuliahan online, surat-menyurat, dan penjaminan mutu dalam satu pintu Single Sign-On."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {digitalServices.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xs hover:shadow-xl hover:border-brand-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xl ring-1 ring-brand-100">
                      <Icon name={item.icon} className="size-7" />
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-stone-100 text-stone-700 rounded-full">
                      {item.status === 'available' ? 'Tersedia' : 'Segera Hadir'}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-brand-950 mb-2">{item.name}</h2>
                  <p className="text-xs font-semibold text-gold-600 mb-3">{item.fullName}</p>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-8 mt-8 border-t border-stone-100">
                  {item.url ? (
                    item.url.startsWith('http') ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center py-3.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-md transition-colors"
                      >
                        <span>Buka {item.name}</span>
                        <Icon name="external" className="size-4 ml-2" />
                      </a>
                    ) : (
                      <Link
                        to={item.url}
                        className="w-full inline-flex items-center justify-center py-3.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-md transition-colors"
                      >
                        <span>Buka {item.name}</span>
                        <Icon name="arrow-right" className="size-4 ml-2" />
                      </Link>
                    )
                  ) : (
                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center py-3.5 px-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 text-stone-400 font-semibold text-sm cursor-not-allowed"
                    >
                      <span>Dalam Pengembangan</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
export default LayananPage;
