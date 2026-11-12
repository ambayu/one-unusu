import React, { useState, useEffect } from 'react';
import {
  fetchSsoHistory,
  SsoHistoryItem,
} from '../services/api';
import {
  ClockIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export const RiwayatSsoPage: React.FC = () => {
  const [history, setHistory] = useState<SsoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchSsoHistory();
      if (res.data.status) {
        setHistory(res.data.data);
      }
    } catch (err: any) {
      console.error('Gagal memuat riwayat SSO:', err);
      setError('Gagal memuat riwayat otentikasi SSO dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const formatDateTime = (isoDate: string | null) => {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return isoDate;
    }
  };

  const getStatusBadge = (item: SsoHistoryItem) => {
    const isExpired = new Date() > new Date(item.expiresAt);

    if (item.isUsed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#166534]">
          <CheckCircleIcon className="w-3.5 h-3.5" />
          <span>Berhasil Masuk</span>
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#B91C1C]">
          <XCircleIcon className="w-3.5 h-3.5" />
          <span>Tiket Kedaluwarsa</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309]">
        <ClockIcon className="w-3.5 h-3.5 animate-pulse" />
        <span>Menunggu Penukaran</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white rounded-[20px] border border-[#D8E5DC] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#166534]">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Riwayat Masuk SSO</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Catatan riwayat otentikasi dan peluncuran tiket Single Sign-On (SSO v2) dari akun Anda ke aplikasi cabang.
            </p>
          </div>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D8E5DC] text-xs font-semibold text-[#166534] hover:bg-[#F0FDF4] transition self-start md:self-auto disabled:opacity-60"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang Riwayat</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-[#FECACA] bg-[#FEE2E2] px-4 py-3 text-xs font-medium text-[#B91C1C]">
          <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabel Riwayat */}
      <div className="bg-white rounded-[20px] border border-[#D8E5DC] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E293B]">
            <ShieldCheckIcon className="w-4 h-4 text-[#166534]" />
            <span>Audit Trail Peluncuran Aplikasi Terakhir</span>
          </div>
          <span className="text-[11px] font-semibold text-[#64748B]">
            Maks. 50 Aktivitas Terakhir
          </span>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64748B]">
            <ClockIcon className="w-10 h-10 mx-auto text-[#94A3B8] mb-2" />
            <p className="font-semibold text-stone-700">Belum ada riwayat masuk SSO</p>
            <p className="text-stone-500 mt-0.5">
              Riwayat akan otomatis tercatat setiap kali Anda membuka aplikasi SSO.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-[#475569] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-5">Aplikasi Tujuan</th>
                  <th className="py-3.5 px-4">Waktu Diterbitkan</th>
                  <th className="py-3.5 px-4">Waktu Digunakan</th>
                  <th className="py-3.5 px-4">Alamat IP</th>
                  <th className="py-3.5 px-5 text-right">Status Penukaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase">
                          {item.badge?.slice(0, 3) || 'SSO'}
                        </div>
                        <div>
                          <p className="font-bold text-[#1E293B]">{item.nameApp}</p>
                          <p className="text-[11px] text-[#64748B] font-mono">{item.clientId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[#334155] whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="py-4 px-4 text-[#334155] whitespace-nowrap">
                      {formatDateTime(item.usedAt)}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-[#64748B]">
                      {item.requestIp || 'Lokal/Proxy'}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      {getStatusBadge(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
