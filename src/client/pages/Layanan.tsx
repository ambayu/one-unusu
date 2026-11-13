import React from 'react';
import { Topbar } from '../components/layout/Topbar';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { mainNavigation } from '../data/navigation';
import { externalUrls } from '../data/site';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';
import { NonSsoDirectoryPanel } from '../components/home/NonSsoDirectoryPanel';

/**
 * Halaman Layanan Terpadu — Direktori Publik & Portal Mandiri.
 *
 * Halaman ini HANYA memuat direktori non-SSO: portal yang bisa dibuka tanpa
 * akun ONE UNUSU. Katalog lengkap aplikasi (SSO maupun non-SSO) disajikan
 * halaman `/aplikasi` yang datanya ditarik dari registri SSO dan direktori
 * publik, sehingga tidak diduplikasi di sini.
 */
export const LayananPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-16 sm:py-24">
        <Container>
          {/* Direktori Publik & Portal Mandiri Non-SSO */}
          <div>
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
