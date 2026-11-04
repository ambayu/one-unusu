import React from 'react';
import { ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { SidebarLayout } from '../SidebarLayout';
import { UserProfile } from '../../services/api';
import { ROLE_LABELS } from '../../lib/landing';

interface AdminPanelTemplateProps {
  user: UserProfile | null;
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children: React.ReactNode;
}

/**
 * Template halaman tata kelola: sidebar, lalu satu kartu permukaan putih yang membungkus
 * judul halaman, aksi segarkan, dan body konten. Halaman /admin/* cukup mengirim konten
 * tanpa menyiapkan container, padding, atau jarak antar-blok sendiri.
 */
export const AdminPanelTemplate: React.FC<AdminPanelTemplateProps> = ({
  user,
  title,
  description,
  onRefresh,
  refreshing = false,
  children,
}) => (
  <SidebarLayout user={user}>
    <div className="w-full min-w-0 bg-white border border-[#D8E5DC] rounded-[16px] shadow-xs overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-[#D8E5DC]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
            <ShieldCheckIcon className="w-3 h-3" />
            Panel Administrasi ONE UNUSU
            {user ? ` · ${ROLE_LABELS[user.role] ?? user.role}` : ''}
          </span>
          <h1 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B]">{title}</h1>
          <p className="text-xs text-[#475569] mt-0.5">{description}</p>
        </div>

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
  </SidebarLayout>
);
