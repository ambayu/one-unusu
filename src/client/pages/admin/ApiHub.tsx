import React, { useState } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  KeyIcon,
  ClipboardIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';

interface Tab {
  id: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'endpoints', label: 'Katalog Endpoint' },
  { id: 'keys', label: 'Manajemen API Key' },
  { id: 'logs', label: 'Riwayat Penggunaan' },
];

export const ApiHub: React.FC = () => {
  const { currentUser: user } = useAdminData();
  const [activeTab, setActiveTab] = useState<string>('endpoints');
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: NotificationType;
    message: string;
    title?: string;
  }>({ isOpen: false, type: 'success', message: '' });

  const [searchEndpoint, setSearchEndpoint] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const [revealedKeyId, setRevealedKeyId] = useState<number | null>(null);

  const canView = hasPermission(user, PERMISSIONS.apiHubView);
  const canEdit = hasPermission(user, PERMISSIONS.apiHubEdit);
  const canDelete = hasPermission(user, PERMISSIONS.apiHubDelete);

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

  const mockEndpoints = [
    {
      id: 1,
      name: 'Data Induk Dosen & Homebase',
      endpoint: '/api/v1/inter-service/dosen',
      method: 'GET',
      sourceApp: 'ONE_UNUSU',
      category: 'data',
      isActive: true,
      isPublic: true,
      description: 'Mengambil data biodata dosen lengkap termasuk NIDN, gelar, dan homebase prodi.',
      supportedFilters: [
        { param: 'search', type: 'string', desc: 'Pencarian nama, NIDN, atau username dosen' },
        { param: 'prodi', type: 'string', desc: 'Filter berdasarkan nama prodi' },
      ],
    },
    {
      id: 2,
      name: 'Data Mahasiswa Aktif',
      endpoint: '/api/v1/inter-service/mahasiswa',
      method: 'GET',
      sourceApp: 'ONE_UNUSU',
      category: 'data',
      isActive: true,
      isPublic: true,
      description: 'Mengambil daftar mahasiswa aktif per prodi dan angkatan.',
      supportedFilters: [
        { param: 'prodi', type: 'string', desc: 'Filter kode atau nama prodi' },
        { param: 'angkatan', type: 'number', desc: 'Tahun angkatan (contoh: 2024)' },
        { param: 'search', type: 'string', desc: 'Pencarian nama atau NIM mahasiswa' },
      ],
    },
    {
      id: 3,
      name: 'Data Publikasi Jurnal Dosen',
      endpoint: '/api/v1/riset/publikasi',
      method: 'GET',
      sourceApp: 'LPPM',
      category: 'data',
      isActive: true,
      isPublic: false,
      description: 'Mengambil data publikasi jurnal internasional & nasional dosen.',
      supportedFilters: [
        { param: 'tahun', type: 'number', desc: 'Tahun terbit jurnal' },
        { param: 'dosenId', type: 'number', desc: 'ID spesifik dosen pengarang' },
        { param: 'search', type: 'string', desc: 'Kata kunci judul publikasi' },
      ],
    },
    {
      id: 4,
      name: 'Daftar Fakultas & Program Studi',
      endpoint: '/api/academic/hierarchy',
      method: 'GET',
      sourceApp: 'PRODI UNUSU',
      category: 'data',
      isActive: true,
      isPublic: true,
      description: 'Proxy ONE UNUSU ke API publik Prodi UNUSU. Mengembalikan hierarki fakultas beserta program studi aktif.',
      supportedFilters: [],
    },
    {
      id: 5,
      name: 'Kurikulum & Mata Kuliah Prodi',
      endpoint: '/api/v1/inter-service/kurikulum-prodi',
      method: 'GET',
      sourceApp: 'PRODI UNUSU',
      category: 'data',
      isActive: true,
      isPublic: true,
      description: 'Mengambil seluruh master kurikulum dan penawaran mata kuliah dari semua Program Studi aktif di UNUSU beserta RPS.',
      supportedFilters: [
        { param: 'prodi', type: 'string', desc: 'Filter kode prodi (mis. "TIF") atau nama prodi' },
        { param: 'year', type: 'number', desc: 'Tahun kurikulum (mis. 2024)' },
        { param: 'semester', type: 'string', desc: 'Nama/kode semester (mis. "Ganjil", "2025-2026-GANJIL", atau "none")' },
        { param: 'search', type: 'string', desc: 'Pencarian kode atau nama mata kuliah' },
        { param: 'isActive', type: 'boolean', desc: 'Filter status aktif kurikulum (true / false)' },
      ],
    },
  ];

  const mockKeys = [
    {
      id: 1,
      key: 'unusu_sec_abc123def456ghi789jkl012mnopqrst',
      name: 'LPPM Service Token',
      appName: 'LPPM UNUSU',
      appId: 2,
      isActive: true,
      revoked: false,
      allowedEndpoints: 3,
      lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      usageCount: 245,
      createdAt: new Date('2026-11-01'),
    },
    {
      id: 2,
      key: 'unusu_sec_xyz789uvw456rst123opq890abcdefgh',
      name: 'LMS Sync Token',
      appName: 'LMS UNUSU',
      appId: 1,
      isActive: true,
      revoked: false,
      allowedEndpoints: 2,
      lastUsedAt: new Date(Date.now() - 30 * 60 * 1000),
      usageCount: 1823,
      createdAt: new Date('2026-10-15'),
    },
  ];

  const mockLogs = [
    {
      id: 1,
      appName: 'LPPM UNUSU',
      endpoint: '/api/v1/inter-service/dosen',
      method: 'GET',
      statusCode: 200,
      responseTime: 145,
      requestIp: '127.0.0.1',
      createdAt: new Date(),
    },
    {
      id: 2,
      appName: 'LMS UNUSU',
      endpoint: '/api/v1/inter-service/mahasiswa',
      method: 'GET',
      statusCode: 200,
      responseTime: 342,
      requestIp: '127.0.0.1',
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: 3,
      appName: 'E-SURAT UNUSU',
      endpoint: '/api/v1/riset/publikasi',
      method: 'GET',
      statusCode: 403,
      responseTime: 12,
      requestIp: '127.0.0.1',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  ];

  const filteredEndpoints = mockEndpoints.filter((ep) =>
    ep.name.toLowerCase().includes(searchEndpoint.toLowerCase()) ||
    ep.endpoint.toLowerCase().includes(searchEndpoint.toLowerCase())
  );

  const filteredKeys = mockKeys.filter((k) =>
    k.name.toLowerCase().includes(searchKey.toLowerCase()) ||
    k.appName.toLowerCase().includes(searchKey.toLowerCase())
  );

  const handleCopyKey = (key: string, id: number) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setNotification({
      isOpen: true,
      type: 'success',
      message: 'API Key berhasil disalin ke clipboard.',
    });
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleRevokeKey = (keyId: number, keyName: string) => {
    if (confirm(`Yakin ingin mencabut key "${keyName}"? Aplikasi tidak akan bisa mengakses API lagi.`)) {
      setNotification({
        isOpen: true,
        type: 'success',
        message: `API Key "${keyName}" berhasil dicabut.`,
      });
    }
  };

  return (
    <AdminPanelTemplate
      user={user}
      title="Integrasi & API Hub"
      description="Katalog endpoint integrasi antar aplikasi ONE UNUSU."
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-[#D8E5DC]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-[#166534] border-[#166534]'
                  : 'text-[#64748B] border-transparent hover:text-[#1E293B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Katalog Endpoint */}
        {activeTab === 'endpoints' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Cari endpoint..."
                  value={searchEndpoint}
                  onChange={(e) => setSearchEndpoint(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#D8E5DC] rounded-[8px] text-sm focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>
              {canEdit && (
                <button className="flex items-center gap-2 px-4 py-2 bg-[#166534] hover:bg-[#14532D] text-white rounded-[8px] font-semibold text-sm transition">
                  <PlusIcon className="w-4 h-4" />
                  Endpoint Baru
                </button>
              )}
            </div>

            <div className="bg-white rounded-[12px] border border-[#D8E5DC] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#D8E5DC]">
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#1E293B] w-[56px]">No.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Nama & Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Metode</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Penyedia</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Parameter Filter</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Status</th>
                    {canEdit && <th className="px-6 py-3 text-center text-xs font-semibold text-[#1E293B]">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEndpoints.map((ep, indeksEp) => (
                    <tr key={ep.id} className="border-b border-[#D8E5DC] hover:bg-[#F9FDFB] transition">
                      <td className="px-4 py-4 text-center align-top text-[11.5px] font-semibold text-[#94A3B8] tabular-nums">
                        {indeksEp + 1}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div>
                          <p className="font-semibold text-sm text-[#1E293B]">{ep.name}</p>
                          <p className="text-xs text-[#166534] font-mono font-bold mt-0.5">{ep.endpoint}</p>
                          <p className="text-xs text-[#64748B] mt-1 max-w-sm">{ep.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-[6px] ${
                          ep.method === 'GET' ? 'bg-[#DBEAFE] text-[#0369A1]' :
                          ep.method === 'POST' ? 'bg-[#DCFCE7] text-[#15803D]' :
                          ep.method === 'PUT' ? 'bg-[#FEF08A] text-[#854D0E]' :
                          'bg-[#FED7AA] text-[#92400E]'
                        }`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-sm font-medium text-[#475569]">{ep.sourceApp}</td>
                      <td className="px-6 py-4 align-top">
                        {ep.supportedFilters && ep.supportedFilters.length > 0 ? (
                          <div className="space-y-1.5">
                            {ep.supportedFilters.map((flt, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#1E293B] border border-[#E2E8F0]">
                                  {flt.param}
                                </span>
                                <span className="text-[#94A3B8] ml-1">({flt.type})</span>
                                <span className="text-[#64748B] ml-1.5">— {flt.desc}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#94A3B8] italic">Tanpa parameter filter</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${ep.isActive ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                          <span className="text-sm text-[#475569]">{ep.isPublic ? 'Publik' : 'Private'}</span>
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 align-top text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-2 hover:bg-[#E0F2FE] rounded-[6px] transition text-[#0369A1]">
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button className="p-2 hover:bg-[#FEE2E2] rounded-[6px] transition text-[#DC2626]">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Manajemen API Key */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Cari API Key..."
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#D8E5DC] rounded-[8px] text-sm focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>
              {canEdit && (
                <button onClick={() => setShowNewKeyModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#166534] hover:bg-[#14532D] text-white rounded-[8px] font-semibold text-sm transition">
                  <PlusIcon className="w-4 h-4" />
                  Generate Key Baru
                </button>
              )}
            </div>

            <div className="bg-white rounded-[12px] border border-[#D8E5DC] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#D8E5DC]">
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#1E293B] w-[56px]">No.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Nama & Aplikasi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">API Key</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Status & Penggunaan</th>
                    {canEdit && <th className="px-6 py-3 text-center text-xs font-semibold text-[#1E293B]">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredKeys.map((k, indeksKey) => (
                    <tr key={k.id} className="border-b border-[#D8E5DC] hover:bg-[#F9FDFB] transition">
                      <td className="px-4 py-4 text-center text-[11.5px] font-semibold text-[#94A3B8] tabular-nums">
                        {indeksKey + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-sm text-[#1E293B]">{k.name}</p>
                          <p className="text-xs text-[#64748B]">{k.appName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-1 bg-[#F1F5F9] rounded-[6px] text-[#1E293B]">
                            {revealedKeyId === k.id ? k.key : k.key.substring(0, 15) + '...'}
                          </span>
                          <button
                            onClick={() => setRevealedKeyId(revealedKeyId === k.id ? null : k.id)}
                            className="p-1 hover:bg-[#E0F2FE] rounded-[6px] text-[#0369A1] transition"
                          >
                            {revealedKeyId === k.id ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleCopyKey(k.key, k.id)}
                            className={`p-1 rounded-[6px] transition ${
                              copiedKeyId === k.id ? 'bg-[#DCFCE7] text-[#15803D]' : 'hover:bg-[#E0F2FE] text-[#0369A1]'
                            }`}
                          >
                            {copiedKeyId === k.id ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[#475569]">
                          <p className="font-semibold text-[#1E293B]">{k.usageCount} panggilan</p>
                          <p className="text-xs text-[#64748B]">Terakhir {k.lastUsedAt?.toLocaleDateString('id-ID') || 'belum pernah'}</p>
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-2 hover:bg-[#E0F2FE] rounded-[6px] transition text-[#0369A1]">
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleRevokeKey(k.id, k.name)}
                                className="p-2 hover:bg-[#FEE2E2] rounded-[6px] transition text-[#DC2626]"
                              >
                                <ExclamationTriangleIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Riwayat Penggunaan */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-[12px] border border-[#D8E5DC] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#D8E5DC]">
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#1E293B] w-[56px]">No.</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Aplikasi</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Endpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Status & Waktu</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1E293B]">Waktu Respon</th>
                </tr>
              </thead>
              <tbody>
                {mockLogs.map((log, indeksLog) => (
                  <tr key={log.id} className="border-b border-[#D8E5DC] hover:bg-[#F9FDFB] transition">
                    <td className="px-4 py-4 text-center text-[11.5px] font-semibold text-[#94A3B8] tabular-nums">
                      {indeksLog + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#1E293B]">{log.appName}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-[#1E293B] font-mono">{log.endpoint}</p>
                        <span className={`inline-block text-xs font-semibold rounded-[6px] px-2 py-1 ${
                          log.method === 'GET' ? 'bg-[#DBEAFE] text-[#0369A1]' : 'bg-[#DCFCE7] text-[#15803D]'
                        }`}>
                          {log.method}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-1 rounded-[6px] text-xs font-semibold ${
                          log.statusCode === 200 ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FED7AA] text-[#92400E]'
                        }`}>
                          {log.statusCode}
                        </span>
                        <span className="text-xs text-[#64748B]">{log.createdAt.toLocaleTimeString('id-ID')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569]">{log.responseTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </AdminPanelTemplate>
  );
};
