import React, { useEffect, useId } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type NotificationType =
  | 'success'
  | 'error'
  | 'confirm'
  | 'info'
  | 'denied'
  | 'warning'
  | 'danger';

export interface NotificationModalProps {
  isOpen: boolean;
  type?: NotificationType;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  type = 'info',
  title,
  message,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  onConfirm,
  onClose,
  loading = false,
}) => {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const defaultTitle = {
    success: 'Berhasil',
    error: 'Terjadi Kesalahan',
    danger: 'Terjadi Kesalahan',
    warning: 'Perhatian',
    confirm: 'Konfirmasi Tindakan',
    info: 'Informasi Sistem',
    denied: 'Akses Ditolak',
  }[type] || 'Informasi Sistem';

  const configMap = {
    success: {
      icon: CheckCircleIcon,
      badge: 'Notifikasi Sistem',
      headerBg: 'bg-[#F0FDF4]',
      headerBorder: 'border-[#D8E5DC]',
      accentBar: 'bg-[#166534]',
      iconBg: 'bg-[#DCFCE7]',
      iconBorder: 'border-[#BBF7D0]',
      iconColor: 'text-[#166534]',
      badgeBg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
      btnBg: 'bg-[#166534] hover:bg-[#14532D] focus-visible:ring-[#166534]',
    },
    denied: {
      icon: ShieldExclamationIcon,
      badge: 'Keamanan SSO UNUSU',
      headerBg: 'bg-[#F0FDF4]',
      headerBorder: 'border-[#D8E5DC]',
      accentBar: 'bg-[#166534]',
      iconBg: 'bg-[#DCFCE7]',
      iconBorder: 'border-[#BBF7D0]',
      iconColor: 'text-[#166534]',
      badgeBg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
      btnBg: 'bg-[#166534] hover:bg-[#14532D] focus-visible:ring-[#166534]',
    },
    info: {
      icon: InformationCircleIcon,
      badge: 'Informasi Layanan',
      headerBg: 'bg-[#F0FDF4]',
      headerBorder: 'border-[#D8E5DC]',
      accentBar: 'bg-[#15803D]',
      iconBg: 'bg-[#DCFCE7]',
      iconBorder: 'border-[#BBF7D0]',
      iconColor: 'text-[#166534]',
      badgeBg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
      btnBg: 'bg-[#166534] hover:bg-[#14532D] focus-visible:ring-[#166534]',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      badge: 'Perhatian',
      headerBg: 'bg-[#F0FDF4]',
      headerBorder: 'border-[#D8E5DC]',
      accentBar: 'bg-[#166534]',
      iconBg: 'bg-[#DCFCE7]',
      iconBorder: 'border-[#BBF7D0]',
      iconColor: 'text-[#166534]',
      badgeBg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
      btnBg: 'bg-[#166534] hover:bg-[#14532D] focus-visible:ring-[#166534]',
    },
    error: {
      icon: ExclamationCircleIcon,
      badge: 'Peringatan Sistem',
      headerBg: 'bg-[#F0FDF4]',
      headerBorder: 'border-[#D8E5DC]',
      accentBar: 'bg-[#166534]',
      iconBg: 'bg-[#DCFCE7]',
      iconBorder: 'border-[#BBF7D0]',
      iconColor: 'text-[#166534]',
      badgeBg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
      btnBg: 'bg-[#166534] hover:bg-[#14532D] focus-visible:ring-[#166534]',
    },
    danger: {
      icon: ExclamationCircleIcon,
      badge: 'Peringatan Sistem',
      headerBg: 'bg-[#F0FDF4]',
      headerBorder: 'border-[#D8E5DC]',
      accentBar: 'bg-[#166534]',
      iconBg: 'bg-[#DCFCE7]',
      iconBorder: 'border-[#BBF7D0]',
      iconColor: 'text-[#166534]',
      badgeBg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
      btnBg: 'bg-[#166534] hover:bg-[#14532D] focus-visible:ring-[#166534]',
    },
    confirm: {
      icon: ExclamationTriangleIcon,
      badge: 'Konfirmasi Tindakan',
      headerBg: 'bg-[#FEF3C7]/45',
      headerBorder: 'border-[#FDE68A]',
      accentBar: 'bg-[#B45309]',
      iconBg: 'bg-[#FEF3C7]',
      iconBorder: 'border-[#FDE68A]',
      iconColor: 'text-[#B45309]',
      badgeBg: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
      btnBg: 'bg-[#B91C1C] hover:bg-[#991B1B] focus-visible:ring-[#B91C1C]',
    },
  };

  const config = configMap[type] ?? configMap.info;

  const IconComponent = config.icon;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#1E293B]/60 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-[20px] max-w-lg w-full overflow-hidden shadow-2xl border border-[#D8E5DC] transition-all duration-150"
      >
        {/* Garis aksen atas kelembagaan */}
        <div className={`h-1.5 w-full ${config.accentBar}`} />

        {/* Header visual hijau lembut */}
        <div
          className={`${config.headerBg} border-b ${config.headerBorder} px-6 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6 flex items-start justify-between gap-4`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[16px] ${config.iconBg} border ${config.iconBorder} flex items-center justify-center flex-shrink-0 ${config.iconColor} shadow-2xs`}
            >
              <IconComponent className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-[8px] text-[11px] font-bold border ${config.badgeBg}`}
              >
                {config.badge}
              </span>
              <h3
                id={titleId}
                className="font-extrabold text-[#1E293B] text-lg sm:text-xl tracking-tight leading-snug"
              >
                {title || defaultTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup dialog notifikasi"
            onClick={onClose}
            disabled={loading}
            className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-[#64748B] hover:text-[#166534] bg-white/80 hover:bg-white border border-[#D8E5DC] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Isi pesan notifikasi */}
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <p
            id={descId}
            className="text-sm sm:text-[15px] text-[#475569] leading-relaxed font-medium"
          >
            {message}
          </p>
        </div>

        {/* Footer aksi */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 bg-[#F1F5F2]/70 border-t border-[#E8EFEA] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          {type === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="min-h-[44px] px-5 py-2.5 rounded-[10px] text-[#475569] bg-white hover:bg-[#F0FDF4] border border-[#D8E5DC] font-semibold text-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`min-h-[44px] px-6 py-2.5 rounded-[10px] text-white ${config.btnBg} font-bold text-sm shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1`}
              >
                {loading ? 'Memproses...' : confirmLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`min-h-[44px] w-full sm:w-auto sm:min-w-[160px] px-6 py-2.5 rounded-[10px] text-white ${config.btnBg} font-bold text-sm shadow-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1`}
            >
              Mengerti & Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
