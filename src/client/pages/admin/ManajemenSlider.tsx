import React, { useCallback, useEffect, useState } from 'react';
import {
  PhotoIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { useAdminData } from '../../hooks/useAdminData';
import {
  BannerSliderItem,
  fetchAdminSliders,
  createAdminSlider,
  updateAdminSlider,
  deleteAdminSlider,
} from '../../services/api';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import {
  JENIS_MEDIA,
  BATAS_GAMBAR_BYTE,
  BATAS_VIDEO_BYTE,
  jenisMedia,
  labelJenisMedia,
  validasiBerkasMedia,
} from '../../lib/mediaSlider';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';
import { assetUrl } from '../../lib/assets';

interface ModalNotification {
  isOpen: boolean;
  type: NotificationType;
  title?: string;
  message: string;
}

const MB = (byte: number) => Math.round(byte / (1024 * 1024));

const resolvePreviewUrl = (url?: string | null) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return assetUrl(trimmed);
};

export const ManajemenSlider: React.FC = () => {
  const { currentUser, loading: userLoading, reload: reloadUser } = useAdminData();

  const [items, setItems] = useState<BannerSliderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BannerSliderItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<BannerSliderItem | null>(null);

  // Form State
  const [judul, setJudul] = useState('');
  const [subjudul, setSubjudul] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [urutan, setUrutan] = useState(1);
  const [active, setActive] = useState(true);

  // Berkas baru yang belum diunggah. `null` berarti memakai media yang sudah ada
  // (mode ubah) atau belum ada berkas sama sekali (mode tambah).
  const [berkasBaru, setBerkasBaru] = useState<File | null>(null);
  const [pratinjauBaru, setPratinjauBaru] = useState('');
  const [mediaLama, setMediaLama] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notify, setNotify] = useState<ModalNotification>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  const canEdit = hasPermission(currentUser, PERMISSIONS.sliderEdit);
  const canDelete = hasPermission(currentUser, PERMISSIONS.sliderDelete);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminSliders();
      if (res.data?.status) {
        setItems(res.data.data);
      }
    } catch {
      setNotify({
        isOpen: true,
        type: 'danger',
        title: 'Gagal Memuat',
        message: 'Tidak dapat mengambil daftar foto slider hero.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setJudul('');
    setSubjudul('');
    setLinkUrl('');
    setUrutan(items.length + 1);
    setActive(true);
    setBerkasBaru(null);
    setMediaLama('');
    lepasPratinjau();
    setEditingItem(null);
  };

  /**
   * Membebaskan object URL pratinjau agar blob tidak menumpuk di memori.
   */
  const lepasPratinjau = () => {
    setPratinjauBaru((sebelumnya) => {
      if (sebelumnya) URL.revokeObjectURL(sebelumnya);
      return '';
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: BannerSliderItem) => {
    resetForm();
    setEditingItem(item);
    setJudul(item.judul);
    setSubjudul(item.subjudul || '');
    setLinkUrl(item.linkUrl || '');
    setUrutan(item.urutan);
    setActive(item.active);
    setMediaLama(item.gambarUrl || '');
    setShowModal(true);
  };

  /**
   * Menyimpan berkas pilihan pengguna tanpa membacanya ke base64.
   *
   * Berkas asli dipertahankan dan dikirim sebagai `FormData` saat menyimpan.
   * Pratinjau memakai `URL.createObjectURL()` sehingga peramban tidak pernah
   * mengubah media menjadi teks sepanjang belasan megabyte.
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const hasil = validasiBerkasMedia(file);
    if (!hasil.sah) {
      setNotify({
        isOpen: true,
        type: 'warning',
        title: 'Berkas Tidak Sesuai',
        message: hasil.pesan || 'Berkas tidak dapat dipakai.',
      });
      e.target.value = '';
      return;
    }

    lepasPratinjau();
    setBerkasBaru(file);
    setPratinjauBaru(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!judul.trim()) {
      setNotify({
        isOpen: true,
        type: 'warning',
        title: 'Data Belum Lengkap',
        message: 'Judul slider wajib diisi.',
      });
      return;
    }

    if (!editingItem && !berkasBaru) {
      setNotify({
        isOpen: true,
        type: 'warning',
        title: 'Media Belum Ada',
        message: 'Unggah berkas gambar atau video slider terlebih dahulu.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        judul: judul.trim(),
        subjudul: subjudul.trim() || null,
        linkUrl: linkUrl.trim() || null,
        urutan: Number(urutan) || 0,
        active,
        berkas: berkasBaru,
      };

      if (editingItem) {
        await updateAdminSlider(editingItem.id, payload);
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Berhasil Diperbarui',
          message: 'Media slider hero berhasil diperbarui.',
        });
      } else {
        await createAdminSlider(payload);
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Berhasil Ditambahkan',
          message: 'Media slider hero baru berhasil ditambahkan.',
        });
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setNotify({
        isOpen: true,
        type: 'danger',
        title: 'Gagal Menyimpan',
        message: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan slider.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: BannerSliderItem) => {
    if (!canEdit) return;
    try {
      await updateAdminSlider(item.id, { active: !item.active });
      loadData();
    } catch {
      setNotify({
        isOpen: true,
        type: 'danger',
        title: 'Gagal Mengubah Status',
        message: 'Tidak dapat memperbarui status slider.',
      });
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteAdminSlider(itemToDelete.id);
      setItemToDelete(null);
      setNotify({
        isOpen: true,
        type: 'success',
        title: 'Berhasil Dihapus',
        message: 'Foto slider berhasil dihapus.',
      });
      loadData();
    } catch (err: any) {
      setNotify({
        isOpen: true,
        type: 'danger',
        title: 'Gagal Menghapus',
        message: err.response?.data?.message || 'Tidak dapat menghapus slider.',
      });
    }
  };

  const activeCount = items.filter((i) => i.active).length;
  const inactiveCount = items.length - activeCount;

  // Berkas baru diprioritaskan agar admin langsung melihat pilihannya.
  const mediaPratinjau = pratinjauBaru || resolvePreviewUrl(mediaLama);
  const jenisPratinjau = pratinjauBaru
    ? validasiBerkasMedia(berkasBaru).jenis
    : jenisMedia(mediaLama);

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Slider Hero Halaman Depan"
      description="Kelola foto atau video banner, judul slide, dan urutan rotasi slider pada hero landing page ONE UNUSU."
      onRefresh={async () => {
        await Promise.all([loadData(), reloadUser()]);
      }}
      refreshing={loading || userLoading}
      headerAction={canEdit && (
        <button type="button" onClick={openCreateModal}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]">
          <PlusIcon className="w-4 h-4" />
          <span>Tambah Data</span>
        </button>
      )}
    >
      {/* 1. Ringkasan Kartu Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-[14px] bg-white border border-[#D8E5DC] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#166534] flex items-center justify-center flex-shrink-0">
            <PhotoIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Total Slide</p>
            <p className="text-lg font-bold text-[#1E293B]">{items.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-[14px] bg-white border border-[#D8E5DC] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center flex-shrink-0">
            <EyeIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Slide Aktif</p>
            <p className="text-lg font-bold text-[#15803D]">{activeCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-[14px] bg-white border border-[#D8E5DC] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F1F5F2] text-[#64748B] flex items-center justify-center flex-shrink-0">
            <EyeSlashIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Slide Nonaktif</p>
            <p className="text-lg font-bold text-[#64748B]">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* 2. Tombol Aksi Tambah */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-xs text-[#64748B]">
          Urutan menentukan posisi tayang dari kiri ke kanan (atau rotasi otomatis setiap 6 detik).
        </p>
      </div>

      {/* 3. Daftar Kartu Slider */}
      {loading ? (
        <div className="p-12 text-center text-[#64748B] bg-white rounded-2xl border border-[#D8E5DC]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#166534] border-t-transparent mb-3" />
          <p className="text-xs font-medium">Memuat data media slider hero...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#D8E5DC] space-y-3">
          <PhotoIcon className="w-12 h-12 text-[#94A3B8] mx-auto" />
          <h3 className="text-sm font-bold text-[#1E293B]">Belum Ada Media Slider</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Halaman depan saat ini masih menampilkan media bawaan sistem. Tambahkan foto atau video slider custom untuk menampilkan kegiatan atau gedung kampus.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={openCreateModal}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-[#166534] text-white text-sm font-semibold hover:bg-[#14532D] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const previewDesk = resolvePreviewUrl(item.gambarUrl);
            const previewMob = item.gambarMobileUrl ? resolvePreviewUrl(item.gambarMobileUrl) : null;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white overflow-hidden transition-all shadow-sm hover:shadow-sm ${
                  item.active ? 'border-[#D8E5DC]' : 'border-stone-200 opacity-70 bg-stone-50/50'
                }`}
              >
                {/* Visual Thumbnail */}
                <div className="relative aspect-[16/8] bg-stone-900 overflow-hidden group">
                  {previewDesk ? (
                    jenisMedia(item.gambarUrl) === JENIS_MEDIA.VIDEO ? (
                      <video
                        src={previewDesk}
                        className="w-full h-full object-cover object-center"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                    ) : (
                      <img
                        src={previewDesk}
                        alt={item.judul}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs">
                      Tidak ada media
                    </div>
                  )}

                  {/* Badges Over Image */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold">
                      Slide #{item.urutan}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold">
                      {labelJenisMedia(item.gambarUrl)}
                    </span>
                    {previewMob && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#166534]/80 backdrop-blur-sm text-white text-[11px] font-semibold">
                        <DevicePhoneMobileIcon className="w-3 h-3" />
                        <span>Mobile</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5 z-10">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      disabled={!canEdit}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition shadow-sm ${
                        item.active
                          ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]'
                          : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.active ? 'bg-[#15803D]' : 'bg-stone-500'}`} />
                      <span>{item.active ? 'Aktif' : 'Nonaktif'}</span>
                    </button>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] line-clamp-1">{item.judul}</h4>
                    {item.subjudul && (
                      <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2 leading-relaxed">
                        {item.subjudul}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E8EFEA] flex items-center justify-between text-xs text-[#64748B]">
                    <span className="truncate max-w-[200px] text-[11px] font-mono text-[#94A3B8]">
                      {item.gambarUrl.startsWith('data:') ? 'Unggahan lama (base64)' : item.gambarUrl}
                    </span>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-[#166534] hover:bg-[#F0FDF4] transition"
                           title="Ubah Slide"
                           aria-label={`Ubah slide ${item.judul}`}
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEE2E2] transition"
                           title="Hapus Slide"
                           aria-label={`Hapus slide ${item.judul}`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal Form Tambah / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#D8E5DC] shadow-xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 px-6 border-b border-[#E8EFEA] bg-[#F9FBFA]">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  {editingItem ? 'Ubah Media Slider Hero' : 'Tambah Media Slider Hero'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Atur foto atau video yang tampil pada carousel utama beranda ONE UNUSU.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Tutup formulir slider"
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#E8EFEA] transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Judul Slide */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#1E293B]">
                  Judul Slide / Banner <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Kampus Terpadu - Gedung Rektorat Gaperta"
                  maxLength={150}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E5DC] bg-white text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              {/* Subjudul / Keterangan */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#1E293B]">
                  Subjudul / Keterangan Singkat (Opsional)
                </label>
                <input
                  type="text"
                  value={subjudul}
                  onChange={(e) => setSubjudul(e.target.value)}
                  placeholder="Contoh: Pusat Layanan Terpadu & Administrasi Universitas"
                  maxLength={255}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E5DC] bg-white text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534]"
                />
              </div>

              {/* Media: Gambar atau Video */}
              <div className="space-y-2 p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E8EFEA]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="font-semibold text-[#1E293B] flex items-center gap-1.5">
                    <ComputerDesktopIcon className="w-4 h-4 text-[#166534]" />
                    <span>Gambar atau Video Slide (16:9)</span>{" "}
                    {!editingItem && <span className="text-[#DC2626]">*</span>}
                  </label>
                  <label className="relative min-h-[44px] inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-[#166534]">
                    <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                    <span>Pilih Berkas</span>
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
                      onChange={handleFileUpload}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>

                <p className="text-[11px] text-[#64748B]">
                  Gambar JPG/PNG/WebP maks {MB(BATAS_GAMBAR_BYTE)} MB · Video MP4/WebM maks{' '}
                  {MB(BATAS_VIDEO_BYTE)} MB. Slide video diputar sampai selesai sebelum slider
                  berpindah ke slide berikutnya.
                </p>

                {mediaPratinjau && (
                  <div className="relative aspect-[16/7] rounded-lg overflow-hidden border border-[#D8E5DC] bg-black">
                    {jenisPratinjau === JENIS_MEDIA.VIDEO ? (
                      <video
                        src={mediaPratinjau}
                        className="w-full h-full object-cover object-center"
                        controls
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={mediaPratinjau}
                        alt="Pratinjau Slide"
                        className="w-full h-full object-cover object-center"
                      />
                    )}
                  </div>
                )}

                {berkasBaru && (
                  <p className="text-[11px] text-[#166534] font-semibold">
                    Berkas baru dipilih: {berkasBaru.name} ({labelJenisMedia(berkasBaru.name)})
                  </p>
                )}
                {!berkasBaru && editingItem && mediaLama && (
                  <p className="text-[11px] text-[#64748B]">
                    Biarkan kosong bila media lama tetap dipakai. Berkas lama dihapus dari server saat
                    diganti.
                  </p>
                )}
              </div>

              {/* Urutan & Status Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[#1E293B]">Urutan Tampil</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={urutan}
                    onChange={(e) => setUrutan(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D8E5DC] bg-white text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#166534]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-[#1E293B]">Status Tayang</label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-[#D8E5DC] bg-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded text-[#166534] focus:ring-[#166534]"
                    />
                    <span className="text-xs text-[#1E293B] font-medium">Aktifkan Slide Ini</span>
                  </label>
                </div>
              </div>

              {/* Tombol Simpan / Batal */}
              <div className="pt-4 border-t border-[#E8EFEA] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="min-h-[44px] px-4 py-3 rounded-[8px] border border-[#D8E5DC] bg-white hover:bg-[#F0FDF4] text-sm font-semibold text-[#475569] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-4 py-3 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
                >
                  {isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Dialog Konfirmasi Hapus */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[#D8E5DC] shadow-xl p-5 space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto">
              <TrashIcon className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-[#1E293B]">Hapus Media Slider Ini?</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Slide <strong>&ldquo;{itemToDelete.judul}&rdquo;</strong> akan dihapus dan tidak akan tampil lagi di halaman depan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 min-h-[44px] px-4 py-3 rounded-[8px] border border-[#D8E5DC] bg-white text-sm font-semibold text-[#475569] hover:bg-[#F0FDF4] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 min-h-[44px] px-4 py-3 rounded-[8px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Notifikasi */}
      <NotificationModal
        isOpen={notify.isOpen}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((prev) => ({ ...prev, isOpen: false }))}
      />
    </AdminPanelTemplate>
  );
};
