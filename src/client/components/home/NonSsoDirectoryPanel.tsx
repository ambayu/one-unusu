import React, { useEffect, useMemo, useState } from 'react';
import { fetchDirectories, DirectoryItem } from '../../services/api';
import { isImageSource } from '../../lib/appIcon';
import { assetUrl } from '../../lib/assets';
import {
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

/**
 * Panel direktori publik & portal mandiri NON-SSO.
 *
 * Sebelumnya daftar kartu dan tab kategori ini tampil langsung di landing
 * page. Agar halaman depan tetap ringkas dan fokus pada layanan ber-SSO,
 * seluruh katalog dipindahkan ke sini dan dipakai halaman Layanan Terpadu
 * (`/layanan`). Landing page cukup menautkan ke halaman tersebut.
 */
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

export const NonSsoDirectoryPanel: React.FC = () => {
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

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
    <div id="portal-mandiri" className="scroll-mt-24">
      {/* Filter Bar: Pencarian & Pilihan Kategori */}
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-[#166534] text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

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
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/60 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="rounded-[8px] bg-[#1E293B]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                      {dir.kategori || 'Portal Mandiri'}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[12px] bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold shadow-sm hover:shadow-sm transition-all"
                >
                  <span>Kunjungi Portal</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
