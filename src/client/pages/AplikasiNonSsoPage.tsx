import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchDirectories,
  DirectoryItem,
} from '../services/api';
import { isImageSource } from '../lib/appIcon';
import { assetUrl } from '../lib/assets';
import {
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

export const AplikasiNonSsoPage: React.FC = () => {
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDirectories();
      if (res.data.status) {
        setDirectories(res.data.data);
      }
    } catch (err) {
      console.error('Gagal memuat direktori non-SSO:', err);
      setError('Gagal memuat daftar portal non-SSO dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

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
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#B45309]">
            <GlobeAltIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Daftar Aplikasi Non-SSO</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Portal mandiri, direktori publik, dan sistem informasi di luar integrasi Single Sign-On UNUSU.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          type="button"
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-3 rounded-[8px] border border-[#D8E5DC] text-sm font-semibold text-[#166534] hover:bg-[#F0FDF4] transition self-start md:self-auto disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
        >
          <ArrowPathIcon className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Filter Kategori & Search Bar */}
      <section className="bg-white rounded-[16px] border border-[#D8E5DC] p-4 sm:p-6 space-y-4" aria-labelledby="non-sso-filter-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="non-sso-filter-heading" className="text-base font-semibold text-[#1E293B]">Filter Portal Mandiri</h2>
          {(searchQuery || selectedCategory !== 'Semua') && (
            <button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory('Semua'); }} className="min-h-[44px] px-4 py-3 rounded-[8px] border border-[#D8E5DC] text-sm font-semibold text-[#166534] hover:bg-[#F0FDF4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]">
              Reset Semua Filter
            </button>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <div className="min-w-0">
            <label htmlFor="non-sso-search" className="mb-2 block text-sm font-semibold text-[#3A5544]">Cari portal mandiri</label>
            <div className="relative min-w-0">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                id="non-sso-search"
                type="text"
                placeholder="Cari portal mandiri..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 w-full pl-12 pr-4 py-3 text-sm rounded-[8px] border border-[#D8E5DC] bg-white focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] transition"
              />
            </div>
          </div>
        </div>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold text-[#3A5544]">Kategori portal</legend>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`min-h-[44px] px-4 py-3 rounded-[8px] text-sm font-semibold break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] focus-visible:ring-offset-2 transition-all ${
                selectedCategory === category
                  ? 'bg-[#166534] text-white shadow-sm'
                  : 'bg-[#F1F5F2] text-[#475569] hover:bg-[#E2E8F0]'
              }`}
            >
              {category}
            </button>
          ))}
          </div>
        </fieldset>
        <p className="text-sm text-[#64748B] break-words">Kategori: {selectedCategory}{searchQuery && ` · Pencarian: ${searchQuery}`}</p>
      </section>

      {error && (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-[#FECACA] bg-[#FEE2E2] px-4 py-3 text-xs font-medium text-[#B91C1C]">
          <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Kartu Non-SSO */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[18px] border border-stone-200 bg-white animate-pulse"
            >
              <div className="aspect-[16/10] bg-[#E6EFE8]" />
              <div className="p-5 space-y-2.5">
                <div className="h-4 w-2/3 rounded bg-[#E6EFE8]" />
                <div className="h-3 w-full rounded bg-[#EEF4EF]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDirectories.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#D8E5DC] bg-white p-12 text-center text-xs text-[#64748B]">
          Tidak ada portal mandiri yang cocok dengan filter atau kata kunci pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDirectories.map((dir) => (
            <div
              key={dir.id}
              className="group flex flex-col justify-between overflow-hidden rounded-[18px] border border-[#D8E5DC] bg-white shadow-sm transition-all duration-200 hover:border-[#166534] hover:shadow-md"
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
                  <h3 className="font-bold text-base text-[#1E293B] group-hover:text-[#166534] transition line-clamp-1">
                    {dir.nama}
                  </h3>
                  <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2">
                    {dir.deskripsi || 'Layanan portal publik terpadu UNUSU.'}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <a
                  href={dir.urlTarget}
                  target={dir.isExternal ? '_blank' : '_self'}
                  rel={dir.isExternal ? 'noopener noreferrer' : undefined}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] focus-visible:ring-offset-2 transition-all"
                >
                  <span>Kunjungi Portal</span>
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 shrink-0" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
