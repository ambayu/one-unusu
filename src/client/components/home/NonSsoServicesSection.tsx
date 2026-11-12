import React, { useEffect, useState, useMemo } from 'react';
import { Container } from '../ui/Container';
import { SectionHeading } from '../ui/SectionHeading';
import { fetchDirectories, DirectoryItem } from '../../services/api';
import { isImageSource } from '../../lib/appIcon';
import { assetUrl } from '../../lib/assets';
import {
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

/**
 * Menentukan gambar sampul untuk kartu portal non-SSO.
 *
 * Kolom `icon` menyimpan dua bentuk nilai: sumber gambar hasil unggahan admin
 * atau nama ikon lama (mis. "AcademicCapIcon"). Nilai gambar dipakai apa
 * adanya; nama ikon diterjemahkan ke aset bawaan agar seluruh kartu tetap
 * memiliki sampul visual seperti pada katalog aplikasi SSO.
 */
const getDirectoryPreviewImage = (dir: DirectoryItem): string => {
  if (isImageSource(dir.icon)) {
    return dir.icon as string;
  }

  const teks = `${dir.nama} ${dir.kategori ?? ''} ${dir.urlTarget}`.toLowerCase();

  if (teks.includes('lppm')) return assetUrl('/assets/apps/app-lppm.png');
  if (teks.includes('lpm')) return assetUrl('/assets/apps/app-lpm.png');
  if (teks.includes('esurat') || teks.includes('e-surat') || teks.includes('surat')) {
    return assetUrl('/assets/apps/app-esurat.png');
  }
  if (teks.includes('sarpras') || teks.includes('fasilitas')) {
    return assetUrl('/assets/apps/app-sarpras.png');
  }
  if (teks.includes('lms') || teks.includes('e-learning') || teks.includes('kuliah')) {
    return assetUrl('/assets/apps/app-lms.png');
  }
  if (teks.includes('pmb') || teks.includes('admisi') || teks.includes('pendaftaran')) {
    return assetUrl('/assets/campus-banner.png');
  }

  // Portal prodi dan SIAKAD berbagi sampul akademik yang sama.
  return assetUrl('/assets/apps/app-siakad.png');
};

export const NonSsoServicesSection: React.FC = () => {
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const loadDirectories = async () => {
      try {
        setLoading(true);
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

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        directories
          .map((d) => d.kategori?.trim())
          .filter((k): k is string => Boolean(k))
      )
    );
    return ['Semua', ...unique];
  }, [directories]);

  const filteredDirectories = useMemo(() => {
    return directories.filter((dir) => {
      const matchCategory =
        selectedCategory === 'Semua' ||
        dir.kategori?.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        dir.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dir.deskripsi && dir.deskripsi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (dir.kategori && dir.kategori.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [directories, selectedCategory, searchQuery]);

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
        />

        {/* Filter Bar: Pencarian & Pilihan Kategori */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tab Kategori */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Kolom Pencarian */}
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Cari portal atau layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534] transition"
            />
          </div>
        </div>

        {/* Grid Kartu Direktori */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white animate-pulse"
              >
                <div className="aspect-[16/10] bg-stone-200" />
                <div className="p-5 space-y-2.5">
                  <div className="h-4 w-3/4 rounded bg-stone-200" />
                  <div className="h-3 w-full rounded bg-stone-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDirectories.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-12 text-center">
            <GlobeAltIcon className="w-8 h-8 mx-auto text-stone-400 mb-2" />
            <p className="text-sm font-semibold text-stone-700">Tidak ada portal yang cocok</p>
            <p className="text-xs text-stone-500 mt-1">
              Coba sesuaikan kata kunci pencarian atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDirectories.map((dir) => (
              <div
                key={dir.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white transition-all duration-200 hover:border-[#166534] hover:shadow-md"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#14532D]">
                    <img
                      src={getDirectoryPreviewImage(dir)}
                      alt={`Gambar portal ${dir.nama}`}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-103"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/60 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="rounded-[8px] bg-[#1E293B]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                        {dir.kategori || 'Portal Mandiri'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                        <GlobeAltIcon className="w-3 h-3" />
                        <span>Non-SSO</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-base text-stone-900 group-hover:text-[#166534] transition line-clamp-1">
                      {dir.nama}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                      {dir.deskripsi || 'Layanan portal mandiri kampus UNUSU.'}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <a
                    href={dir.urlTarget}
                    target={dir.isExternal ? '_blank' : '_self'}
                    rel={dir.isExternal ? 'noopener noreferrer' : undefined}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[12px] bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all"
                  >
                    <span>Kunjungi Portal</span>
                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
};
