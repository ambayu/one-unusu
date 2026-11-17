import React from 'react';
import { ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface PanelPageTemplateProps {
  /** Label kecil di atas judul. Bawaannya label panel administrasi. */
  badge?: string;
  /** Icon untuk label kecil. Bawaannya perisai (konteks tata kelola). */
  badgeIcon?: React.ElementType;
  /** Keterangan tambahan setelah label, mis. nama peran pengguna. */
  badgeSuffix?: string;
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Template halaman panel: satu kartu permukaan putih berisi label, judul,
 * aksi segarkan, dan slot konten.
 *
 * Template ini adalah generalisasi dari `AdminPanelTemplate`. Halaman dosen
 * (mis. Berkas Dosen) membutuhkan kerangka visual yang sama persis, tetapi
 * tidak boleh mengklaim dirinya sebagai panel administrasi. Karena itu label
 * dan icon dijadikan prop, bukan ditulis tetap di dalam komponen.
 *
 * Sidebar TIDAK dipasang di sini. Sidebar dipasang sekali oleh `PanelLayout`
 * (route induk di App.tsx), sehingga berpindah antar halaman panel tidak
 * melepas/memasang ulang sidebar.
 */
export const PanelPageTemplate: React.FC<PanelPageTemplateProps> = ({
  badge = 'Panel Administrasi ONE UNUSU',
  badgeIcon: BadgeIcon = ShieldCheckIcon,
  badgeSuffix,
  title,
  description,
  onRefresh,
  refreshing = false,
  headerAction,
  children,
}) => (
  <div className="w-full min-w-0 bg-white border border-[#D8E5DC] rounded-[16px] shadow-sm overflow-hidden">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-[#D8E5DC]">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
          <BadgeIcon className="w-3 h-3" />
          {badge}
          {badgeSuffix ? ` · ${badgeSuffix}` : ''}
        </span>
        <h1 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B]">{title}</h1>
        <p className="text-xs text-[#475569] mt-0.5">{description}</p>
      </div>

      {headerAction}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8E5DC] bg-white text-xs font-semibold text-[#475569] hover:bg-[#F1F5F2] transition disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      )}
    </div>

    <div className="w-full min-w-0 p-5 sm:p-6 space-y-5">{children}</div>
  </div>
);
