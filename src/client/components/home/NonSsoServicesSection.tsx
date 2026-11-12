import React, { useEffect, useState, useMemo } from 'react';
import { Container } from '../ui/Container';
import { SectionHeading } from '../ui/SectionHeading';
import { fetchDirectories, DirectoryItem } from '../../services/api';
import { isImageSource } from '../../lib/appIcon';
import {
  GlobeAltIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  Squares2X2Icon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const renderDirectoryIcon = (iconName: string | null) => {
  if (isImageSource(iconName)) {
    return (
      <img
        src={iconName as string}
        alt="Ikon Portal"
        className="w-full h-full object-contain rounded-[8px]"
      />
    );
  }

  switch (iconName) {
    case 'AcademicCapIcon':
      return <AcademicCapIcon className="w-5 h-5" />;
    case 'BuildingOffice2Icon':
      return <BuildingOffice2Icon className="w-5 h-5" />;
    case 'Squares2X2Icon':
      return <Squares2X2Icon className="w-5 h-5" />;
    case 'GlobeAltIcon':
    default:
      return <GlobeAltIcon className="w-5 h-5" />;
  }
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
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-stone-200 bg-stone-50 animate-pulse space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-200" />
                <div className="h-4 w-3/4 rounded bg-stone-200" />
                <div className="h-3 w-full rounded bg-stone-200" />
                <div className="h-3 w-2/3 rounded bg-stone-200" />
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
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDirectories.map((dir) => (
              <div
                key={dir.id}
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-[#166534] hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#166534] transition-colors group-hover:bg-[#166534] group-hover:text-white">
                      {renderDirectoryIcon(dir.icon)}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200/60">
                      {dir.kategori || 'Portal'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-stone-900 group-hover:text-[#166534] transition">
                      {dir.nama}
                    </h3>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed line-clamp-2">
                      {dir.deskripsi || 'Layanan portal mandiri kampus UNUSU.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-stone-400">
                    {dir.isExternal ? 'Tautan Eksternal' : 'Portal Lokal'}
                  </span>
                  <a
                    href={dir.urlTarget}
                    target={dir.isExternal ? '_blank' : '_self'}
                    rel={dir.isExternal ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:text-[#14532D] transition"
                  >
                    <span>Kunjungi</span>
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
