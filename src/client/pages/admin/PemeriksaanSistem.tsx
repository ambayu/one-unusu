import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import {
  fetchSystemCheck,
  SystemCheckItem,
  SystemCheckResult,
  SystemCheckStatus,
} from '../../services/api';

/**
 * Halaman diagnostik panel: menampilkan hasil pemeriksaan kesiapan data dan
 * konfigurasi SSO (koneksi database, paritas katalog izin, registry aplikasi,
 * kunci akses, akun, dan slider) dalam satu tampilan baca-saja.
 *
 * Halaman ini sengaja tidak menyediakan tombol perbaikan otomatis: setiap
 * temuan hanya memberi petunjuk tindakan agar operator tetap memutuskan
 * sendiri langkah perubahan data.
 */

const STATUS_META: Record<
  SystemCheckStatus,
  { label: string; badge: string; icon: React.ElementType; dot: string }
> = {
  ok: {
    label: 'Sesuai',
    badge: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
    icon: CheckCircleIcon,
    dot: 'bg-[#166534]',
  },
  warn: {
    label: 'Perlu Perhatian',
    badge: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    icon: ExclamationTriangleIcon,
    dot: 'bg-[#B45309]',
  },
  fail: {
    label: 'Bermasalah',
    badge: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    icon: XCircleIcon,
    dot: 'bg-[#B91C1C]',
  },
};

const GROUP_ORDER = ['Infrastruktur', 'Hak Akses', 'Aplikasi', 'Data'];

const formatWaktu = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PemeriksaanSistem: React.FC = () => {
  const { currentUser, loading: userLoading, reload: reloadUser } = useAdminData();

  const [result, setResult] = useState<SystemCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCheck = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await fetchSystemCheck();
      if (response.data.status) {
        setResult(response.data.data);
      } else {
        setErrorMessage('Server tidak mengembalikan hasil pemeriksaan.');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Gagal menjalankan pemeriksaan sistem. Periksa koneksi ke server SSO.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCheck();
  }, [loadCheck]);

  const groupedChecks = useMemo(() => {
    if (!result) return [] as { group: string; items: SystemCheckItem[] }[];
    const map = new Map<string, SystemCheckItem[]>();
    for (const check of result.checks) {
      const bucket = map.get(check.group) ?? [];
      bucket.push(check);
      map.set(check.group, bucket);
    }
    return [...map.entries()]
      .sort((a, b) => {
        const ai = GROUP_ORDER.indexOf(a[0]);
        const bi = GROUP_ORDER.indexOf(b[0]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([group, items]) => ({ group, items }));
  }, [result]);

  const summary = result?.summary;
  const overall = result?.overall ?? 'ok';
  const overallMeta = STATUS_META[overall];

  const statCards = [
    {
      label: 'Total Pemeriksaan',
      value: summary?.total ?? 0,
      accent: 'text-[#1E293B]',
      ring: 'border-[#D8E5DC]',
      hint: 'Butir yang diperiksa',
    },
    {
      label: 'Sesuai',
      value: summary?.ok ?? 0,
      accent: 'text-[#166534]',
      ring: 'border-[#BBF7D0]',
      hint: 'Tidak butuh tindakan',
    },
    {
      label: 'Perlu Perhatian',
      value: summary?.warn ?? 0,
      accent: 'text-[#B45309]',
      ring: 'border-[#FDE68A]',
      hint: 'Sebaiknya ditindaklanjuti',
    },
    {
      label: 'Bermasalah',
      value: summary?.fail ?? 0,
      accent: 'text-[#B91C1C]',
      ring: 'border-[#FECACA]',
      hint: 'Menghambat fungsi SSO',
    },
  ];

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Pemeriksaan Sistem"
      description="Diagnostik kesiapan data, izin, registry aplikasi, dan konfigurasi panel SSO ONE UNUSU."
      onRefresh={async () => {
        await Promise.all([loadCheck(), reloadUser()]);
      }}
      refreshing={isLoading || userLoading}
    >
      {/* 1. Ringkasan status keseluruhan */}
      <div
        className={`rounded-[14px] border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${overallMeta.badge}`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <overallMeta.icon className="w-6 h-6 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold">
              Status keseluruhan: {overallMeta.label}
            </p>
            <p className="text-xs mt-0.5 opacity-90">
              {isLoading
                ? 'Menjalankan pemeriksaan…'
                : result
                  ? `Terakhir diperiksa ${formatWaktu(result.checkedAt)}.`
                  : 'Belum ada hasil pemeriksaan.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadCheck()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-current/30 bg-white/70 text-xs font-semibold hover:bg-white transition disabled:opacity-50 min-h-[40px]"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Memeriksa…' : 'Periksa Ulang'}</span>
        </button>
      </div>

      {/* 2. Kartu statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white p-4 rounded-[14px] border ${card.ring} shadow-xs`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              {card.label}
            </p>
            <p className={`mt-1 text-2xl font-extrabold leading-none ${card.accent}`}>
              {card.value}
            </p>
            <p className="mt-1.5 text-[11px] text-[#94A3B8]">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* 3. Pesan galat */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-3.5 flex items-start gap-2.5"
        >
          <XCircleIcon className="w-5 h-5 text-[#B91C1C] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#B91C1C]">Pemeriksaan gagal</p>
            <p className="text-xs text-[#7F1D1D] mt-0.5 break-words">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 4. Daftar butir pemeriksaan per kelompok */}
      {isLoading && !result ? (
        <div className="rounded-[12px] border border-[#E8EFEA] bg-[#F9FBFA] p-8 text-center">
          <ArrowPathIcon className="w-6 h-6 mx-auto text-[#166534] animate-spin" />
          <p className="mt-2 text-xs font-semibold text-[#475569]">
            Menjalankan pemeriksaan sistem…
          </p>
        </div>
      ) : groupedChecks.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[#D8E5DC] bg-[#F9FBFA] p-8 text-center">
          <ServerStackIcon className="w-7 h-7 mx-auto text-[#94A3B8]" />
          <p className="mt-2 text-sm font-bold text-[#475569]">Belum ada hasil pemeriksaan</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Tekan “Periksa Ulang” untuk menjalankan diagnostik kesiapan data.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedChecks.map(({ group, items }) => (
            <section key={group} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#166534]" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#166534]">
                  {group}
                </h2>
                <span className="text-[11px] text-[#94A3B8]">({items.length} butir)</span>
              </div>

              <ul className="divide-y divide-[#EEF4F0] rounded-[12px] border border-[#E8EFEA] overflow-hidden bg-white">
                {items.map((item) => {
                  const meta = STATUS_META[item.status];
                  return (
                    <li key={item.id} className="p-3.5 sm:p-4 flex items-start gap-3">
                      <meta.icon
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          item.status === 'ok'
                            ? 'text-[#166534]'
                            : item.status === 'warn'
                              ? 'text-[#B45309]'
                              : 'text-[#B91C1C]'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13.5px] font-bold text-[#1E293B]">{item.label}</p>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#475569] break-words">{item.detail}</p>
                        {item.hint && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-[#64748B]">
                            <LightBulbIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#B45309]" />
                            <span className="break-words">{item.hint}</span>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[#94A3B8]">
        Pemeriksaan bersifat baca-saja dan tidak mengubah data. Tindakan perbaikan tetap
        dilakukan lewat menu terkait (Izin, Registrasi SSO, Kunci Aplikasi, atau seeder).
      </p>
    </AdminPanelTemplate>
  );
};
