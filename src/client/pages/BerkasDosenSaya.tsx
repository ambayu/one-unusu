import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PanelPageTemplate } from '../components/templates/PanelPageTemplate';
import { PanelGalat } from '../components/PanelGalat';
import { NotificationModal, NotificationType } from '../components/NotificationModal';
import {
  DosenBerkasItem,
  DosenBerkasTipeItem,
  deleteDosenBerkas,
  fetchDosenBerkasBlob,
  fetchDosenBerkasList,
  fetchDosenBerkasTipe,
  uploadDosenBerkas,
} from '../services/api';

/** Batas ukuran berkas pada sisi klien; server menegakkan batas yang sama. */
const MAKS_UKURAN = 10 * 1024 * 1024;

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
 * Satu baris daftar = satu JENIS berkas beserta seluruh unggahannya.
 *
 * Pengelompokan per jenis (bukan per baris berkas) membuat daftar selalu
 * sepanjang 14 baris — angka yang sama dengan target kelengkapan — sehingga
 * dosen langsung melihat mana yang masih kosong tanpa tabel kedua.
 */
interface BarisJenis {
  tipe: DosenBerkasTipeItem;
  berkas: DosenBerkasItem[];
}

const kelasInput =
  'w-full border border-[#D8E5DC] rounded-lg px-4 py-3 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534] transition';
const kelasLabel = 'block text-xs font-semibold text-[#475569] mb-1.5';

/**
 * Halaman dosen untuk mengelola berkas pribadinya (CV, ijazah, SK, sertifikat).
 *
 * Tiga blok saja: ringkasan progres, form unggah, lalu satu daftar 14 jenis
 * berkas. Detail teknis (ukuran, tanggal, hapus) dibuka di dalam baris yang
 * bersangkutan, sehingga tidak perlu tabel terpisah di bawah halaman.
 */
export const BerkasDosenSaya: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [memuatUlang, setMemuatUlang] = useState(false);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  const [tipeList, setTipeList] = useState<DosenBerkasTipeItem[]>([]);
  const [berkasList, setBerkasList] = useState<DosenBerkasItem[]>([]);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [tipeTerpilih, setTipeTerpilih] = useState<number | ''>('');
  const [namaFile, setNamaFile] = useState('');
  const [nomorDokumen, setNomorDokumen] = useState('');
  const [tahunSK, setTahunSK] = useState(new Date().getFullYear().toString());
  const [keterangan, setKeterangan] = useState('');
  const [metaTerbuka, setMetaTerbuka] = useState(false);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [unggahPersen, setUnggahPersen] = useState<number | null>(null);
  const inputBerkasRef = useRef<HTMLInputElement>(null);

  const [barisTerbuka, setBarisTerbuka] = useState<Set<number>>(new Set());
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<DosenBerkasItem | null>(null);
  const [notifikasi, setNotifikasi] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title?: string;
    message: string;
  }>({ isOpen: false, type: 'info', message: '' });

  const muatData = useCallback(async (tampilkanSkeleton: boolean) => {
    if (tampilkanSkeleton) setLoading(true);
    else setMemuatUlang(true);

    const [hasilTipe, hasilBerkas] = await Promise.allSettled([
      fetchDosenBerkasTipe(),
      fetchDosenBerkasList(),
    ]);

    if (hasilTipe.status === 'fulfilled' && hasilTipe.value.data.status) {
      setTipeList(hasilTipe.value.data.data);
    }
    if (hasilBerkas.status === 'fulfilled' && hasilBerkas.value.data.status) {
      setBerkasList(hasilBerkas.value.data.data);
    }

    if (hasilTipe.status === 'rejected' || hasilBerkas.status === 'rejected') {
      // Kegagalan memuat ditampilkan sebagai panel di dalam halaman, bukan
      // popup: keadaannya menetap sampai pengguna mencoba lagi, dan popup akan
      // menutupi isi halaman tempat tombol "Coba Lagi" berada.
      const pesanTipe =
        hasilTipe.status === 'rejected'
          ? 'daftar jenis berkas'
          : null;
      const pesanBerkas =
        hasilBerkas.status === 'rejected'
          ? 'daftar berkas yang sudah diunggah'
          : null;

      setGalatMuat(
        `Tidak dapat memuat ${[pesanTipe, pesanBerkas].filter(Boolean).join(' dan ')}. Periksa koneksi lalu coba lagi.`
      );
    } else {
      setGalatMuat(null);
    }

    setLoading(false);
    setMemuatUlang(false);
  }, []);

  useEffect(() => {
    void muatData(true);
  }, [muatData]);

  /** Berkas dikelompokkan per jenis agar daftar sepanjang jumlah jenis berkas. */
  const barisJenis: BarisJenis[] = useMemo(() => {
    const perKode = new Map<string, DosenBerkasItem[]>();
    for (const item of berkasList) {
      const daftar = perKode.get(item.tipeKode);
      if (daftar) daftar.push(item);
      else perKode.set(item.tipeKode, [item]);
    }
    return tipeList.map((tipe) => ({ tipe, berkas: perKode.get(tipe.kode) ?? [] }));
  }, [tipeList, berkasList]);

  const totalJenis = tipeList.length;
  const jenisTerisi = barisJenis.filter((b) => b.berkas.length > 0).length;
  const totalWajib = tipeList.filter((t) => t.isRequired).length;
  const wajibKurang = barisJenis.filter((b) => b.tipe.isRequired && b.berkas.length === 0);
  const persen = totalJenis ? Math.round((jenisTerisi / totalJenis) * 100) : 0;

  const resetForm = () => {
    setTipeTerpilih('');
    setNamaFile('');
    setNomorDokumen('');
    setTahunSK(new Date().getFullYear().toString());
    setKeterangan('');
    setMetaTerbuka(false);
    setBerkas(null);
    setUnggahPersen(null);
    if (inputBerkasRef.current) inputBerkasRef.current.value = '';
  };

  const bukaForm = (tipeId?: number) => {
    resetForm();
    if (tipeId) setTipeTerpilih(tipeId);
    setFormTerbuka(true);
  };

  const pilihBerkas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setBerkas(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      event.target.value = '';
      setBerkas(null);
      setNotifikasi({
        isOpen: true,
        type: 'error',
        title: 'Format Berkas Salah',
        message: 'Hanya berkas PDF yang dapat diunggah.',
      });
      return;
    }

    if (file.size > MAKS_UKURAN) {
      event.target.value = '';
      setBerkas(null);
      setNotifikasi({
        isOpen: true,
        type: 'error',
        title: 'Ukuran Berkas Terlalu Besar',
        message: `Ukuran berkas ${ukuranTerbaca(file.size)} melebihi batas 10 MB.`,
      });
      return;
    }

    setBerkas(file);
    // Nama dokumen diisi otomatis dari jenis berkas agar dosen tidak perlu
    // mengetik ulang; nilainya tetap dapat diubah sebelum disimpan.
    if (!namaFile.trim()) {
      const namaTipe = tipeList.find((t) => t.id === Number(tipeTerpilih))?.nama;
      setNamaFile((namaTipe ?? file.name.replace(/\.pdf$/i, '')).slice(0, 255));
    }
  };

  const simpan = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!tipeTerpilih) {
      setNotifikasi({ isOpen: true, type: 'error', message: 'Pilih jenis berkas terlebih dahulu.' });
      return;
    }
    if (!namaFile.trim()) {
      setNotifikasi({ isOpen: true, type: 'error', message: 'Nama dokumen wajib diisi.' });
      return;
    }
    if (!berkas) {
      setNotifikasi({ isOpen: true, type: 'error', message: 'Berkas PDF wajib dilampirkan.' });
      return;
    }
    if (!/^\d{4}$/.test(tahunSK.trim())) {
      setNotifikasi({ isOpen: true, type: 'error', message: 'Tahun SK harus berupa 4 angka.' });
      return;
    }

    const formData = new FormData();
    formData.append('tipeId', String(tipeTerpilih));
    formData.append('namaFile', namaFile.trim());
    formData.append('nomorDokumen', nomorDokumen.trim());
    formData.append('tahunSK', tahunSK.trim());
    formData.append('keterangan', keterangan.trim());
    formData.append('file', berkas);

    setUnggahPersen(0);
    try {
      const response = await uploadDosenBerkas(formData, setUnggahPersen);
      setNotifikasi({
        isOpen: true,
        type: 'success',
        title: 'Berkas Terunggah',
        message: response.data.message,
      });
      setFormTerbuka(false);
      resetForm();
      await muatData(false);
    } catch (error: unknown) {
      const pesan =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Berkas gagal diunggah. Periksa koneksi lalu coba lagi.';
      setNotifikasi({ isOpen: true, type: 'error', title: 'Unggah Gagal', message: pesan });
    } finally {
      setUnggahPersen(null);
    }
  };

  const hapus = async () => {
    if (!konfirmasiHapus) return;
    try {
      const response = await deleteDosenBerkas(konfirmasiHapus.id);
      setNotifikasi({ isOpen: true, type: 'success', message: response.data.message });
      setKonfirmasiHapus(null);
      await muatData(false);
    } catch {
      setNotifikasi({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menghapus',
        message: 'Berkas tidak dapat dihapus. Coba lagi.',
      });
    }
  };

  /** Membuka berkas di tab baru. Blob dipakai karena endpoint menuntut sesi. */
  const pratinjau = async (item: DosenBerkasItem) => {
    try {
      const response = await fetchDosenBerkasBlob(item.fileUrl);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Objek URL dilepas setelah tab baru sempat memuat isinya.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setNotifikasi({
        isOpen: true,
        type: 'error',
        title: 'Gagal Membuka Berkas',
        message: 'Berkas tidak dapat ditampilkan. Coba muat ulang halaman.',
      });
    }
  };

  const toggleBaris = (idTipe: number) => {
    setBarisTerbuka((prev) => {
      const next = new Set(prev);
      if (next.has(idTipe)) next.delete(idTipe);
      else next.add(idTipe);
      return next;
    });
  };

  const pilihTipeForm = (nilai: string) => {
    setTipeTerpilih(nilai ? Number(nilai) : '');
    // Nama dokumen yang masih kosong atau masih sama dengan nama jenis
    // sebelumnya ikut diperbarui, agar tidak tertinggal pada jenis lama.
    if (!namaFile.trim() || tipeList.some((t) => t.nama === namaFile.trim())) {
      const tipe = tipeList.find((t) => t.id === Number(nilai));
      setNamaFile(tipe?.nama ?? '');
    }
  };

  /**
   * Menutup modal unggah lewat tombol Escape.
   *
   * Diabaikan selama unggahan berjalan: menutup modal di tengah unggahan akan
   * menyembunyikan progres tanpa membatalkan permintaan ke server.
   */
  useEffect(() => {
    if (!formTerbuka) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && unggahPersen === null) {
        setFormTerbuka(false);
        resetForm();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formTerbuka, unggahPersen]);

  return (
    <PanelPageTemplate
      badge="Panel Dosen ONE UNUSU"
      badgeIcon={DocumentTextIcon}
      title="Berkas Dosen"
      description="Kelola dokumen akademik Anda. Berkas wajib ditandai dan perlu dilengkapi."
      onRefresh={() => void muatData(false)}
      refreshing={memuatUlang}
    >
      {/* Galat muat ditampilkan di dalam halaman agar tombol "Coba Lagi"
          selalu terjangkau tanpa harus membuka ulang popup. */}
      {galatMuat && (
        <PanelGalat
          judul="Gagal Memuat Data Berkas"
          pesan={galatMuat}
          onCobaLagi={() => void muatData(false)}
          sedangMemuat={memuatUlang}
        />
      )}

      {/* Ringkasan progres — satu kartu, menggantikan empat kartu statistik */}
      <div className="bg-white rounded-[12px] border border-[#D8E5DC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1E293B]">
              {jenisTerisi} dari {totalJenis} jenis berkas terisi
            </p>
            <p className="text-xs text-[#64748B] mt-0.5">
              {berkasList.length} berkas terunggah
              {totalWajib > 0 &&
                (wajibKurang.length === 0
                  ? ' · semua berkas wajib lengkap'
                  : ` · ${wajibKurang.length} berkas wajib belum diunggah`)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => bukaForm()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold transition flex-shrink-0"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            Unggah Berkas
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-[#E8F0EB] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#166534] transition-all"
              style={{ width: `${persen}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#166534] tabular-nums w-10 text-right">
            {persen}%
          </span>
        </div>

        {wajibKurang.length > 0 && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-[8px] bg-[#FEF3C7] border border-[#FDE68A]">
            <ExclamationCircleIcon className="w-4 h-4 text-[#B45309] flex-shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-[#B45309]">
              Belum diunggah:{' '}
              <strong>{wajibKurang.map((b) => b.tipe.nama).join(', ')}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Form unggah — kartu seksi, bukan modal */}
      {/* Modal unggah berkas.
          Memakai pola modal proyek: latar gelap + blur, panel `max-w-xl`
          `rounded-2xl`, kepala `bg-[#F9FBFA]`, dan kaki berisi tombol aksi.
          `overflow-y-auto` pada latar membuat modal tetap bisa digulir bila
          layar pendek (mis. ponsel dengan keyboard terbuka). */}
      {formTerbuka && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-modal-berkas"
        >
          <form
            onSubmit={simpan}
            className="w-full max-w-xl rounded-2xl bg-white border border-[#D8E5DC] shadow-xl overflow-hidden my-8"
          >
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[#E8EFEA] bg-[#F9FBFA]">
              <div className="min-w-0">
                <h2 id="judul-modal-berkas" className="text-sm font-bold text-[#1E293B]">
                  Unggah Berkas
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Berkas PDF maksimal 10 MB. Pastikan dokumen terbaca jelas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormTerbuka(false);
                  resetForm();
                }}
                disabled={unggahPersen !== null}
                aria-label="Tutup"
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#E8EFEA] transition disabled:opacity-50 flex-shrink-0"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tipe" className={kelasLabel}>
                    Jenis Berkas <span className="text-[#B91C1C]">*</span>
                  </label>
                  <select
                    id="tipe"
                    value={tipeTerpilih}
                    onChange={(e) => pilihTipeForm(e.target.value)}
                    className={kelasInput}
                  >
                    <option value="">— Pilih jenis berkas —</option>
                    {tipeList.map((tipe) => (
                      <option key={tipe.id} value={tipe.id}>
                        {tipe.nama}
                        {tipe.isRequired ? ' (wajib)' : ''}
                        {tipe.sudahDiunggah ? ' — sudah ada' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="namaFile" className={kelasLabel}>
                    Nama Dokumen <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    id="namaFile"
                    type="text"
                    value={namaFile}
                    onChange={(e) => setNamaFile(e.target.value)}
                    placeholder="Contoh: CV Lengkap 2026"
                    maxLength={255}
                    className={kelasInput}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="file" className={kelasLabel}>
                  Berkas PDF <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    id="file"
                    ref={inputBerkasRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={pilihBerkas}
                    className="block w-full text-sm text-[#475569] file:mr-3 file:px-4 file:py-2.5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#166534] file:text-white hover:file:bg-[#14532D] file:cursor-pointer file:transition"
                  />
                  {berkas && (
                    <span className="text-xs text-[#166534] font-semibold whitespace-nowrap">
                      {ukuranTerbaca(berkas.size)}
                    </span>
                  )}
                </div>
              </div>

              {/* Kolom pelengkap disembunyikan agar modal ringkas; tahun SK tetap
                  aktif dengan nilai awal tahun berjalan sehingga bisa langsung
                  disimpan tanpa membuka panel ini. */}
              <div>
                <button
                  type="button"
                  onClick={() => setMetaTerbuka((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#166534] hover:underline"
                >
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 transition-transform ${metaTerbuka ? 'rotate-180' : ''}`}
                  />
                  {metaTerbuka ? 'Sembunyikan detail dokumen' : 'Tambah detail dokumen (opsional)'}
                </button>

                {metaTerbuka && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label htmlFor="nomorDokumen" className={kelasLabel}>
                        Nomor Dokumen
                      </label>
                      <input
                        id="nomorDokumen"
                        type="text"
                        value={nomorDokumen}
                        onChange={(e) => setNomorDokumen(e.target.value)}
                        placeholder="Contoh: SK-123/UNUSU/2026"
                        maxLength={100}
                        className={kelasInput}
                      />
                    </div>

                    <div>
                      <label htmlFor="tahunSK" className={kelasLabel}>
                        Tahun SK <span className="text-[#B91C1C]">*</span>
                      </label>
                      <input
                        id="tahunSK"
                        type="text"
                        inputMode="numeric"
                        value={tahunSK}
                        onChange={(e) => setTahunSK(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="2026"
                        maxLength={4}
                        className={kelasInput}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="keterangan" className={kelasLabel}>
                        Keterangan
                      </label>
                      <textarea
                        id="keterangan"
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        rows={2}
                        maxLength={5000}
                        placeholder="Catatan tambahan (opsional)"
                        className={`${kelasInput} resize-y`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {unggahPersen !== null && (
                <div>
                  <div className="flex items-center justify-between text-xs text-[#475569] mb-1">
                    <span>Mengunggah berkas...</span>
                    <span className="font-semibold">{unggahPersen}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E8F0EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#166534] transition-all"
                      style={{ width: `${unggahPersen}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E8EFEA] bg-[#F9FBFA]">
              <button
                type="button"
                onClick={() => {
                  setFormTerbuka(false);
                  resetForm();
                }}
                disabled={unggahPersen !== null}
                className="px-4 py-2.5 rounded-lg border border-[#D8E5DC] bg-white text-sm font-semibold text-[#475569] hover:bg-[#F1F5F2] transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={unggahPersen !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold transition disabled:opacity-60"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                {unggahPersen !== null ? 'Mengunggah...' : 'Simpan Berkas'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Satu daftar 14 jenis berkas: status, aksi unggah, dan detail menyatu */}
      <div className="bg-white rounded-[16px] border border-[#D8E5DC] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D8E5DC]">
          <h2 className="text-sm font-bold text-[#1E293B]">Daftar Jenis Berkas</h2>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            Klik jenis berkas untuk melihat dokumen, atau tombol unggah untuk menambah berkas baru.
          </p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-[#F1F5F2] animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-[#E8F0EB]">
            {barisJenis.map(({ tipe, berkas: dokumen }) => {
              const terisi = dokumen.length > 0;
              const terbuka = barisTerbuka.has(tipe.id);

              return (
                <li key={tipe.id}>
                  <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#F9FDFB] transition">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        terisi ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F1F5F2] text-[#94A3B8]'
                      }`}
                      aria-hidden="true"
                    >
                      {terisi ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <DocumentTextIcon className="w-4 h-4" />
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => terisi && toggleBaris(tipe.id)}
                      disabled={!terisi}
                      className="min-w-0 flex-1 text-left disabled:cursor-default"
                    >
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-[#1E293B] truncate">
                          {tipe.nama}
                        </span>
                        {tipe.isRequired && (
                          <span className="px-1.5 py-0.5 rounded-[5px] bg-[#FEF3C7] text-[#B45309] text-[10px] font-bold">
                            Wajib
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-[#64748B] mt-0.5 truncate">
                        {terisi
                          ? `${dokumen.length} berkas · terakhir diunggah ${tanggalTerbaca(
                              dokumen[0].uploadedAt
                            )}`
                          : 'Belum diunggah'}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {terisi && (
                        <button
                          type="button"
                          onClick={() => toggleBaris(tipe.id)}
                          title={terbuka ? 'Sembunyikan dokumen' : 'Lihat dokumen'}
                          aria-expanded={terbuka}
                          className="p-2 rounded-[7px] text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] transition"
                        >
                          <ChevronDownIcon
                            className={`w-4 h-4 transition-transform ${terbuka ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => bukaForm(tipe.id)}
                        title={`Unggah ${tipe.nama}`}
                        className="p-2 rounded-[7px] text-[#166534] hover:bg-[#F0FDF4] transition"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {terbuka && terisi && (
                    <div className="px-5 pb-3 space-y-1.5">
                      {dokumen.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-[8px] bg-[#F8FAF9] border border-[#E8F0EB]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#1E293B] truncate">
                              {item.namaFile}
                            </p>
                            <p className="text-[10.5px] text-[#64748B] truncate">
                              {[
                                item.nomorDokumen,
                                item.tahunSK,
                                ukuranTerbaca(item.fileSize),
                                tanggalTerbaca(item.uploadedAt),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void pratinjau(item)}
                            title="Lihat berkas"
                            className="p-1.5 rounded-[6px] text-[#475569] hover:bg-[#F0FDF4] hover:text-[#166534] transition flex-shrink-0"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setKonfirmasiHapus(item)}
                            title="Hapus berkas"
                            className="p-1.5 rounded-[6px] text-[#B91C1C] hover:bg-[#FEF2F2] transition flex-shrink-0"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <NotificationModal
        isOpen={notifikasi.isOpen}
        type={notifikasi.type}
        title={notifikasi.title}
        message={notifikasi.message}
        onClose={() => setNotifikasi((prev) => ({ ...prev, isOpen: false }))}
      />

      <NotificationModal
        isOpen={konfirmasiHapus !== null}
        type="confirm"
        title="Hapus Berkas"
        message={`Berkas "${konfirmasiHapus?.namaFile ?? ''}" akan dihapus dari daftar Anda. Lanjutkan?`}
        confirmLabel="Hapus"
        onConfirm={() => void hapus()}
        onClose={() => setKonfirmasiHapus(null)}
      />
    </PanelPageTemplate>
  );
};

export default BerkasDosenSaya;
