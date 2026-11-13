import React from 'react';
import { Link } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { mainNavigation } from '../data/navigation';
import { externalUrls } from '../data/site';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Icon } from '../components/ui/Icon';
import { NonSsoDirectoryPanel } from '../components/home/NonSsoDirectoryPanel';

/**
 * Halaman Layanan Terpadu.
 *
 * Sengaja TIDAK memuat grid katalog aplikasi. Katalog lengkap — baik yang
 * ber-SSO maupun portal mandiri — sudah disajikan halaman `/aplikasi` yang
 * datanya ditarik langsung dari registri SSO dan direktori publik. Di sini
 * hanya direktori non-SSO yang ditampilkan, karena itulah yang dimaksud
 * "Direktori Publik & Portal Mandiri": daftar portal yang bisa dibuka tanpa
 * akun ONE UNUSU.
 */
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
            description="Direktori publik dan portal mandiri non-SSO Universitas Nahdlatul Ulama Sumatera Utara dalam satu pintu."
          />

          {/* Penunjuk ke katalog aplikasi ber-SSO; katalognya ada di /aplikasi */}
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 flex-shrink-0 place-items-center rounded-xl border border-emerald-200 bg-white text-[#166534]">
                <Icon name="shield" className="size-5" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-stone-900">
                  Mencari aplikasi yang terintegrasi SSO?
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
                  LMS, E-Surat, LPM, LPPM, SDM &amp; Sarpras, hingga Akreditasi
                  terhubung Single Sign-On ONE UNUSU.
                </p>
              </div>
            </div>
            <Link
              to="/aplikasi"
              className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-[#166534] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#14532D]"
            >
              <span>Lihat Katalog Aplikasi</span>
              <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>

          {/* Direktori Publik & Portal Mandiri Non-SSO */}
          <div className="mt-16">
            <SectionHeading
              eyebrow="Direktori Publik & Portal Mandiri"
              title="Aplikasi & Layanan Kampus Non-SSO"
              description="Akses langsung menuju portal informasi, pendaftaran mahasiswa, jurnal ilmiah, dan sistem informasi mandiri di lingkungan UNUSU."
            />
            <NonSsoDirectoryPanel />
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
export default LayananPage;
