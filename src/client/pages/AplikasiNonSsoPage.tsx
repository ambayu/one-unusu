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
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D8E5DC] text-xs font-semibold text-[#166534] hover:bg-[#F0FDF4] transition self-start md:self-auto disabled:opacity-60"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Filter Kategori & Search Bar */}
      <div className="bg-white rounded-[18px] border border-[#D8E5DC] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-[#166534] text-white shadow-sm'
                  : 'bg-[#F1F5F2] text-[#475569] hover:bg-[#E2E8F0]'
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
            placeholder="Cari portal mandiri..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#D8E5DC] bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534] transition"
          />
        </div>
      </div>

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
