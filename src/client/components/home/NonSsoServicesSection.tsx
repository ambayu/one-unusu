import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../ui/Container';
import { SectionHeading } from '../ui/SectionHeading';
import { Icon } from '../ui/Icon';
import { fetchDirectories, DirectoryItem } from '../../services/api';
import { isImageSource } from '../../lib/appIcon';
import { assetUrl } from '../../lib/assets';
import {
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

/**
 * Ringkasan Direktori Publik & Portal Mandiri (Non-SSO) pada landing page.
 *
 * Hanya menampilkan enam entri pertama sebagai cuplikan. Daftar lengkap —
 * beserta tab kategori, pencarian, dan seluruh kartu — tersedia di halaman
 * Layanan Terpadu (`/layanan`) dan katalog aplikasi (`/aplikasi`).
 *
 * Data ditarik dari API direktori publik yang sama dengan panel penuh, agar
 * cuplikan di halaman depan tidak pernah menyimpang dari katalog sebenarnya.
 * Bila API gagal, seksi tetap tampil dengan ajakan menuju katalog.
 */
const CARD_LIMIT = 6;

const getDirectoryPreviewImage = (dir: DirectoryItem): string => {
  if (isImageSource(dir.icon)) {
    return dir.icon as string;
  }

  const teks = `${dir.nama} ${dir.kategori ?? ''} ${dir.urlTarget}`.toLowerCase();

  if (teks.includes('prodi') || teks.includes('siakad')) {
    return assetUrl('/assets/apps/app-siakad.png');
  }

  return assetUrl('/assets/campus-banner.png');
};

export const NonSsoServicesSection: React.FC = () => {
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDirectories = async () => {
      try {
        const res = await fetchDirectories();
        if (isMounted && res.data.status) {
          setDirectories(res.data.data);
        }
      } catch (err) {
        console.error('Gagal memuat direktori publik:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadDirectories();
    return () => {
      isMounted = false;
    };
  }, []);

  const previewDirectories = directories.slice(0, CARD_LIMIT);
  const hasMore = directories.length > CARD_LIMIT;

  return (
    <section
      id="portal-mandiri"
      aria-labelledby="non-sso-title"
      className="scroll-mt-24 bg-white py-16 sm:py-24 border-b border-stone-200"
    >
      <Container>
        <SectionHeading
          id="non-sso-title"
          eyebrow="Direktori Publik & Portal Mandiri"
          title="Aplikasi & Layanan Kampus Non-SSO"
          description="Akses langsung menuju portal informasi, pendaftaran mahasiswa, jurnal ilmiah, dan sistem informasi mandiri di lingkungan UNUSU."
          align="center"
          action={
            <Link
              to="/layanan"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors shadow-xs"
            >
              <span>{hasMore ? 'Lihat Semua' : 'Buka Layanan Terpadu'}</span>
              <Icon name="arrow-right" className="size-4" />
            </Link>
          }
        />

        {loading ? (
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white animate-pulse"
              >
                <div className="aspect-[16/10] bg-stone-200" />
                <div className="space-y-2.5 p-5">
                  <div className="h-4 w-3/4 rounded bg-stone-200" />
                  <div className="h-3 w-full rounded bg-stone-200" />
                </div>
              </div>
            ))}
          </div>
        ) : previewDirectories.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-6 py-10 text-center">
            <GlobeAltIcon className="mx-auto mb-2 size-8 text-stone-400" />
            <p className="text-sm font-semibold text-stone-700">
              Direktori publik belum dapat dimuat
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Buka Layanan Terpadu untuk melihat katalog lengkap atau mencoba lagi.
            </p>
            <Link
              to="/layanan"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#166534] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#14532D]"
            >
              <span>Buka Layanan Terpadu</span>
              <ArrowTopRightOnSquareIcon className="size-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {previewDirectories.map((dir) => (
                <div
                  key={dir.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white transition-all duration-200 hover:border-[#166534] hover:shadow-md"
                >
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#14532D]">
                      <img
                        src={getDirectoryPreviewImage(dir)}
                        alt={`Gambar portal ${dir.nama}`}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-103"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1E293B]/60 via-transparent to-transparent" />

                      <div className="absolute left-3 top-3 flex items-center gap-1.5">
                        <span className="rounded-[8px] border border-white/10 bg-[#1E293B]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          {dir.kategori || 'Portal Mandiri'}
                        </span>
                      </div>

                      <div className="absolute right-3 top-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                          <GlobeAltIcon className="size-3" />
                          <span>Non-SSO</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 p-5">
                      <h3 className="line-clamp-1 text-base font-bold text-stone-900 transition group-hover:text-[#166534]">
                        {dir.nama}
                      </h3>
                      <p className="line-clamp-2 text-xs leading-relaxed text-stone-600">
                        {dir.deskripsi || 'Layanan portal mandiri kampus UNUSU.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <a
                      href={dir.urlTarget}
                      target={dir.isExternal ? '_blank' : '_self'}
                      rel={dir.isExternal ? 'noopener noreferrer' : undefined}
                      className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#166534] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#14532D] hover:shadow-sm"
                    >
                      <span>Kunjungi Portal</span>
                      <ArrowTopRightOnSquareIcon className="size-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Ajakan menuju katalog lengkap */}
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              {hasMore && (
                <p className="text-xs text-stone-500">
                  Menampilkan {previewDirectories.length} dari {directories.length} portal
                  terdaftar.
                </p>
              )}
              <Link
                to="/layanan"
                data-testid="non-sso-layanan-terpadu-button"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#166534] px-6 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#14532D] hover:shadow-sm"
              >
                <span>Lihat Semua Layanan</span>
                <ArrowTopRightOnSquareIcon className="size-4" />
              </Link>
            </div>
          </>
        )}
      </Container>
    </section>
  );
};
