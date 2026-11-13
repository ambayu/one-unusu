import React, { useCallback, useEffect, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { AdminPanelTemplate } from '../../components/templates/AdminPanelTemplate';
import { DataTable } from '../../components/DataTable';
import { useAdminData } from '../../hooks/useAdminData';
import {
  DirectoryItem,
  createAdminDirectory,
  deleteAdminDirectory,
  fetchAdminDirectories,
  updateAdminDirectory,
} from '../../services/api';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { NotificationModal, NotificationType } from '../../components/NotificationModal';
import { isImageSource } from '../../lib/appIcon';

interface ModalNotification {
  isOpen: boolean;
  type: NotificationType;
  title?: string;
  message: string;
}

const AVAILABLE_ICONS = [
  { value: 'GlobeAltIcon', label: 'Globe / Web', component: GlobeAltIcon },
  { value: 'UserIcon', label: 'Pengguna / PMB', component: UserIcon },
  { value: 'AcademicCapIcon', label: 'Topi Sarjana / Akademik', component: AcademicCapIcon },
  { value: 'BuildingOffice2Icon', label: 'Gedung / Lembaga', component: BuildingOffice2Icon },
  { value: 'Squares2X2Icon', label: 'Grid Aplikasi', component: Squares2X2Icon },
];

export const DirektoriPublik: React.FC = () => {
  const { currentUser, loading: userLoading, reload: reloadUser } = useAdminData();

  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DirectoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<DirectoryItem | null>(null);

  // Form State
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('Portal Informasi');
  const [deskripsi, setDeskripsi] = useState('');
  const [urlTarget, setUrlTarget] = useState('');
  const [icon, setIcon] = useState('GlobeAltIcon');
  const [iconType, setIconType] = useState<'preset' | 'upload'>('preset');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isExternal, setIsExternal] = useState(false);
  const [urutan, setUrutan] = useState(1);
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notify, setNotify] = useState<ModalNotification>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  const canEdit = hasPermission(currentUser, PERMISSIONS.nonSsoEdit);
  const canDelete = hasPermission(currentUser, PERMISSIONS.nonSsoDelete);

  const loadDirectories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminDirectories();
      if (res.data.status) {
        setItems(res.data.data);
      }
    } catch {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memuat Data',
        message: 'Tidak dapat mengambil daftar direktori publik dari server.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectories();
  }, [loadDirectories]);

  const filteredItems = items.filter(
    (item) =>
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.kategori.toLowerCase().includes(search.toLowerCase()) ||
      item.urlTarget.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingItem(null);
    setNama('');
    setKategori('Portal Informasi');
    setDeskripsi('');
    setUrlTarget('');
    setIcon('GlobeAltIcon');
    setIconType('preset');
    setUploadedImage(null);
    setIsExternal(false);
    setUrutan(items.length + 1);
    setActive(true);
    setShowModal(true);
  };

  const openEditModal = (item: DirectoryItem) => {
    setEditingItem(item);
    setNama(item.nama);
    setKategori(item.kategori);
    setDeskripsi(item.deskripsi || '');
    setUrlTarget(item.urlTarget);
    
    if (isImageSource(item.icon)) {
      setIconType('upload');
      setUploadedImage(item.icon);
      setIcon('GlobeAltIcon');
    } else {
      setIconType('preset');
      setIcon(item.icon || 'GlobeAltIcon');
      setUploadedImage(null);
    }

    setIsExternal(item.isExternal);
    setUrutan(item.urutan);
    setActive(item.active);
    setShowModal(true);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Format Tidak Sesuai',
        message: 'Berkas harus berupa gambar PNG, JPG, WebP, atau SVG.',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Ukuran Terlalu Besar',
        message: 'Ukuran berkas logo maksimal 2 MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim() || !urlTarget.trim()) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Validasi Form',
        message: 'Nama direktori dan URL target wajib diisi.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const chosenIcon = iconType === 'upload' && uploadedImage ? uploadedImage : icon;

      const payload = {
        nama: nama.trim(),
        kategori: kategori.trim(),
        deskripsi: deskripsi.trim() || null,
        urlTarget: urlTarget.trim(),
        icon: chosenIcon,
        isExternal,
        urutan: Number(urutan),
        active,
      };

      if (editingItem) {
        const res = await updateAdminDirectory(editingItem.id, payload);
        if (res.data.status) {
          setShowModal(false);
          setNotify({
            isOpen: true,
            type: 'success',
            title: 'Berhasil Diperbarui',
            message: `Direktori "${nama}" berhasil diperbarui.`,
          });
          await loadDirectories();
        }
      } else {
        const res = await createAdminDirectory(payload);
        if (res.data.status) {
          setShowModal(false);
          setNotify({
            isOpen: true,
            type: 'success',
            title: 'Berhasil Ditambahkan',
            message: `Direktori "${nama}" berhasil disimpan dan langsung tampil di Dashboard.`,
          });
          await loadDirectories();
        }
      }
    } catch (err: any) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.response?.data?.message || 'Terjadi kesalahan pada server saat menyimpan direktori.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const res = await deleteAdminDirectory(itemToDelete.id);
      const name = itemToDelete.nama;
      setItemToDelete(null);
      setNotify({
        isOpen: true,
        type: 'success',
        title: 'Berhasil Dihapus',
        message: res.data.message || `Direktori "${name}" berhasil dihapus.`,
      });
      await loadDirectories();
    } catch (err: any) {
      setItemToDelete(null);
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menghapus',
        message: err.response?.data?.message || 'Gagal menghapus direktori.',
      });
    }
  };

  const renderIconComponent = (iconName: string | null) => {
    if (isImageSource(iconName)) {
      return (
        <img
          src={iconName as string}
          alt="Logo direktori"
          className="w-full h-full object-cover rounded-[8px]"
        />
      );
    }
    const found = AVAILABLE_ICONS.find((i) => i.value === iconName);
    const Component = found ? found.component : GlobeAltIcon;
    return <Component className="w-5 h-5" />;
  };

  return (
    <AdminPanelTemplate
      user={currentUser}
      title="Aplikasi Non-SSO & Direktori Publik"
      description="Kelola daftar tautan aplikasi mandiri/eksternal non-SSO dan direktori portal publik yang tampil di dashboard dan katalog kampus."
      onRefresh={loadDirectories}
      refreshing={loading || userLoading}
    >
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <MagnifyingGlassIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari direktori atau tautan..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
          />
        </div>

        {canEdit && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs shadow-xs transition"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Tambah Aplikasi Non-SSO</span>
          </button>
        )}
      </div>

      {/* Tabel Data Direktori */}
      <DataTable<DirectoryItem>
        data={filteredItems}
        kunciBaris={(item) => item.id}
        lebarMinimal="700px"
        perHalamanAwal={10}
        labelRingkasan={(dari, sampai, total) =>
          `Menampilkan ${dari}-${sampai} dari ${total} direktori`
        }
        kosong={
          <span className="text-[#94A3B8]">Belum ada direktori publik yang terdaftar.</span>
        }
        kolom={[
          {
            key: 'urutan',
            judul: 'Urutan',
            rataTengah: true,
            kelas: 'w-12 font-bold text-[#64748B]',
            sel: (item) => `#${item.urutan}`,
          },
          {
            key: 'nama',
            judul: 'Nama Direktori',
            sel: (item) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#DCFCE7] text-[#166534] flex items-center justify-center flex-shrink-0">
                  {renderIconComponent(item.icon)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#1E293B]">{item.nama}</p>
                  <p className="text-[11px] text-[#64748B] line-clamp-1">{item.deskripsi || '-'}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'kategori',
            judul: 'Kategori',
            sel: (item) => (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F2] text-[#475569] border border-[#D8E5DC]">
                {item.kategori}
              </span>
            ),
          },
          {
            key: 'url',
            judul: 'URL Tujuan',
            kelas: 'font-mono text-[11px] text-[#475569]',
            sel: (item) => (
              <a
                href={item.urlTarget}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#166534] hover:underline inline-flex items-center gap-1"
              >
                <span className="truncate max-w-[200px]">{item.urlTarget}</span>
                <ArrowTopRightOnSquareIcon className="w-3 h-3 flex-shrink-0" />
              </a>
            ),
          },
          {
            key: 'tipe',
            judul: 'Tipe Link',
            sel: (item) =>
              item.isExternal ? (
                <span className="text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Tab Baru (Eksternal)
                </span>
              ) : (
                <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Internal UNUSU
                </span>
              ),
          },
          {
            key: 'status',
            judul: 'Status',
            sel: (item) => (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  item.active
                    ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                    : 'bg-[#F1F5F2] text-[#64748B] border-[#D8E5DC]'
                }`}
              >
                {item.active ? 'Aktif' : 'Nonaktif'}
              </span>
            ),
          },
          ...((canEdit || canDelete)
            ? [
                {
                  key: 'aksi',
                  judul: 'Aksi',
                  rataTengah: true,
                  sel: (item: DirectoryItem) => (
                    <div className="flex items-center justify-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(item)}
                          title="Ubah Direktori"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-[#F1F5F2] hover:bg-[#E8EFEA] text-[#475569] font-semibold text-[11px] transition"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                          <span>Ubah</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setItemToDelete(item)}
                          title="Hapus Direktori"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] bg-[#FEE2E2] hover:bg-[#FECACA] text-[#B91C1C] font-semibold text-[11px] transition"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />

      {/* Modal Form Tambah / Ubah */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#D8E5DC] my-8">
            <div className="flex justify-between items-start pb-3.5 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-base">
                  {editingItem ? 'Ubah Direktori Publik' : 'Tambah Direktori Publik Baru'}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Input link portal eksternal atau publik kampus yang tampil di Dashboard.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2] transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Nama Direktori / Portal <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: PMB Online UNUSU"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Kategori</label>
                  <input
                    type="text"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    placeholder="Portal Informasi / Mahasiswa"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Urutan Tampil</label>
                  <input
                    type="number"
                    min={1}
                    value={urutan}
                    onChange={(e) => setUrutan(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  URL Target / Tautan <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={urlTarget}
                  onChange={(e) => setUrlTarget(e.target.value)}
                  placeholder="https://pmb.unusu.ac.id atau /"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] font-mono focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Pendaftaran mahasiswa baru dan beasiswa..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1.5">Ikon / Logo Direktori</label>

                {/* Tab Pilihan: Preset Icon vs Unggah Foto */}
                <div className="flex items-center gap-2 p-1 bg-[#F1F5F2] rounded-lg border border-[#D8E5DC] mb-3">
                  <button
                    type="button"
                    onClick={() => setIconType('preset')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition ${
                      iconType === 'preset'
                        ? 'bg-white text-[#166534] shadow-2xs'
                        : 'text-[#64748B] hover:text-[#1E293B]'
                    }`}
                  >
                    Ikon Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconType('upload')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition ${
                      iconType === 'upload'
                        ? 'bg-white text-[#166534] shadow-2xs'
                        : 'text-[#64748B] hover:text-[#1E293B]'
                    }`}
                  >
                    Unggah Logo / Foto
                  </button>
                </div>

                {iconType === 'preset' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AVAILABLE_ICONS.map((ic) => {
                      const isSelected = icon === ic.value;
                      const IconComp = ic.component;
                      return (
                        <button
                          key={ic.value}
                          type="button"
                          onClick={() => setIcon(ic.value)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'bg-[#DCFCE7] border-[#166534] text-[#166534] font-bold shadow-2xs'
                              : 'bg-white border-[#D8E5DC] text-[#475569] hover:bg-[#F1F5F2]'
                          }`}
                        >
                          <IconComp className="w-4 h-4 flex-shrink-0" />
                          <span className="text-[11px] truncate">{ic.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative border-2 border-dashed border-[#D8E5DC] hover:border-[#166534] rounded-[12px] p-3 text-center transition flex flex-col items-center justify-center min-h-[140px] bg-[#F0FDF4]/30">
                      {uploadedImage ? (
                        <div className="relative w-full flex flex-col items-center py-2">
                          <div className="w-20 h-20 rounded-[12px] overflow-hidden border border-[#D8E5DC] bg-white shadow-2xs flex items-center justify-center">
                            <img
                              src={uploadedImage}
                              alt="Pratinjau logo direktori"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-[11px] font-semibold text-[#166534] mt-2">Gambar terpilih</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedImage(null);
                            }}
                            className="mt-1 text-[11px] text-[#B91C1C] hover:underline font-semibold"
                          >
                            Hapus Gambar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-3">
                          <div className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#166534] mx-auto flex items-center justify-center">
                            <PhotoIcon className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-[#1E293B]">Klik untuk unggah logo / foto</p>
                          <p className="text-[10px] text-[#64748B]">PNG, JPG, WebP, atau SVG (maks. 2 MB)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-4 border-t border-[#E8EFEA]">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#1E293B]">
                  <input
                    type="checkbox"
                    checked={isExternal}
                    onChange={(e) => setIsExternal(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D8E5DC] text-[#166534] focus:ring-[#166534] accent-[#166534]"
                  />
                  <span>Buka di tab baru (eksternal)</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#1E293B]">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D8E5DC] text-[#166534] focus:ring-[#166534] accent-[#166534]"
                  />
                  <span>Tampilkan aktif di Dashboard</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#E8EFEA]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-[8px] text-[#475569] bg-[#F1F5F2] hover:bg-[#E8EFEA] font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-bold text-xs shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Direktori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Notifikasi Sukses / Error */}
      <NotificationModal
        isOpen={notify.isOpen}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modal Konfirmasi Hapus */}
      <NotificationModal
        isOpen={Boolean(itemToDelete)}
        type="confirm"
        title="Hapus Direktori Publik?"
        message={`Direktori "${itemToDelete?.nama}" akan dihapus dan tidak lagi tampil di dashboard mahasiswa/dosen.`}
        confirmLabel="Hapus Direktori"
        cancelLabel="Batal"
        onConfirm={handleDelete}
        onClose={() => setItemToDelete(null)}
      />
    </AdminPanelTemplate>
  );
};
