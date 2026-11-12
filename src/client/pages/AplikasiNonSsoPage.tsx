import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchDirectories,
  DirectoryItem,
} from '../services/api';
import { isImageSource } from '../lib/appIcon';
import {
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  Squares2X2Icon,
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
    } catch (err: any) {
      console.error('Gagal memuat direktori non-SSO:', err);
      setError('Gagal memuat daftar portal non-SSO dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const renderDirectoryIcon = (iconName: string | null) => {
    if (isImageSource(iconName)) {
      return (
        <img
          src={iconName as string}
          alt="Ikon Portal"
          className="w-full h-full object-contain rounded-[6px]"
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
      <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      <div className="bg-white rounded-[18px] border border-[#D8E5DC] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-[#166534] text-white shadow-xs'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-4.5 rounded-[16px] bg-stone-50 border border-stone-200 animate-pulse space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-200" />
              <div className="h-4 w-2/3 rounded bg-stone-200" />
              <div className="h-3 w-full rounded bg-stone-200" />
            </div>
          ))}
        </div>
      ) : filteredDirectories.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#D8E5DC] bg-white p-12 text-center text-xs text-[#64748B]">
          Tidak ada portal mandiri yang cocok dengan filter atau kata kunci pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDirectories.map((dir) => (
            <div
              key={dir.id}
              className="p-4.5 rounded-[16px] bg-white border border-[#D8E5DC] hover:border-[#166534] transition flex flex-col justify-between space-y-3 group shadow-2xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[10px] bg-[#DCFCE7] flex items-center justify-center text-[#166534] transition-colors group-hover:bg-[#166534] group-hover:text-white">
                    {renderDirectoryIcon(dir.icon)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200/60">
                    {dir.kategori || 'Portal'}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-[#1E293B] group-hover:text-[#166534] transition">
                    {dir.nama}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed line-clamp-2">
                    {dir.deskripsi || 'Layanan portal publik terpadu UNUSU.'}
                  </p>
                </div>
              </div>

              <a
                href={dir.urlTarget}
                target={dir.isExternal ? '_blank' : '_self'}
                rel={dir.isExternal ? 'noopener noreferrer' : undefined}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] bg-[#F1F5F2] hover:bg-[#166534] text-[#1E293B] hover:text-white text-xs font-semibold transition group-hover:border-[#166534] border border-[#D8E5DC]"
              >
                <span>Kunjungi Portal</span>
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
