import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  CheckIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';
import { useAdminData } from '../../hooks/useAdminData';
import {
  MonitoringBerkasDosenItem,
  MonitoringBerkasDosenMeta,
  fetchDosenBerkasBlob,
  fetchMonitoringBerkasDosen,
} from '../../services/api';

type SaringanKelengkapan = 'semua' | 'belum' | 'sebagian' | 'lengkap';

const OPSI_SARINGAN: { nilai: SaringanKelengkapan; label: string }[] = [
  { nilai: 'semua', label: 'Semua Dosen' },
  { nilai: 'belum', label: 'Belum Mengunggah' },
  { nilai: 'sebagian', label: 'Sebagian' },
  { nilai: 'lengkap', label: 'Lengkap (14 jenis)' },
];

function ukuranTerbaca(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tanggalTerbaca(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Inisial nama untuk pengganti foto profil dosen.
 *
 * Diambil dari maksimal dua kata pertama. Nama yang hanya satu kata tetap
 * menghasilkan satu huruf, bukan string kosong.
 */
function inisialNama(nama: string | null | undefined): string {
  const bersih = (nama ?? '').trim();
  if (!bersih) return '?';
  const kata = bersih.split(/\s+/).filter(Boolean);
  return kata
    .slice(0, 2)
    .map((k) => k[0])
    .join('')
    .toUpperCase();
}

/** Kategori kelengkapan dipakai untuk menyaring dan mewarnai baris. */
function kategoriKelengkapan(dosen: MonitoringBerkasDosenItem): SaringanKelengkapan {
  if (!dosen.sudahMengunggah) return 'belum';
  if (dosen.totalBerkasTerunggah >= dosen.totalJenisBerkas) return 'lengkap';
  return 'sebagian';
}

/**
 * Panel monitoring kelengkapan berkas dosen.
 *
 * Halaman ini bersifat memantau, bukan memverifikasi: admin melihat seluruh
 * dosen beserta progres unggahnya, lalu menindaklanjuti dosen yang belum
 * mengunggah. Karena itu sumber datanya daftar pengguna berperan DOSEN, bukan
 * tabel berkas — dosen tanpa berkas tetap harus terlihat.
 */
export const BerkasDosen: React.FC = () => {
  const { currentUser: user } = useAdminData();

  const [daftarDosen, setDaftarDosen] = useState<MonitoringBerkasDosenItem[]>([]);
  const [meta, setMeta] = useState<MonitoringBerkasDosenMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [memuatUlang, setMemuatUlang] = useState(false);
  const [pencarian, setPencarian] = useState('');
  const [saringan, setSaringan] = useState<SaringanKelengkapan>('semua');
  const [terbuka, setTerbuka] = useState<Set<number>>(new Set());

  const [notifikasi, setNotifikasi] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title?: string;
    message: string;
  }>({ isOpen: false, type: 'info', message: '' });

  const muatData = useCallback(async (tampilkanSkeleton: boolean) => {
    if (tampilkanSkeleton) setLoading(true);
    else setMemuatUlang(true);

    try {
      const response = await fetchMonitoringBerkasDosen();
      if (response.data.status) {
        setDaftarDosen(response.data.data);
        setMeta(response.data.meta);
      }
    } catch {
      setNotifikasi({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memuat Data',
        message: 'Rekap berkas dosen tidak dapat dimuat. Coba segarkan halaman.',
      });
    } finally {
      setLoading(false);
      setMemuatUlang(false);
    }
  }, []);

  useEffect(() => {
    void muatData(true);
  }, [muatData]);

  const tersaring = useMemo(() => {
    const kata = pencarian.trim().toLowerCase();
    return daftarDosen.filter((dosen) => {
      if (saringan !== 'semua' && kategoriKelengkapan(dosen) !== saringan) return false;
      if (!kata) return true;
      return (
        dosen.nama.toLowerCase().includes(kata) ||
        (dosen.nidn ?? '').toLowerCase().includes(kata) ||
        (dosen.prodi ?? '').toLowerCase().includes(kata) ||
        (dosen.fakultas ?? '').toLowerCase().includes(kata)
      );
    });
  }, [daftarDosen, pencarian, saringan]);

  /**
   * Menggabungkan master jenis berkas (`meta.tipeBerkas`) dengan berkas milik
   * seorang dosen menjadi satu baris per jenis.
   *
   * Sumber kebenaran daftar jenis adalah master dari server, bukan
   * `dosen.berkas`: dosen yang belum mengunggah apa pun tetap harus melihat
   * ke-14 jenis beserta status "Belum diunggah". Jenis yang aktif tetapi tidak
   * disebut pada `jenisBelumDiunggah` (mis. hanya ada di data lama) tetap
   * dihitung sebagai belum diunggah bila memang tidak ada berkasnya.
   */
  const barisJenisDosen = (dosen: MonitoringBerkasDosenItem) => {
    const master = meta?.tipeBerkas ?? [];
    const jenis = master.map((tipe) => ({
      kode: tipe.kode,
      nama: tipe.nama,
      isRequired: tipe.isRequired,
      berkas: dosen.berkas.filter((b) => b.tipeKode === tipe.kode),
    }));

    // Jaga-jaga bila `meta` belum termuat namun baris berkas sudah ada:
    // tampilkan jenis yang hanya diketahui dari data berkas agar tidak hilang.
    const kodeDikenal = new Set(jenis.map((j) => j.kode));
    for (const berkas of dosen.berkas) {
      if (kodeDikenal.has(berkas.tipeKode)) continue;
      kodeDikenal.add(berkas.tipeKode);
      jenis.push({
        kode: berkas.tipeKode,
        nama: berkas.tipeNama,
        isRequired: false,
        berkas: dosen.berkas.filter((b) => b.tipeKode === berkas.tipeKode),
      });
    }

    return jenis;
  };

  const toggleTerbuka = (id: number) => {
    setTerbuka((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pratinjau = async (fileUrl: string) => {
    try {
      const response = await fetchDosenBerkasBlob(fileUrl);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setNotifikasi({
        isOpen: true,
        type: 'error',
        title: 'Gagal Membuka Berkas',
        message: 'Berkas tidak dapat ditampilkan.',
      });
    }
  };

  const unduhRekap = () => {
    const tipeBerkas = meta?.tipeBerkas ?? [];
    const kepala = [
      'No',
      'Nama Dosen',
      'NIDN/NUP',
      'Program Studi',
      'Fakultas',
      'Berkas Terunggah',
      ...tipeBerkas.map((tipe) => tipe.nama),
    ];

    const baris = tersaring.map((dosen, indeks) => {
      const kodeTerisi = new Set(dosen.berkas.map((b) => b.tipeKode));
      return [
        indeks + 1,
        dosen.nama,
        dosen.nidn ?? '',
        dosen.prodi ?? '',
        dosen.fakultas ?? '',
        `${dosen.totalBerkasTerunggah}/${dosen.totalJenisBerkas}`,
        ...tipeBerkas.map((tipe) => (kodeTerisi.has(tipe.kode) ? 'Ada' : 'Belum')),
      ];
    });

    // Nilai dibungkus tanda kutip ganda dan tanda kutip di dalamnya digandakan
    // agar nama berisi koma atau kutip tidak merusak kolom saat dibuka di Excel.
    const csv = [kepala, ...baris]
      .map((kolom) => kolom.map((sel) => `"${String(sel).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement('a');
    tautan.href = url;
    tautan.download = `rekap-berkas-dosen-${new Date().toISOString().slice(0, 10)}.csv`;
    tautan.click();
    URL.revokeObjectURL(url);
  };

  const statistik = [
    {
      label: 'Total Dosen',
      nilai: String(meta?.totalDosen ?? 0),
      icon: DocumentTextIcon,
      warna: 'bg-[#DBEAFE] text-[#0369A1]',
    },
    {
      label: 'Sudah Mengunggah',
      nilai: String(meta?.sudahMengunggah ?? 0),
      icon: CheckCircleIcon,
      warna: 'bg-[#DCFCE7] text-[#166534]',
    },
    {
      label: 'Belum Mengunggah',
      nilai: String(meta?.belumMengunggah ?? 0),
      icon: XCircleIcon,
      warna: 'bg-[#FEE2E2] text-[#B91C1C]',
    },
    {
      label: 'Jenis Berkas',
      nilai: String(meta?.totalTipeBerkas ?? 0),
      icon: DocumentTextIcon,
      warna: 'bg-[#FEF3C7] text-[#B45309]',
    },
  ];

  return (
    <AdminPanelTemplate
      user={user}
      title="Berkas Dosen"
      description="Pantau kelengkapan dokumen akademik dosen: siapa yang sudah mengunggah dan jenis berkas apa yang masih kosong."
      onRefresh={() => void muatData(false)}
      refreshing={memuatUlang}
    >
      {/* Statistik operasional */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statistik.map((kartu) => (
          <div
            key={kartu.label}
            className="bg-white rounded-[12px] border border-[#D8E5DC] p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] truncate">{kartu.label}</p>
              <p className="text-2xl font-bold text-[#1E293B]">{kartu.nilai}</p>
            </div>
            <div
              className={`w-13 h-13 rounded-[14px] flex items-center justify-center flex-shrink-0 ${kartu.warna}`}
            >
              <kartu.icon className="w-8 h-8" />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: pencarian, saringan, ekspor */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
              placeholder="Cari nama, NIDN, prodi, fakultas..."
              className="w-full pl-9 pr-3 py-2.5 border border-[#D8E5DC] rounded-lg text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#166534]"
            />
          </div>

          <select
            value={saringan}
            onChange={(e) => setSaringan(e.target.value as SaringanKelengkapan)}
            className="px-3 py-2.5 border border-[#D8E5DC] rounded-lg text-sm text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534]"
          >
            {OPSI_SARINGAN.map((opsi) => (
              <option key={opsi.nilai} value={opsi.nilai}>
                {opsi.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTerbuka(terbuka.size === 0 ? new Set(tersaring.map((d) => d.id)) : new Set())}
            className="px-3 py-2.5 border border-[#D8E5DC] rounded-lg text-sm font-semibold text-[#475569] hover:bg-[#F1F5F2] transition"
          >
            {terbuka.size === 0 ? 'Buka Semua' : 'Tutup Semua'}
          </button>
          <button
            type="button"
            onClick={unduhRekap}
            disabled={tersaring.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold transition disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Ekspor Rekap
          </button>
        </div>
      </div>

      {/* Daftar dosen */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[12px] bg-[#F1F5F2] animate-pulse" />
          ))}
        </div>
      ) : tersaring.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-[#D8E5DC] p-12 text-center">
          <DocumentTextIcon className="w-12 h-12 text-[#D8E5DC] mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">
            {daftarDosen.length === 0
              ? 'Belum ada akun dosen terdaftar pada sistem.'
              : 'Tidak ada dosen yang cocok dengan pencarian atau saringan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tersaring.map((dosen) => {
            const kategori = kategoriKelengkapan(dosen);
            const isOpen = terbuka.has(dosen.id);
            const persen = dosen.totalJenisBerkas
              ? Math.round((dosen.totalBerkasTerunggah / dosen.totalJenisBerkas) * 100)
              : 0;
            // Satu baris per jenis berkas, termasuk yang belum diunggah.
            // Dihitung hanya saat akordeon terbuka agar tidak mengulang
            // penyaringan seluruh baris berkas untuk setiap dosen.
            const barisJenis = isOpen ? barisJenisDosen(dosen) : [];

            return (
              <div
                key={dosen.id}
                className="bg-white rounded-[12px] border border-[#D8E5DC] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleTerbuka(dosen.id)}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-[#F9FDFB] transition text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Foto profil dosen di sisi kiri baris. Bila dosen belum
                        mengunggah foto, ditampilkan inisial agar tidak kosong.
                        Cincin warna di luar foto menandai status kelengkapan. */}
                    <div
                      className={`w-11 h-11 rounded-full flex-shrink-0 p-[2px] ${
                        kategori === 'belum'
                          ? 'bg-[#FEE2E2]'
                          : kategori === 'lengkap'
                            ? 'bg-[#DCFCE7]'
                            : 'bg-[#FEF3C7]'
                      }`}
                    >
                      {dosen.avatar ? (
                        <img
                          src={dosen.avatar}
                          alt={`Foto ${dosen.nama}`}
                          loading="lazy"
                          className="w-full h-full rounded-full object-cover border-2 border-white bg-[#F0FDF4]"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="w-full h-full rounded-full border-2 border-white bg-[#DCFCE7] text-[#166534] flex items-center justify-center text-xs font-bold uppercase"
                        >
                          {inisialNama(dosen.nama)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-[#1E293B] truncate">{dosen.nama}</p>
                        {kategori === 'belum' && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-[#FEE2E2] text-[#B91C1C] text-[10px] font-bold">
                            Belum Mengunggah
                          </span>
                        )}
                        {kategori === 'lengkap' && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-[#DCFCE7] text-[#166534] text-[10px] font-bold">
                            Lengkap
                          </span>
                        )}
                        {kategori === 'sebagian' && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-[#FEF3C7] text-[#B45309] text-[10px] font-bold">
                            Sebagian
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate">
                        {[dosen.nidn ?? 'NIDN belum ada', dosen.prodi, dosen.fakultas]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:w-[280px] flex-shrink-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
                        <span>
                          {dosen.totalBerkasTerunggah} / {dosen.totalJenisBerkas} jenis
                        </span>
                        <span className="font-semibold">{persen}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E8F0EB] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            kategori === 'belum'
                              ? 'bg-[#B91C1C]'
                              : kategori === 'lengkap'
                                ? 'bg-[#166534]'
                                : 'bg-[#B45309]'
                          }`}
                          style={{ width: `${persen}%` }}
                        />
                      </div>
                    </div>

                    <ChevronDownIcon
                      className={`w-4 h-4 text-[#94A3B8] flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[#D8E5DC] px-5 py-4 space-y-4">
                    {/* Satu tabel untuk SEMUA jenis berkas.
                        Baris yang belum diunggah tetap ditampilkan dengan status
                        "Belum diunggah", sehingga admin melihat daftar lengkap
                        14 jenis sekaligus tanpa perlu blok chip terpisah. */}
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
                        <h3 className="text-xs font-bold text-[#1E293B]">
                          Daftar Jenis Berkas
                        </h3>
                        <p className="text-[11px] text-[#64748B]">
                          <strong className="text-[#166534]">{dosen.berkas.length}</strong> jenis
                          terunggah dari{' '}
                          <strong className="text-[#1E293B]">{barisJenis.length}</strong> jenis
                          {dosen.totalBarisBerkas > dosen.berkas.length && (
                            <>
                              {' '}
                              · {dosen.totalBarisBerkas} berkas
                            </>
                          )}
                        </p>
                      </div>

                      <div className="rounded-[10px] border border-[#E8F0EB] overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px]">
                            <thead>
                              <tr className="bg-[#F0FDF4]">
                                <th className="px-4 py-2 text-left text-[11.5px] font-bold text-[#1E293B]">Jenis</th>
                                <th className="px-3 py-2 text-left text-[11.5px] font-bold text-[#1E293B]">Status</th>
                                <th className="px-3 py-2 text-left text-[11.5px] font-bold text-[#1E293B]">Dokumen</th>
                                <th className="px-3 py-2 text-left text-[11.5px] font-bold text-[#1E293B]">Tahun</th>
                                <th className="px-3 py-2 text-left text-[11.5px] font-bold text-[#1E293B]">Diunggah</th>
                                <th className="px-3 py-2 text-center text-[11.5px] font-bold text-[#1E293B]">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {barisJenis.map(({ kode, nama, isRequired, berkas }) => {
                                // Satu jenis bisa diunggah beberapa kali
                                // (mis. perpanjangan SK). Baris pertama menjadi
                                // isi utama; sisanya diringkas pada keterangan.
                                const utama = berkas[0];
                                const tambahan = berkas.length - 1;

                                return (
                                  <tr
                                    key={kode}
                                    className={`border-t border-[#E8F0EB] ${
                                      utama ? '' : 'bg-[#FCFDFC]'
                                    }`}
                                  >
                                    <td className="px-4 py-2 text-xs font-semibold text-[#1E293B]">
                                      {nama}
                                      {isRequired && (
                                        <span className="block text-[10.5px] font-semibold text-[#B91C1C]">
                                          wajib
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {utama ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[#DCFCE7] text-[#166534] text-[10.5px] font-semibold whitespace-nowrap">
                                          <CheckIcon className="w-3 h-3" />
                                          Terunggah
                                        </span>
                                      ) : (
                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10.5px] font-semibold whitespace-nowrap ${
                                            isRequired
                                              ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                              : 'bg-[#F1F5F2] text-[#64748B]'
                                          }`}
                                        >
                                          Belum diunggah
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-[#475569]">
                                      {utama ? (
                                        <>
                                          {utama.namaFile}
                                          {utama.nomorDokumen && (
                                            <span className="block text-[10.5px] text-[#94A3B8]">
                                              {utama.nomorDokumen}
                                            </span>
                                          )}
                                          {tambahan > 0 && (
                                            <span className="block text-[10.5px] text-[#94A3B8]">
                                              +{tambahan} berkas lain pada jenis ini
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-[#94A3B8] italic">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-[#475569]">
                                      {utama?.tahunSK ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-[#475569] whitespace-nowrap">
                                      {utama ? tanggalTerbaca(utama.uploadedAt) : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {utama ? (
                                        <button
                                          type="button"
                                          onClick={() => void pratinjau(utama.fileUrl)}
                                          title="Lihat berkas"
                                          className="p-1.5 rounded-[6px] text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] transition"
                                        >
                                          <EyeIcon className="w-4 h-4" />
                                        </button>
                                      ) : (
                                        <span className="text-[11px] text-[#CBD5E1]">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Progres berkas wajib */}
                    {dosen.totalTipeWajib > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#F0FDF4] border border-[#BBF7D0]">
                        <ArrowPathIcon className="w-3.5 h-3.5 text-[#166534] flex-shrink-0" />
                        <p className="text-[11px] text-[#166534]">
                          Berkas wajib: <strong>{dosen.wajibTerpenuhi}</strong> dari{' '}
                          <strong>{dosen.totalTipeWajib}</strong> terpenuhi
                          {dosen.wajibLengkap ? ' — lengkap.' : ' — masih ada yang kosong.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NotificationModal
        isOpen={notifikasi.isOpen}
        type={notifikasi.type}
        title={notifikasi.title}
        message={notifikasi.message}
        onClose={() => setNotifikasi((prev) => ({ ...prev, isOpen: false }))}
      />
    </AdminPanelTemplate>
  );
};

export default BerkasDosen;
