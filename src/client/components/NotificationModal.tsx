import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'error' | 'confirm' | 'info';

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
  if (!isOpen) return null;

  const defaultTitle = {
    success: 'Berhasil!',
    error: 'Terjadi Kesalahan',
    confirm: 'Konfirmasi Tindakan',
    info: 'Informasi',
  }[type];

  const config = {
    success: {
      icon: CheckCircleIcon,
      iconBg: 'bg-[#DCFCE7]',
      iconBorder: 'border-[#BBF7D0]',
      iconColor: 'text-[#166534]',
      btnBg: 'bg-[#166534] hover:bg-[#14532D]',
    },
    error: {
      icon: ExclamationCircleIcon,
      iconBg: 'bg-[#FEE2E2]',
      iconBorder: 'border-[#FECACA]',
      iconColor: 'text-[#B91C1C]',
      btnBg: 'bg-[#B91C1C] hover:bg-[#991B1B]',
    },
    confirm: {
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-[#FEF3C7]',
      iconBorder: 'border-[#FDE68A]',
      iconColor: 'text-[#B45309]',
      btnBg: 'bg-[#B91C1C] hover:bg-[#991B1B]',
    },
    info: {
      icon: InformationCircleIcon,
      iconBg: 'bg-[#EFF6FF]',
      iconBorder: 'border-[#BFDBFE]',
      iconColor: 'text-[#1D4ED8]',
      btnBg: 'bg-[#166534] hover:bg-[#14532D]',
    },
  }[type];

  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-[#1E293B]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#D8E5DC] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div
            className={`w-12 h-12 rounded-[14px] ${config.iconBg} border ${config.iconBorder} flex items-center justify-center flex-shrink-0 ${config.iconColor}`}
          >
            <IconComponent className="w-7 h-7" />
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2] transition disabled:opacity-50"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="font-bold text-[#1E293B] text-base">{title || defaultTitle}</h3>
          <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EFEA]">
          {type === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-[8px] text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold text-xs transition disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 rounded-[8px] text-white ${config.btnBg} font-semibold text-xs shadow-xs transition disabled:opacity-50`}
              >
                {loading ? 'Memproses...' : confirmLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`w-full py-2.5 rounded-[8px] text-white ${config.btnBg} font-semibold text-xs shadow-xs transition`}
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
