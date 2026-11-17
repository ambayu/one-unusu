import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ClipboardIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { DataTable } from '../../components/DataTable';
import { useAdminData } from '../../hooks/useAdminData';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';
import {
  ApiEndpointItem,
  ApiHubAppItem,
  ApiKeyItem,
  ApiUsageLogItem,
  ApiEndpointKiriman,
  createApiEndpoint,
  createApiKey,
  deleteApiEndpoint,
  fetchApiEndpoints,
  fetchApiHubApps,
  fetchApiKeys,
  fetchApiUsageLogs,
  revokeApiKey,
  updateApiEndpoint,
  updateApiKey,
} from '../../services/api';

/**
 * Integrasi & API Hub.
 *
 * Sebelumnya ketiga tab halaman ini menampilkan data contoh yang ditulis
 * langsung di dalam komponen: endpoint, API key, dan riwayat pemakaian semuanya
 * palsu, dan semua tombol tidak melakukan apa pun. Sekarang seluruh isinya
 * dibaca dari tabel `api_endpoints`, `api_keys`, dan `api_usage_logs` lewat
 * endpoint `/api/admin/api-hub/*`, dan tombol simpannya benar-benar menulis.
 *
 * Dua hal yang sengaja dibedakan dari CRUD biasa:
 *   1. Nilai API key hanya dikirim utuh sekali saat dibuat. Daftar hanya
 *      menampilkan potongan dari server, jadi tombol "salin" pada baris lama
 *      menyalin potongan itu — bukan rahasianya. Nilai utuh ditampilkan di
 *      panel khusus tepat setelah pembuatan.
 *   2. Mencabut key tidak menghapus baris. `revoked` diisi supaya riwayat
 *      pemakaian tetap bisa ditelusuri. Karena itu tombolnya berlabel "Cabut",
 *      bukan "Hapus".
 */

type TabId = 'endpoints' | 'keys' | 'logs';

const PARAMETER_ENDPOINT: Record<string, readonly string[]> = {
  'POST /api/v2/website/users': [
    'ids', 'search', 'role', 'fakultas', 'prodi', 'limit',
  ],
  'GET /api/v2/website/organisasi': [],
  'POST /api/v1/public/organisasi': [],
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'endpoints', label: 'Katalog Endpoint' },
  { id: 'keys', label: 'Manajemen API Key' },
  { id: 'logs', label: 'Riwayat Penggunaan' },
];

const METODE = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Warna label metode HTTP, konsisten di ketiga tabel. */
const kelasMetode = (metode: string) => {
  switch (metode.toUpperCase()) {
    case 'GET':
      return 'bg-[#DBEAFE] text-[#0369A1]';
    case 'POST':
      return 'bg-[#DCFCE7] text-[#15803D]';
    case 'PUT':
    case 'PATCH':
      return 'bg-[#FEF08A] text-[#854D0E]';
    default:
      return 'bg-[#FED7AA] text-[#92400E]';
  }
};

/** Kelas input seragam untuk semua isian pada halaman ini. */
const KELAS_INPUT =
  'w-full px-4 py-3 text-sm bg-white border border-[#D8E5DC] rounded-[8px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]';

const KELAS_LABEL = 'block text-xs font-bold text-[#1E293B] mb-1.5';

/** Format waktu ringkas: tanggal pendek + jam. */
const formatWaktu = (nilai: string | null) => {
  if (!nilai) return '—';
  const tanggal = new Date(nilai);
  if (Number.isNaN(tanggal.getTime())) return '—';
  return tanggal.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Pesan galat dari axios, dengan cadangan bila bentuknya tak terduga. */
const pesanGalat = (err: unknown, bawaan: string) => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || bawaan;
};

export const ApiHub: React.FC = () => {
  const { currentUser: user, loading: userLoading } = useAdminData();
  const [activeTab, setActiveTab] = useState<TabId>('endpoints');

  const canView = hasPermission(user, PERMISSIONS.apiHubView);
  const canEdit = hasPermission(user, PERMISSIONS.apiHubEdit);
  const canDelete = hasPermission(user, PERMISSIONS.apiHubDelete);

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title?: string;
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  const [konfirmasi, setKonfirmasi] = useState<{
    isOpen: boolean;
    judul: string;
    pesan: string;
    label: string;
    jalankan: () => Promise<void>;
  }>({ isOpen: false, judul: '', pesan: '', label: 'Lanjutkan', jalankan: async () => {} });
  const [memproses, setMemproses] = useState(false);

  // ---------- keadaan data ----------
  const [endpoints, setEndpoints] = useState<ApiEndpointItem[]>([]);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [logs, setLogs] = useState<ApiUsageLogItem[]>([]);
  const [apps, setApps] = useState<ApiHubAppItem[]>([]);
  const [memuat, setMemuat] = useState<Record<TabId, boolean>>({
    endpoints: false,
    keys: false,
    logs: false,
  });
  const [galatMuat, setGalatMuat] = useState<Record<TabId, string | null>>({
    endpoints: null,
    keys: null,
    logs: null,
  });

  const [searchEndpoint, setSearchEndpoint] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [searchLog, setSearchLog] = useState('');

  /*
   * Filter katalog endpoint.
   *
   * Kotak pencarian saja tidak cukup ketika katalog berisi puluhan endpoint:
   * admin biasanya ingin melihat "semua yang POST" atau "semua milik
   * PRODI_UNUSU". Nilai kosong berarti filter itu tidak dipakai.
   */
  const [filterMetode, setFilterMetode] = useState('');
  const [filterPenyedia, setFilterPenyedia] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterAkses, setFilterAkses] = useState('');

  // ---------- modal endpoint ----------
  const [modalEndpoint, setModalEndpoint] = useState(false);
  const [suntingEndpoint, setSuntingEndpoint] = useState<ApiEndpointItem | null>(null);
  const [formEndpoint, setFormEndpoint] = useState<ApiEndpointKiriman>({
    name: '',
    endpoint: '',
    method: 'GET',
    sourceApp: '',
    category: 'data',
    description: '',
    isActive: true,
    isPublic: false,
  });

  // ---------- modal key ----------
  const [modalKey, setModalKey] = useState(false);
  const [suntingKey, setSuntingKey] = useState<ApiKeyItem | null>(null);
  const [formKey, setFormKey] = useState<{
    name: string;
    appId: string;
    description: string;
    allowedEndpoints: number[];
    semuaEndpoint: boolean;
  }>({ name: '', appId: '', description: '', allowedEndpoints: [], semuaEndpoint: true });

  /** Nilai key utuh hasil pembuatan — hanya ada di memori, tidak disimpan. */
  const [keyBaru, setKeyBaru] = useState<string | null>(null);

  const [terbukaKeyId, setTerbukaKeyId] = useState<number | null>(null);
  const [tersalinId, setTersalinId] = useState<number | null>(null);

  // ---------- pemuatan data ----------

  const muatEndpoints = useCallback(async () => {
    setMemuat((s) => ({ ...s, endpoints: true }));
    setGalatMuat((s) => ({ ...s, endpoints: null }));
    try {
      const res = await fetchApiEndpoints();
      setEndpoints(res.data.data ?? []);
    } catch (err) {
      setGalatMuat((s) => ({ ...s, endpoints: pesanGalat(err, 'Gagal memuat katalog endpoint.') }));
    } finally {
      setMemuat((s) => ({ ...s, endpoints: false }));
    }
  }, []);

  const muatKeys = useCallback(async () => {
    setMemuat((s) => ({ ...s, keys: true }));
    setGalatMuat((s) => ({ ...s, keys: null }));
    try {
      const res = await fetchApiKeys();
      setKeys(res.data.data ?? []);
    } catch (err) {
      setGalatMuat((s) => ({ ...s, keys: pesanGalat(err, 'Gagal memuat daftar API key.') }));
    } finally {
      setMemuat((s) => ({ ...s, keys: false }));
    }
  }, []);

  const muatLogs = useCallback(async () => {
    setMemuat((s) => ({ ...s, logs: true }));
    setGalatMuat((s) => ({ ...s, logs: null }));
    try {
      const res = await fetchApiUsageLogs({ take: 200 });
      setLogs(res.data.data ?? []);
    } catch (err) {
      setGalatMuat((s) => ({ ...s, logs: pesanGalat(err, 'Gagal memuat riwayat penggunaan.') }));
    } finally {
      setMemuat((s) => ({ ...s, logs: false }));
    }
  }, []);

  /** Aplikasi hanya perlu dimuat sekali; dipakai dropdown pemilik key. */
  useEffect(() => {
    if (!canView) return;
    fetchApiHubApps()
      .then((res) => setApps(res.data.data ?? []))
      .catch(() => setApps([]));
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    if (activeTab === 'endpoints') void muatEndpoints();
    if (activeTab === 'keys') void muatKeys();
    if (activeTab === 'logs') void muatLogs();
  }, [activeTab, canView, muatEndpoints, muatKeys, muatLogs]);

  const tutupNotifikasi = () => setNotification((n) => ({ ...n, isOpen: false }));

  // ---------- penyaringan ----------

  const endpointTersaring = useMemo(() => {
    const cari = searchEndpoint.trim().toLowerCase();

    return endpoints.filter((ep) => {
      if (cari) {
        const cocokTeks =
          ep.name.toLowerCase().includes(cari) ||
          ep.endpoint.toLowerCase().includes(cari) ||
          ep.sourceApp.toLowerCase().includes(cari) ||
          (ep.description ?? '').toLowerCase().includes(cari);
        if (!cocokTeks) return false;
      }

      if (filterMetode && ep.method.toUpperCase() !== filterMetode) return false;
      if (filterPenyedia && ep.sourceApp !== filterPenyedia) return false;
      if (filterKategori && (ep.category || '') !== filterKategori) return false;

      // Satu pilihan menggabungkan dua kolom: publik/privat dan aktif/nonaktif.
      if (filterAkses === 'publik' && !ep.isPublic) return false;
      if (filterAkses === 'private' && ep.isPublic) return false;
      if (filterAkses === 'aktif' && !ep.isActive) return false;
      if (filterAkses === 'nonaktif' && ep.isActive) return false;

      return true;
    });
  }, [endpoints, searchEndpoint, filterMetode, filterPenyedia, filterKategori, filterAkses]);

  /** Pilihan filter diturunkan dari data yang benar-benar ada, bukan daftar tetap. */
  const opsiMetode = useMemo(() => {
    return Array.from(new Set(endpoints.map((ep) => ep.method.toUpperCase()))).sort();
  }, [endpoints]);

  const opsiPenyedia = useMemo(() => {
    return Array.from(new Set(endpoints.map((ep) => ep.sourceApp).filter(Boolean))).sort();
  }, [endpoints]);

  const opsiKategori = useMemo(() => {
    return Array.from(
      new Set(endpoints.map((ep) => ep.category || '').filter((k) => k.length > 0))
    ).sort();
  }, [endpoints]);

  /** true bila ada filter yang sedang menyala — dipakai tombol Reset. */
  const adaFilterEndpoint =
    searchEndpoint.trim() !== '' ||
    filterMetode !== '' ||
    filterPenyedia !== '' ||
    filterKategori !== '' ||
    filterAkses !== '';

  const resetFilterEndpoint = () => {
    setSearchEndpoint('');
    setFilterMetode('');
    setFilterPenyedia('');
    setFilterKategori('');
    setFilterAkses('');
  };

  const keyTersaring = useMemo(() => {
    const cari = searchKey.trim().toLowerCase();
    if (!cari) return keys;
    return keys.filter(
      (k) =>
        k.name.toLowerCase().includes(cari) ||
        k.appName.toLowerCase().includes(cari) ||
        (k.description ?? '').toLowerCase().includes(cari)
    );
  }, [keys, searchKey]);

  const logTersaring = useMemo(() => {
    const cari = searchLog.trim().toLowerCase();
    if (!cari) return logs;
    return logs.filter(
      (log) =>
        log.appName.toLowerCase().includes(cari) ||
        log.endpoint.toLowerCase().includes(cari) ||
        log.keyName.toLowerCase().includes(cari) ||
        String(log.statusCode).includes(cari)
    );
  }, [logs, searchLog]);

  // ---------- aksi endpoint ----------

  const bukaModalEndpoint = (ep: ApiEndpointItem | null) => {
    setSuntingEndpoint(ep);
    setFormEndpoint(
      ep
        ? {
            name: ep.name,
            endpoint: ep.endpoint,
            method: ep.method,
            sourceApp: ep.sourceApp,
            category: ep.category,
            description: ep.description ?? '',
            isActive: ep.isActive,
            isPublic: ep.isPublic,
          }
        : {
            name: '',
            endpoint: '',
            method: 'GET',
            sourceApp: '',
            category: 'data',
            description: '',
            isActive: true,
            isPublic: false,
          }
    );
    setModalEndpoint(true);
  };

  const simpanEndpoint = async (event: React.FormEvent) => {
    event.preventDefault();
    setMemproses(true);
    try {
      const kiriman: ApiEndpointKiriman = {
        ...formEndpoint,
        description: formEndpoint.description?.trim() || null,
      };

      if (suntingEndpoint) {
        const res = await updateApiEndpoint(suntingEndpoint.id, kiriman);
        setNotification({ isOpen: true, type: 'success', message: res.data.message });
      } else {
        const res = await createApiEndpoint(kiriman);
        setNotification({ isOpen: true, type: 'success', message: res.data.message });
      }

      setModalEndpoint(false);
      await muatEndpoints();
    } catch (err) {
      setNotification({ isOpen: true, type: 'error', message: pesanGalat(err, 'Gagal menyimpan endpoint.') });
    } finally {
      setMemproses(false);
    }
  };

  const hapusEndpoint = (ep: ApiEndpointItem) => {
    setKonfirmasi({
      isOpen: true,
      judul: 'Hapus Endpoint',
      pesan: `Endpoint "${ep.name}" (${ep.method} ${ep.endpoint}) akan dihapus dari katalog. Tindakan ini tidak dapat dibatalkan.`,
      label: 'Hapus Endpoint',
      jalankan: async () => {
        const res = await deleteApiEndpoint(ep.id);
        setNotification({ isOpen: true, type: 'success', message: res.data.message });
        await muatEndpoints();
      },
    });
  };

  // ---------- aksi key ----------

  const bukaModalKey = (k: ApiKeyItem | null) => {
    setSuntingKey(k);
    setFormKey(
      k
        ? {
            name: k.name,
            appId: String(k.appId),
            description: k.description ?? '',
            allowedEndpoints: k.allowedEndpoints ?? [],
            semuaEndpoint: k.allowedEndpoints === null,
          }
        : { name: '', appId: '', description: '', allowedEndpoints: [], semuaEndpoint: true }
    );
    setModalKey(true);
  };

  const simpanKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setMemproses(true);
    try {
      const izin = formKey.semuaEndpoint ? null : formKey.allowedEndpoints;

      if (suntingKey) {
        const res = await updateApiKey(suntingKey.id, {
          name: formKey.name,
          description: formKey.description.trim() || null,
          allowedEndpoints: izin,
        });
        setNotification({ isOpen: true, type: 'success', message: res.data.message });
      } else {
        const res = await createApiKey({
          name: formKey.name,
          appId: Number(formKey.appId),
          description: formKey.description.trim() || null,
          allowedEndpoints: izin,
        });
        // Nilai utuh hanya ada di respons ini.
        setKeyBaru(res.data.data.key);
        setNotification({ isOpen: true, type: 'success', message: res.data.message });
      }

      setModalKey(false);
      await muatKeys();
    } catch (err) {
      setNotification({ isOpen: true, type: 'error', message: pesanGalat(err, 'Gagal menyimpan API key.') });
    } finally {
      setMemproses(false);
    }
  };

  const cabutKey = (k: ApiKeyItem) => {
    setKonfirmasi({
      isOpen: true,
      judul: 'Cabut API Key',
      pesan: `Key "${k.name}" milik ${k.appName} akan dicabut. Aplikasi tersebut langsung kehilangan akses, tetapi riwayat pemakaiannya tetap tersimpan.`,
      label: 'Cabut Key',
      jalankan: async () => {
        const res = await revokeApiKey(k.id);
        setNotification({ isOpen: true, type: 'success', message: res.data.message });
        await muatKeys();
      },
    });
  };

  const salin = async (nilai: string, id: number | null) => {
    try {
      await navigator.clipboard.writeText(nilai);
      if (id !== null) {
        setTersalinId(id);
        window.setTimeout(() => setTersalinId(null), 2000);
      }
      setNotification({ isOpen: true, type: 'success', message: 'Berhasil disalin ke clipboard.' });
    } catch {
      setNotification({ isOpen: true, type: 'error', message: 'Peramban menolak akses clipboard.' });
    }
  };

  // ---------- gerbang izin & skeleton ----------

  if (userLoading) {
    return (
      <AdminPanelTemplate
        user={user}
        title="Integrasi & API Hub"
        description="Katalog endpoint, kunci akses, dan riwayat pemakaian API antar aplikasi ONE UNUSU."
      >
        <div className="space-y-6" aria-busy="true" aria-label="Memuat modul API Hub">
          {/* Skeleton Tab Navigasi */}
          <div className="flex gap-4 border-b border-[#D8E5DC] pb-3">
            <div className="h-5 w-32 bg-[#E2E8F0] rounded-md animate-pulse" />
            <div className="h-5 w-28 bg-[#E2E8F0] rounded-md animate-pulse" />
            <div className="h-5 w-36 bg-[#E2E8F0] rounded-md animate-pulse" />
          </div>

          {/* Skeleton Filter Toolbar */}
          <div className="p-4 bg-white border border-[#D8E5DC] rounded-[14px] flex flex-col sm:flex-row gap-3">
            <div className="h-10 flex-1 bg-[#F1F5F2] rounded-[8px] animate-pulse" />
            <div className="h-10 w-32 bg-[#F1F5F2] rounded-[8px] animate-pulse" />
            <div className="h-10 w-32 bg-[#F1F5F2] rounded-[8px] animate-pulse" />
          </div>

          {/* Skeleton List Items */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-white border border-[#D8E5DC] rounded-[12px] p-4 flex items-center justify-between animate-pulse"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-[#E2E8F0] rounded" />
                  <div className="h-3 w-72 bg-[#F1F5F2] rounded" />
                </div>
                <div className="h-8 w-24 bg-[#E2E8F0] rounded-[8px]" />
              </div>
            ))}
          </div>
        </div>
      </AdminPanelTemplate>
    );
  }

  if (!canView) {
    return (
      <AdminPanelTemplate
        user={user}
        title="Akses Ditolak"
        description="Modul Integrasi & API Hub hanya terbuka bagi pengguna dengan izin api_hub:view."
      >
        <div className="p-6 text-center text-[#64748B]">
          Anda tidak memiliki izin untuk mengakses modul ini.
        </div>
      </AdminPanelTemplate>
    );
  }

  /** Blok galat pemuatan, dipakai ketiga tab. */
  const blokGalat = (pesan: string | null, ulangi: () => void) =>
    pesan ? (
      <div className="flex items-start gap-3 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px]">
        <ExclamationCircleIcon className="w-5 h-5 text-[#B91C1C] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#B91C1C]">{pesan}</p>
        </div>
        <button
          type="button"
          onClick={ulangi}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white text-[#B91C1C] border border-[#FECACA] rounded-[8px] hover:bg-[#FEE2E2] transition"
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          Coba Lagi
        </button>
      </div>
    ) : null;

  const labelMuat = (tab: TabId, jumlah: number) =>
    memuat[tab] ? 'Memuat data...' : `${jumlah} baris`;

  return (
    <AdminPanelTemplate
      user={user}
      title="Integrasi & API Hub"
      description="Katalog endpoint, kunci akses, dan riwayat pemakaian API antar aplikasi ONE UNUSU."
    >
      <div className="space-y-6">
        {/* Navigasi tab */}
        <div className="flex gap-2 border-b border-[#D8E5DC] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-[#166534] border-[#166534]'
                  : 'text-[#64748B] border-transparent hover:text-[#1E293B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel nilai key baru — satu-satunya tempat nilai utuh terlihat */}
        {keyBaru && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[12px] p-4 space-y-2">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-[#B45309] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-[#92400E]">
                  Salin sekarang — nilai ini tidak akan ditampilkan lagi
                </p>
                <p className="text-[11px] text-[#B45309] mt-0.5">
                  Server hanya menyimpan potongan key untuk ditampilkan di daftar. Bila nilai ini
                  hilang, buat key baru.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKeyBaru(null)}
                aria-label="Tutup panel nilai key"
                className="p-1 rounded text-[#B45309] hover:bg-[#FEF3C7]"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white border border-[#FDE68A] rounded-[8px] px-3 py-2">
              <code className="flex-1 font-mono text-xs text-[#1E293B] break-all select-all">{keyBaru}</code>
              <button
                type="button"
                onClick={() => void salin(keyBaru, null)}
                className="p-1.5 rounded-[6px] text-[#0369A1] hover:bg-[#E0F2FE] transition flex-shrink-0"
                title="Salin nilai key"
                aria-label="Salin nilai key"
              >
                <ClipboardIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============ TAB: KATALOG ENDPOINT ============ */}
        {activeTab === 'endpoints' && (
          <div className="space-y-4">
            {blokGalat(galatMuat.endpoints, () => void muatEndpoints())}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Cari nama, endpoint, atau penyedia..."
                  value={searchEndpoint}
                  onChange={(e) => setSearchEndpoint(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#64748B]">{labelMuat('endpoints', endpointTersaring.length)}</span>
                <button
                  type="button"
                  onClick={() => void muatEndpoints()}
                  disabled={memuat.endpoints}
                  title="Muat ulang"
                  aria-label="Muat ulang katalog endpoint"
                  className="p-2 rounded-[8px] bg-white border border-[#D8E5DC] text-[#166534] hover:bg-[#F0FDF4] disabled:opacity-40 transition"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${memuat.endpoints ? 'animate-spin' : ''}`} />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => bukaModalEndpoint(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#166534] hover:bg-[#14532D] text-white rounded-[8px] font-semibold text-xs transition"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Endpoint Baru
                  </button>
                )}
              </div>
            </div>

            {/* ---------- Baris filter katalog ---------- */}
            <div className="flex flex-wrap items-end gap-2.5 px-3.5 py-3 bg-[#F8FBF9] border border-[#D8E5DC] rounded-[10px]">
              <div className="w-[140px]">
                <label htmlFor="filter-ep-metode" className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Metode
                </label>
                <select
                  id="filter-ep-metode"
                  value={filterMetode}
                  onChange={(e) => setFilterMetode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                >
                  <option value="">Semua</option>
                  {opsiMetode.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-[180px]">
                <label htmlFor="filter-ep-penyedia" className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Penyedia
                </label>
                <select
                  id="filter-ep-penyedia"
                  value={filterPenyedia}
                  onChange={(e) => setFilterPenyedia(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                >
                  <option value="">Semua</option>
                  {opsiPenyedia.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-[150px]">
                <label htmlFor="filter-ep-kategori" className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Kategori
                </label>
                <select
                  id="filter-ep-kategori"
                  value={filterKategori}
                  onChange={(e) => setFilterKategori(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                >
                  <option value="">Semua</option>
                  {opsiKategori.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-[170px]">
                <label htmlFor="filter-ep-akses" className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Akses
                </label>
                <select
                  id="filter-ep-akses"
                  value={filterAkses}
                  onChange={(e) => setFilterAkses(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                >
                  <option value="">Semua</option>
                  <option value="publik">Publik</option>
                  <option value="private">Private</option>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>

              {adaFilterEndpoint && (
                <button
                  type="button"
                  onClick={resetFilterEndpoint}
                  className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-[#166534] bg-white hover:bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] transition"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                  Reset Filter
                </button>
              )}
            </div>

            <DataTable<ApiEndpointItem>
              data={endpointTersaring}
              kunciBaris={(ep) => ep.id}
              berpaginasi
              lebarMinimal="1040px"
              labelRingkasan={(dari, sampai, total) => `Menampilkan ${dari}-${sampai} dari ${total} endpoint`}
              kosong={
                <div className="text-center">
                  <p className="text-xs font-semibold text-[#475569]">
                    {endpoints.length === 0
                      ? 'Katalog endpoint masih kosong.'
                      : 'Tidak ada endpoint yang cocok dengan pencarian.'}
                  </p>
                  {searchEndpoint.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchEndpoint('')}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-[#166534] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] transition"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                      Reset Pencarian
                    </button>
                  )}
                </div>
              }
              kolom={[
                {
                  key: 'nama',
                  judul: 'Nama & Endpoint',
                  sel: (ep) => (
                    <div className="min-w-[260px]">
                      <p className="font-semibold text-xs text-[#1E293B]">{ep.name}</p>
                      <p className="text-xs text-[#166534] font-mono font-bold mt-0.5 break-all">{ep.endpoint}</p>
                      {ep.description && (
                        <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">{ep.method === 'POST' && ep.endpoint === '/api/v2/website/users'
                          ? 'Direktori pengguna: penelusuran dengan filter opsional atau pengambilan berdasarkan daftar ID.'
                          : ep.description}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'parameter',
                  judul: 'Parameter / Filter',
                  sel: (ep) => {
                    const parameter = PARAMETER_ENDPOINT[`${ep.method.toUpperCase()} ${ep.endpoint}`];
                    return parameter?.length ? (
                      <ul className="list-none space-y-1 text-[11px] font-mono text-[#475569]">
                        {parameter.map((teks) => <li key={teks}>{teks}</li>)}
                      </ul>
                    ) : <p className="text-[11px] text-[#64748B]">—</p>;
                  },
                },
                {
                  key: 'method',
                  judul: 'Metode',
                  sel: (ep) => (
                    <span
                      className={`inline-block px-2 py-1 text-[11px] font-bold rounded-[6px] ${kelasMetode(ep.method)}`}
                    >
                      {ep.method}
                    </span>
                  ),
                },
                {
                  key: 'sumber',
                  judul: 'Penyedia',
                  kelas: 'text-[#475569]',
                  sel: (ep) => ep.sourceApp,
                },
                {
                  key: 'kategori',
                  judul: 'Kategori',
                  kelas: 'text-[#475569]',
                  sel: (ep) => ep.category || '—',
                },
                {
                  key: 'akses',
                  judul: 'Akses',
                  sel: (ep) => (
                    <div className="space-y-1">
                      <p className="text-xs text-[#475569]">{ep.isPublic ? 'Publik' : 'Private'}</p>
                      <p
                        className={`text-[11px] font-semibold ${ep.isActive ? 'text-[#166534]' : 'text-[#B91C1C]'}`}
                      >
                        {ep.isActive ? 'Aktif' : 'Nonaktif'}
                      </p>
                    </div>
                  ),
                },
                ...(canEdit
                  ? [
                      {
                        key: 'aksi',
                        judul: 'Aksi',
                        rataTengah: true,
                        sel: (ep: ApiEndpointItem) => (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => bukaModalEndpoint(ep)}
                              title="Ubah endpoint"
                              aria-label={`Ubah endpoint ${ep.name}`}
                              className="p-1.5 rounded-lg text-[#0369A1] bg-[#E0F2FE] hover:bg-[#BAE6FD] border border-[#BAE6FD] transition"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => hapusEndpoint(ep)}
                                title="Hapus endpoint"
                                aria-label={`Hapus endpoint ${ep.name}`}
                                className="p-1.5 rounded-lg text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] transition"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        )}

        {/* ============ TAB: MANAJEMEN API KEY ============ */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            {blokGalat(galatMuat.keys, () => void muatKeys())}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Cari nama key atau aplikasi..."
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#64748B]">{labelMuat('keys', keyTersaring.length)}</span>
                <button
                  type="button"
                  onClick={() => void muatKeys()}
                  disabled={memuat.keys}
                  title="Muat ulang"
                  aria-label="Muat ulang daftar key"
                  className="p-2 rounded-[8px] bg-white border border-[#D8E5DC] text-[#166534] hover:bg-[#F0FDF4] disabled:opacity-40 transition"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${memuat.keys ? 'animate-spin' : ''}`} />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => bukaModalKey(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#166534] hover:bg-[#14532D] text-white rounded-[8px] font-semibold text-xs transition"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Buat Key Baru
                  </button>
                )}
              </div>
            </div>

            <DataTable<ApiKeyItem>
              data={keyTersaring}
              kunciBaris={(k) => k.id}
              berpaginasi
              lebarMinimal="1040px"
              labelRingkasan={(dari, sampai, total) => `Menampilkan ${dari}-${sampai} dari ${total} key`}
              kosong={
                <div className="text-center">
                  <p className="text-xs font-semibold text-[#475569]">
                    {keys.length === 0 ? 'Belum ada API key yang dibuat.' : 'Tidak ada key yang cocok.'}
                  </p>
                  {canEdit && keys.length === 0 && (
                    <button
                      type="button"
                      onClick={() => bukaModalKey(null)}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-[#166534] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] transition"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      Buat Key Pertama
                    </button>
                  )}
                </div>
              }
              kolom={[
                {
                  key: 'nama',
                  judul: 'Nama & Aplikasi',
                  sel: (k) => (
                    <div className="min-w-[180px]">
                      <p className="font-semibold text-xs text-[#1E293B]">{k.name}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{k.appName}</p>
                      {k.description && (
                        <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">{k.description}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'key',
                  judul: 'API Key',
                  sel: (k) => (
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-[11px] px-2 py-1 bg-[#F1F5F9] rounded-[6px] text-[#1E293B]">
                        {terbukaKeyId === k.id ? k.key : k.key.slice(0, 16) + '...'}
                      </code>
                      <button
                        type="button"
                        onClick={() => setTerbukaKeyId(terbukaKeyId === k.id ? null : k.id)}
                        className="p-1 hover:bg-[#E0F2FE] rounded-[6px] text-[#0369A1] transition"
                        title={terbukaKeyId === k.id ? 'Sembunyikan' : 'Tampilkan'}
                        aria-label={terbukaKeyId === k.id ? 'Sembunyikan key' : 'Tampilkan key'}
                      >
                        {terbukaKeyId === k.id ? (
                          <EyeSlashIcon className="w-3.5 h-3.5" />
                        ) : (
                          <EyeIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void salin(k.key, k.id)}
                        className={`p-1 rounded-[6px] transition ${
                          tersalinId === k.id
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'hover:bg-[#E0F2FE] text-[#0369A1]'
                        }`}
                        title="Salin potongan key"
                        aria-label="Salin potongan key"
                      >
                        {tersalinId === k.id ? (
                          <CheckIcon className="w-3.5 h-3.5" />
                        ) : (
                          <ClipboardIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ),
                },
                {
                  key: 'izin',
                  judul: 'Izin Endpoint',
                  kelas: 'text-[#475569]',
                  sel: (k) =>
                    k.allowedEndpoints === null ? (
                      <span className="text-xs">Semua endpoint publik</span>
                    ) : (
                      <span className="text-xs">{k.allowedEndpoints.length} endpoint</span>
                    ),
                },
                {
                  key: 'status',
                  judul: 'Status & Pemakaian',
                  sel: (k) => (
                    <div className="min-w-[140px]">
                      <p
                        className={`text-xs font-semibold ${
                          k.revoked ? 'text-[#B91C1C]' : k.isActive ? 'text-[#166534]' : 'text-[#B45309]'
                        }`}
                      >
                        {k.revoked ? 'Dicabut' : k.isActive ? 'Aktif' : 'Nonaktif'}
                      </p>
                      <p className="text-[11px] text-[#475569] mt-0.5">
                        {k.usageCount.toLocaleString('id-ID')} panggilan
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">Terakhir: {formatWaktu(k.lastUsedAt)}</p>
                    </div>
                  ),
                },
                ...(canEdit
                  ? [
                      {
                        key: 'aksi',
                        judul: 'Aksi',
                        rataTengah: true,
                        sel: (k: ApiKeyItem) => (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => bukaModalKey(k)}
                              disabled={k.revoked}
                              title={k.revoked ? 'Key sudah dicabut' : 'Ubah key'}
                              aria-label={`Ubah key ${k.name}`}
                              className="p-1.5 rounded-lg text-[#0369A1] bg-[#E0F2FE] hover:bg-[#BAE6FD] border border-[#BAE6FD] disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => cabutKey(k)}
                                disabled={k.revoked}
                                title={k.revoked ? 'Sudah dicabut' : 'Cabut key'}
                                aria-label={`Cabut key ${k.name}`}
                                className="p-1.5 rounded-lg text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] disabled:opacity-40 disabled:cursor-not-allowed transition"
                              >
                                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        )}

        {/* ============ TAB: RIWAYAT PENGGUNAAN ============ */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {blokGalat(galatMuat.logs, () => void muatLogs())}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Cari aplikasi, endpoint, atau kode status..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#64748B]">{labelMuat('logs', logTersaring.length)}</span>
                <button
                  type="button"
                  onClick={() => void muatLogs()}
                  disabled={memuat.logs}
                  title="Muat ulang"
                  aria-label="Muat ulang riwayat penggunaan"
                  className="p-2 rounded-[8px] bg-white border border-[#D8E5DC] text-[#166534] hover:bg-[#F0FDF4] disabled:opacity-40 transition"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${memuat.logs ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <DataTable<ApiUsageLogItem>
              data={logTersaring}
              kunciBaris={(log) => log.id}
              berpaginasi
              lebarMinimal="960px"
              labelRingkasan={(dari, sampai, total) => `Menampilkan ${dari}-${sampai} dari ${total} catatan`}
              kosong={
                <div className="text-center">
                  <p className="text-xs font-semibold text-[#475569]">
                    {logs.length === 0
                      ? 'Belum ada pemanggilan API yang tercatat.'
                      : 'Tidak ada catatan yang cocok.'}
                  </p>
                  {logs.length === 0 && (
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                      Catatan muncul otomatis ketika aplikasi lain memanggil endpoint memakai API key.
                    </p>
                  )}
                </div>
              }
              kolom={[
                {
                  key: 'aplikasi',
                  judul: 'Aplikasi & Key',
                  sel: (log) => (
                    <div className="min-w-[160px]">
                      <p className="font-semibold text-xs text-[#1E293B]">{log.appName}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{log.keyName}</p>
                    </div>
                  ),
                },
                {
                  key: 'endpoint',
                  judul: 'Endpoint',
                  sel: (log) => (
                    <div className="min-w-[220px]">
                      <span
                        className={`inline-block text-[11px] font-bold rounded-[6px] px-2 py-0.5 mb-1 ${kelasMetode(log.method)}`}
                      >
                        {log.method}
                      </span>
                      <p className="text-[11px] text-[#1E293B] font-mono break-all">{log.endpoint}</p>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  judul: 'Status',
                  sel: (log) => (
                    <span
                      className={`inline-block px-2 py-1 rounded-[6px] text-[11px] font-bold ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : log.statusCode >= 400
                            ? 'bg-[#FEE2E2] text-[#B91C1C]'
                            : 'bg-[#FED7AA] text-[#92400E]'
                      }`}
                    >
                      {log.statusCode}
                    </span>
                  ),
                },
                {
                  key: 'waktu',
                  judul: 'Waktu & Durasi',
                  sel: (log) => (
                    <div className="min-w-[150px]">
                      <p className="text-[11px] text-[#475569]">{formatWaktu(log.createdAt)}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">{log.responseTime} ms</p>
                    </div>
                  ),
                },
                {
                  key: 'asal',
                  judul: 'Asal Permintaan',
                  kelas: 'text-[#475569]',
                  sel: (log) => (
                    <div className="min-w-[120px]">
                      <p className="text-[11px] font-mono">{log.requestIp || '—'}</p>
                      {log.errorMessage && (
                        <p className="text-[11px] text-[#B91C1C] mt-0.5 line-clamp-2">{log.errorMessage}</p>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* ============ MODAL ENDPOINT ============ */}
      {modalEndpoint && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-start justify-center p-4 overflow-y-auto">
          <form
            onSubmit={simpanEndpoint}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#D8E5DC] my-8"
          >
            <div className="flex justify-between items-start pb-3 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">
                  {suntingEndpoint ? 'Ubah Endpoint' : 'Endpoint Baru'}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Daftarkan endpoint integrasi yang disediakan aplikasi ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEndpoint(false)}
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
                aria-label="Tutup"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className={KELAS_LABEL} htmlFor="ep-nama">
                Nama Endpoint
              </label>
              <input
                id="ep-nama"
                type="text"
                required
                maxLength={150}
                value={formEndpoint.name}
                onChange={(e) => setFormEndpoint({ ...formEndpoint, name: e.target.value })}
                placeholder="Contoh: Data Induk Dosen & Homebase"
                className={KELAS_INPUT}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={KELAS_LABEL} htmlFor="ep-alamat">
                  Alamat Endpoint
                </label>
                <input
                  id="ep-alamat"
                  type="text"
                  required
                  maxLength={255}
                  value={formEndpoint.endpoint}
                  onChange={(e) => setFormEndpoint({ ...formEndpoint, endpoint: e.target.value })}
                  placeholder="/api/v1/inter-service/dosen"
                  className={`${KELAS_INPUT} font-mono`}
                />
              </div>
              <div>
                <label className={KELAS_LABEL} htmlFor="ep-metode">
                  Metode
                </label>
                <select
                  id="ep-metode"
                  value={formEndpoint.method}
                  onChange={(e) => setFormEndpoint({ ...formEndpoint, method: e.target.value })}
                  className={KELAS_INPUT}
                >
                  {METODE.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={KELAS_LABEL} htmlFor="ep-penyedia">
                  Penyedia
                </label>
                <input
                  id="ep-penyedia"
                  type="text"
                  required
                  maxLength={100}
                  value={formEndpoint.sourceApp}
                  onChange={(e) => setFormEndpoint({ ...formEndpoint, sourceApp: e.target.value })}
                  placeholder="ONE_UNUSU"
                  className={KELAS_INPUT}
                />
              </div>
              <div>
                <label className={KELAS_LABEL} htmlFor="ep-kategori">
                  Kategori
                </label>
                <input
                  id="ep-kategori"
                  type="text"
                  maxLength={50}
                  value={formEndpoint.category ?? ''}
                  onChange={(e) => setFormEndpoint({ ...formEndpoint, category: e.target.value })}
                  placeholder="data"
                  className={KELAS_INPUT}
                />
              </div>
            </div>

            <div>
              <label className={KELAS_LABEL} htmlFor="ep-deskripsi">
                Deskripsi
              </label>
              <textarea
                id="ep-deskripsi"
                rows={3}
                value={formEndpoint.description ?? ''}
                onChange={(e) => setFormEndpoint({ ...formEndpoint, description: e.target.value })}
                placeholder="Penjelasan singkat isi respons dan kegunaannya."
                className={`${KELAS_INPUT} resize-y`}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1E293B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEndpoint.isActive !== false}
                  onChange={(e) => setFormEndpoint({ ...formEndpoint, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-[#D8E5DC] text-[#166534] focus:ring-[#166534]"
                />
                Endpoint aktif
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1E293B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEndpoint.isPublic === true}
                  onChange={(e) => setFormEndpoint({ ...formEndpoint, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-[#D8E5DC] text-[#166534] focus:ring-[#166534]"
                />
                Dapat diakses semua aplikasi
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E8EFEA]">
              <button
                type="button"
                onClick={() => setModalEndpoint(false)}
                disabled={memproses}
                className="px-4 py-2.5 text-xs font-semibold text-[#475569] bg-white border border-[#D8E5DC] rounded-[8px] hover:bg-[#F1F5F2] disabled:opacity-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={memproses}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#166534] hover:bg-[#14532D] rounded-[8px] disabled:opacity-50 transition"
              >
                {memproses ? 'Menyimpan...' : suntingEndpoint ? 'Simpan Perubahan' : 'Tambah Endpoint'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ MODAL KEY ============ */}
      {modalKey && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-start justify-center p-4 overflow-y-auto">
          <form
            onSubmit={simpanKey}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#D8E5DC] my-8"
          >
            <div className="flex justify-between items-start pb-3 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">
                  {suntingKey ? 'Ubah API Key' : 'Buat API Key Baru'}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {suntingKey
                    ? 'Nilai key tidak berubah — hanya keterangan dan izin endpoint.'
                    : 'Nilai key dibuat oleh server dan hanya ditampilkan sekali.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalKey(false)}
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
                aria-label="Tutup"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className={KELAS_LABEL} htmlFor="key-nama">
                Nama Key
              </label>
              <input
                id="key-nama"
                type="text"
                required
                maxLength={150}
                value={formKey.name}
                onChange={(e) => setFormKey({ ...formKey, name: e.target.value })}
                placeholder="Contoh: LPPM Service Token"
                className={KELAS_INPUT}
              />
            </div>

            <div>
              <label className={KELAS_LABEL} htmlFor="key-app">
                Aplikasi Pemilik
              </label>
              <select
                id="key-app"
                required
                disabled={Boolean(suntingKey)}
                value={formKey.appId}
                onChange={(e) => setFormKey({ ...formKey, appId: e.target.value })}
                className={`${KELAS_INPUT} disabled:bg-[#F1F5F2] disabled:text-[#64748B]`}
              >
                <option value="">— Pilih aplikasi —</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.nameApp}
                  </option>
                ))}
              </select>
              {suntingKey && (
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Pemilik key tidak dapat dipindah. Buat key baru untuk aplikasi lain.
                </p>
              )}
            </div>

            <div>
              <label className={KELAS_LABEL} htmlFor="key-deskripsi">
                Keterangan
              </label>
              <textarea
                id="key-deskripsi"
                rows={2}
                value={formKey.description}
                onChange={(e) => setFormKey({ ...formKey, description: e.target.value })}
                placeholder="Dipakai untuk apa key ini."
                className={`${KELAS_INPUT} resize-y`}
              />
            </div>

            <div className="space-y-2">
              <p className={KELAS_LABEL}>Izin Endpoint</p>
              <label className="flex items-center gap-2 text-xs text-[#1E293B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formKey.semuaEndpoint}
                  onChange={(e) => setFormKey({ ...formKey, semuaEndpoint: e.target.checked })}
                  className="w-4 h-4 rounded border-[#D8E5DC] text-[#166534] focus:ring-[#166534]"
                />
                Semua endpoint publik
              </label>

              {!formKey.semuaEndpoint && (
                <div className="max-h-48 overflow-y-auto border border-[#D8E5DC] rounded-[8px] divide-y divide-[#E8EFEA]">
                  {endpoints.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-[#94A3B8]">
                      Belum ada endpoint di katalog. Tambahkan endpoint terlebih dahulu.
                    </p>
                  ) : (
                    endpoints.map((ep) => {
                      const dipilih = formKey.allowedEndpoints.includes(ep.id);
                      return (
                        <label
                          key={ep.id}
                          className="flex items-start gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-[#F9FDFB]"
                        >
                          <input
                            type="checkbox"
                            checked={dipilih}
                            onChange={(e) => {
                              setFormKey((f) => ({
                                ...f,
                                allowedEndpoints: e.target.checked
                                  ? [...f.allowedEndpoints, ep.id]
                                  : f.allowedEndpoints.filter((id) => id !== ep.id),
                              }));
                            }}
                            className="w-3.5 h-3.5 mt-0.5 rounded border-[#D8E5DC] text-[#166534] focus:ring-[#166534]"
                          />
                          <span className="flex-1">
                            <span className="font-semibold text-[#1E293B]">{ep.name}</span>
                            <span className="block font-mono text-[10px] text-[#64748B]">{ep.endpoint}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E8EFEA]">
              <button
                type="button"
                onClick={() => setModalKey(false)}
                disabled={memproses}
                className="px-4 py-2.5 text-xs font-semibold text-[#475569] bg-white border border-[#D8E5DC] rounded-[8px] hover:bg-[#F1F5F2] disabled:opacity-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={memproses}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#166534] hover:bg-[#14532D] rounded-[8px] disabled:opacity-50 transition"
              >
                {memproses ? 'Menyimpan...' : suntingKey ? 'Simpan Perubahan' : 'Buat Key'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Konfirmasi aksi destruktif */}
      <NotificationModal
        isOpen={konfirmasi.isOpen}
        type="confirm"
        title={konfirmasi.judul}
        message={konfirmasi.pesan}
        confirmLabel={konfirmasi.label}
        loading={memproses}
        onClose={() => setKonfirmasi((k) => ({ ...k, isOpen: false }))}
        onConfirm={async () => {
          setMemproses(true);
          try {
            await konfirmasi.jalankan();
          } catch (err) {
            setNotification({
              isOpen: true,
              type: 'error',
              message: pesanGalat(err, 'Tindakan gagal dijalankan.'),
            });
          } finally {
            setMemproses(false);
            setKonfirmasi((k) => ({ ...k, isOpen: false }));
          }
        }}
      />

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={tutupNotifikasi}
      />
    </AdminPanelTemplate>
  );
};
