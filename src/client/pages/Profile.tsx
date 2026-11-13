import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMe, updateProfile, UserProfile } from '../services/api';
import { ProfileSkeleton } from '../components/Skeleton';
import { NotificationModal, NotificationType } from '../components/NotificationModal';
import { isBiodataComplete } from '../lib/biodata';
import { GalatPermintaan } from '../lib/pesanGalat';
import {
  ShieldCheckIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  KeyIcon,
  PhoneIcon,
  CameraIcon,
  IdentificationIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notify, setNotify] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  // Form states
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 3x4 Red Background Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const isRequiredBio = Boolean((location.state as any)?.requiredBio);

  // Notifikasi sekali tampil saat pengguna dilempar ke sini karena mencoba
  // membuka aplikasi SSO dengan biodata yang belum lengkap.
  const [bioNoticeDismissed, setBioNoticeDismissed] = useState(false);
  const showBioNotice =
    isRequiredBio && Boolean(user) && !isBiodataComplete(user) && !bioNoticeDismissed;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await fetchMe();
        if (res.data.status) {
          setUser(res.data.data);
          setEmail(res.data.data.email || '');
          setNoHp(res.data.data.noHp || '');
          setAvatar(res.data.data.avatar || null);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        const galat = err !== null && typeof err === 'object' ? (err as GalatPermintaan) : {};
        const status = galat.response?.status;
        if (status === 401 || status === 403) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [navigate]);

  // Handle Photo Upload & Open 3x4 Modal
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Format Berkas Salah',
        message: 'Berkas pasfoto harus berupa format gambar resmi (JPG, PNG, atau WebP).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Penanganan geser (pan) pada pratinjau.
  //
  // `preventDefault()` mencegah gambar ikut ter-drag bawaan browser, yang
  // membuat kursor dan foto terlepas. Pendengar `mousemove`/`mouseup` dipasang
  // di `window` lewat efek di bawah, supaya geser tetap lanjut walau kursor
  // keluar dari bingkai.
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const onUp = () => setIsDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragStart]);

  // Hasilkan kanvas 3x4 dengan latar merah solid (#b91c1c).
  //
  // PENTING - pratinjau dan hasil harus memakai satuan yang sama.
  // Cara lama menggambar `naturalWidth/naturalHeight` (piksel ASLI, mis. 4000px)
  // ke kanvas 300px, sedangkan pratinjau menampilkan foto yang sudah diperkecil.
  // Dua satuan berbeda, sehingga geseran 50 px di layar hanya menggeser 50 px
  // di kanvas - terasa "tidak bergerak" lalu melompat.
  //
  // Perhitungan di bawah meniru persis apa yang terlihat di layar:
  //   1. foto dimuat utuh di bingkai (`object-contain`),
  //   2. dipusatkan, lalu digeser `pan` dan diperbesar `zoom`,
  //   3. hasil akhirnya dipetakan ke kanvas dengan skala seragam.
  //
  // Catatan: `getBoundingClientRect()` TIDAK dipakai untuk ukuran gambar, karena
  // ia mengembalikan kotak elemen <img> (seukuran bingkai), bukan ukuran foto
  // yang termuat di dalamnya. Untuk foto lanskap keduanya berbeda jauh.
  const handleApplyCrop = () => {
    const img = imageRef.current;
    const bingkai = img?.parentElement;

    if (!img || !bingkai || !img.naturalWidth || !img.naturalHeight) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memotong Foto',
        message: 'Foto belum selesai dimuat. Tunggu sebentar lalu tekan "Terapkan" lagi.',
      });
      return;
    }

    // Rasio 3:4 (300 x 400 px) dengan latar merah resmi.
    const targetW = 300;
    const targetH = 400;

    // Ukuran bingkai pratinjau dalam piksel layar (w-60 h-80 = 240 x 320).
    const kotakBingkai = bingkai.getBoundingClientRect();
    if (kotakBingkai.width === 0 || kotakBingkai.height === 0) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memotong Foto',
        message: 'Bingkai foto tidak terdeteksi. Silakan pilih ulang pasfoto.',
      });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Latar merah wajib (latar pasfoto resmi).
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Ukuran foto ketika dimuat dengan `object-contain` ke dalam bingkai.
    const skalaMuat = Math.min(
      kotakBingkai.width / img.naturalWidth,
      kotakBingkai.height / img.naturalHeight
    );
    const lebarMuat = img.naturalWidth * skalaMuat;
    const tinggiMuat = img.naturalHeight * skalaMuat;

    // 3. Terapkan zoom dan geseran - sama seperti yang terlihat.
    const lebarAkhir = lebarMuat * zoom;
    const tinggiAkhir = tinggiMuat * zoom;
    const pusatX = kotakBingkai.width / 2 + pan.x;
    const pusatY = kotakBingkai.height / 2 + pan.y;

    // 4. Skala tunggal dari bingkai layar ke kanvas (3:4, jadi seragam).
    const skalaKanvas = targetW / kotakBingkai.width;

    const kiri = (pusatX - lebarAkhir / 2) * skalaKanvas;
    const atas = (pusatY - tinggiAkhir / 2) * skalaKanvas;
    const lebar = lebarAkhir * skalaKanvas;
    const tinggi = tinggiAkhir * skalaKanvas;

    // 5. Gambar. Bagian di luar kanvas otomatis terpotong, sehingga yang
    //    tersimpan persis area yang tampak di dalam bingkai.
    ctx.drawImage(img, kiri, atas, lebar, tinggi);

    // 6. Ekspor JPEG. Latar merah dari langkah 1 tampil pada area transparan.
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setAvatar(croppedDataUrl);
    setCropModalOpen(false);
    setRawImageSrc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Validasi Kata Sandi Gagal',
        message: 'Konfirmasi kata sandi baru tidak cocok dengan kata sandi baru yang Anda masukkan.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await updateProfile({
        email,
        noHp,
        avatar: avatar || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (res.data.status) {
        setNotify({
          isOpen: true,
          type: 'success',
          title: 'Pembaruan Berhasil',
          message: 'Biodata akun dan pengaturan profil Anda berhasil disimpan dan diperbarui.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (res.data.data) {
          setUser(res.data.data);
          // Sinkronkan pratinjau dengan yang benar-benar tersimpan di server.
          // Bila server menormalkan/mengubah foto, pratinjau tidak boleh
          // menampilkan versi lama seolah-olah itu yang tersimpan.
          setAvatar(res.data.data.avatar || null);
        }
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memperbarui',
          message: res.data.message || 'Gagal memperbarui biodata akun Anda.',
        });
      }
    } catch (err) {
      console.error('Update profile error:', err);

      // `catch` memberi `unknown`, bukan `any`. Bentuknya diperiksa lebih dulu
      // agar pesan dari server hanya dibaca bila memang ada.
      const galat = err !== null && typeof err === 'object' ? (err as GalatPermintaan) : {};
      const status = galat.response?.status;
      const pesanServer = galat.response?.data?.message;

      // Judul dan pesan harus menyebut sebabnya. Sebelumnya judul selalu
      // "Kesalahan Sistem", sehingga email yang sudah dipakai akun lain terbaca
      // seperti server rusak - padahal server sehat dan pengguna hanya perlu
      // memakai alamat lain. Galat 4xx berasal dari aturan validasi, bukan dari
      // sistem yang gagal.
      const galatPengguna = typeof status === 'number' && status >= 400 && status < 500;

      setNotify({
        isOpen: true,
        type: 'error',
        title: galatPengguna ? 'Periksa Kembali Data Anda' : 'Kesalahan Sistem',
        message:
          (typeof pesanServer === 'string' && pesanServer) ||
          (galatPengguna
            ? 'Data yang dikirim tidak dapat diterima server. Periksa kembali isian formulir Anda.'
            : 'Terjadi kesalahan pada server saat memperbarui data biodata.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">

      {/* Banner Lengkapi Biodata Wajib */}
      {isRequiredBio && !isBiodataComplete(user) && (
        <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] flex items-start gap-3 text-xs">
          <ExclamationCircleIcon className="w-5 h-5 text-[#B45309] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-[#92400E]">Lengkapi Biodata Akun Anda</p>
            <p className="mt-0.5 text-[#B45309] leading-relaxed">
              Untuk keamanan akun dan integrasi sistem kampus, silakan lengkapi Email aktif, nomor WhatsApp, serta pasfoto resmi Anda sebelum melanjutkan ke layanan lain.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Header Biodata Spesifik Berdasarkan Peran (MAHASISWA / DOSEN / SUPERADMIN) */}
          <div className="bg-white rounded-[16px] p-6 sm:p-7 border border-[#D8E5DC] shadow-sm space-y-6">
            {/* Photo 3x4 & Basic Info Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative group flex-shrink-0 self-start sm:self-auto">
                  <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-[#D8E5DC] bg-[#B91C1C] shadow-sm flex items-center justify-center text-white">
                    {avatar ? (
                      <img src={avatar} alt={user?.nama} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2">
                        <IdentificationIcon className="w-8 h-8 text-white/90" />
                        <span className="text-[9px] font-bold mt-1 text-white uppercase tracking-wider">3x4 Merah</span>
                      </div>
                    )}
                  </div>

                  {/* Change photo button trigger */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-[#166534] hover:bg-[#14532D] text-white shadow-md border-2 border-white transition"
                    title="Unggah / Atur Pasfoto 3x4"
                  >
                    <CameraIcon className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] tracking-tight truncate">
                      {user?.nama}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#166534]">
                    {user?.role === 'MAHASISWA' && (
                      <span>NIM: {user.nim || user.username}</span>
                    )}
                    {user?.role === 'DOSEN' && (
                      <span>NIDN: {user.nidn || user.username}</span>
                    )}
                    {user?.role === 'SUPERADMIN' && (
                      <span>ID Admin: {user.username}</span>
                    )}
                  </div>

                  <div className="pt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                      {user?.role === 'MAHASISWA' && 'Biodata Mahasiswa'}
                      {user?.role === 'DOSEN' && 'Biodata Dosen Pengajar'}
                      {user?.role === 'SUPERADMIN' && 'Biodata Super Administrator'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0FDF4] border border-[#D8E5DC] text-[#166534] text-[11px] font-semibold">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-[#166534]" />
                      <span>SSO Terverifikasi</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Box Pasfoto Resmi di Sebelah Kanan Atas */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3.5 rounded-[12px] bg-[#F9FDFB] border border-[#D8E5DC] self-stretch lg:self-auto">
                <div className="space-y-0.5">
                  <p className="text-xs sm:text-sm font-bold text-[#1E293B]">Pasfoto Resmi (3x4 Latar Belakang Merah)</p>
                  <p className="text-[11px] sm:text-xs text-[#64748B]">Gunakan foto formal menghadap ke depan dengan latar merah.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 px-4 py-2 rounded-[8px] border border-[#CBD5E1] bg-white hover:bg-[#F0FDF4] text-xs font-bold text-[#166534] shadow-xs transition"
                >
                  {avatar ? 'Ganti Pasfoto' : 'Pilih & Crop Pasfoto'}
                </button>
              </div>
            </div>

            {/* CARD 1: KHUSUS BIODATA MAHASISWA */}
            {user?.role === 'MAHASISWA' && (
              <div className="pt-5 border-t border-[#D8E5DC]/60 space-y-3">
                <p className="text-sm font-bold text-[#1E293B]">
                  Data Akademik Mahasiswa
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-[#1E293B]">Nomor Induk Mahasiswa</label>
                    <p className="font-mono text-xs font-medium text-[#475569]">{user.nim || user.username}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-[#1E293B]">Program Studi (S1)</label>
                    <p className="text-xs font-medium text-[#475569]">{user.prodi || 'S1 Sistem Informasi'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-[#1E293B]">Fakultas</label>
                    <p className="text-xs font-medium text-[#475569]">{user.fakultas || 'Sains & Teknologi'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-[#1E293B]">Status & Angkatan</label>
                    <p className="text-xs font-medium text-[#166534]">
                      {user.statusAkademik || 'AKTIF'} {user.angkatan ? `· ${user.angkatan}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* KHUSUS BIODATA DOSEN: GABUNGAN DATA KETENAGAAN & DATA KEPENDUDUKAN KIRI KANAN */}
            {user?.role === 'DOSEN' && (
              <div className="pt-6 border-t border-[#D8E5DC]/80 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                  
                  {/* Kolom Kiri: Data Ketenagaan Dosen & Homebase */}
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                      <IdentificationIcon className="w-4 h-4 text-[#166534]" />
                      <span>Data Ketenagaan Dosen & Homebase</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">NIDN / NUP</label>
                        <p className="font-mono text-xs font-medium text-[#475569]">{user.nidn || user.username}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">Status Ketenagaan</label>
                        <p className="text-xs font-medium text-[#166534]">{user.statusAkademik || 'Aktif Mengajar'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">Homebase Prodi</label>
                        <p className="text-xs font-medium text-[#475569]">{user.prodi || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">Fakultas Induk</label>
                        <p className="text-xs font-medium text-[#475569]">{user.fakultas || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Garis Pembatas Vertikal di Layar Besar / Horizontal di Mobile */}
                  <div className="hidden lg:block absolute" />

                  {/* Kolom Kanan: Biodata Kependudukan & Riwayat SIAKAD */}
                  <div className="space-y-4 lg:border-l lg:border-[#D8E5DC]/80 lg:pl-8">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                        <IdentificationIcon className="w-4 h-4 text-[#166534]" />
                        <span>Biodata Kependudukan & Riwayat SIAKAD</span>
                      </p>
                      {user.syncedAt && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#64748B] bg-[#F1F5F2] px-2.5 py-0.5 rounded-full border border-[#D8E5DC]">
                          <ClockIcon className="w-3.5 h-3.5 text-[#166534]" />
                          Sinkron: {new Date(user.syncedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {(!user.nik && !user.tempatLahir && !user.jenisKelamin && !user.alamat && !user.namaIbuKandung && !user.asalSekolah) ? (
                      <p className="text-xs text-[#64748B] italic">
                        Rincian data kependudukan belum tercatat pada pangkalan data SIAKAD.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {user.nik && (
                          <div className="space-y-1">
                            <label className="block text-sm font-bold text-[#1E293B]">Nomor Induk Kependudukan (NIK)</label>
                            <p className="font-mono text-xs font-medium text-[#475569] tracking-wider">{user.nik}</p>
                          </div>
                        )}

                        {(user.tempatLahir || user.tanggalLahir) && (
                          <div className="space-y-1">
                            <label className="block text-sm font-bold text-[#1E293B]">Tempat, Tanggal Lahir</label>
                            <p className="text-xs font-medium text-[#475569]">
                              {[user.tempatLahir, user.tanggalLahir].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}

                        {user.jenisKelamin && (
                          <div className="space-y-1">
                            <label className="block text-sm font-bold text-[#1E293B]">Jenis Kelamin</label>
                            <p className="text-xs font-medium text-[#475569]">
                              {user.jenisKelamin === 'L' ? 'Laki-laki (L)' : user.jenisKelamin === 'P' ? 'Perempuan (P)' : user.jenisKelamin}
                            </p>
                          </div>
                        )}

                        {user.alamat && (
                          <div className="space-y-1 sm:col-span-2">
                            <label className="block text-sm font-bold text-[#1E293B]">Alamat Domisili Terdata</label>
                            <p className="text-xs font-medium text-[#475569] leading-relaxed">{user.alamat}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* CARD 3: KHUSUS BIODATA SUPERADMIN */}
            {user?.role === 'SUPERADMIN' && (
              <div className="pt-5 border-t border-[#D8E5DC]/60 space-y-3">
                <p className="text-sm font-bold text-[#1E293B]">
                  Otoritas Manajemen Sistem & Infrastruktur
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-[#1E293B]">Username Administrator</label>
                    <p className="font-mono text-xs font-medium text-[#475569]">{user.username}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-[#1E293B]">Unit Kerja</label>
                    <p className="text-xs font-medium text-[#475569]">PUSTIK / IT Center UNUSU</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-[#1E293B]">Hak Akses</label>
                    <p className="text-xs font-medium text-[#166534]">Full Root SSO & Master DB</p>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 4: BIODATA KEPENDUDUKAN KHUSUS MAHASISWA & NON-DOSEN */}
            {user?.role !== 'DOSEN' && (user?.nik || user?.tempatLahir || user?.jenisKelamin || user?.alamat || user?.asalSekolah || user?.namaIbuKandung || user?.syncedAt) && (
              <div className="pt-5 border-t border-[#D8E5DC]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                    <IdentificationIcon className="w-4 h-4 text-[#166534]" />
                    <span>Biodata Kependudukan & Riwayat SIAKAD</span>
                  </p>
                  {user.syncedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#64748B] bg-[#F1F5F2] px-2.5 py-0.5 rounded-full border border-[#D8E5DC]">
                      <ClockIcon className="w-3.5 h-3.5 text-[#166534]" />
                      Sinkron: {new Date(user.syncedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>

                {(!user.nik && !user.tempatLahir && !user.jenisKelamin && !user.alamat && !user.namaIbuKandung && !user.asalSekolah) ? (
                  <p className="text-xs text-[#64748B] italic">
                    Rincian data kependudukan belum tercatat pada pangkalan data SIAKAD.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {user.nik && (
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">Nomor Induk Kependudukan (NIK)</label>
                        <p className="font-mono text-xs font-medium text-[#475569] tracking-wider">{user.nik}</p>
                      </div>
                    )}

                    {(user.tempatLahir || user.tanggalLahir) && (
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">Tempat, Tanggal Lahir</label>
                        <p className="text-xs font-medium text-[#475569]">
                          {[user.tempatLahir, user.tanggalLahir].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}

                    {user.jenisKelamin && (
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">Jenis Kelamin</label>
                        <p className="text-xs font-medium text-[#475569]">
                          {user.jenisKelamin === 'L' ? 'Laki-laki (L)' : user.jenisKelamin === 'P' ? 'Perempuan (P)' : user.jenisKelamin}
                        </p>
                      </div>
                    )}

                    {user.namaIbuKandung && (
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">Nama Ibu Kandung</label>
                        <p className="text-xs font-medium text-[#475569]">{user.namaIbuKandung}</p>
                      </div>
                    )}

                    {user.asalSekolah && (
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-[#1E293B]">Asal Sekolah / Madrasah</label>
                        <p className="text-xs font-medium text-[#475569]">{user.asalSekolah}</p>
                      </div>
                    )}

                    {user.alamat && (
                      <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-bold text-[#1E293B]">Alamat Domisili Terdata</label>
                        <p className="text-xs font-medium text-[#475569] leading-relaxed">{user.alamat}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Input Kontak & Keamanan Akun */}
          <form onSubmit={handleSubmit} className="bg-white rounded-[16px] p-6 sm:p-7 border border-[#D8E5DC] shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-[#166534]" />
                <span>Kontak & Keamanan Akun</span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Pastikan alamat email dan nomor WhatsApp Anda aktif untuk komunikasi resmi kampus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-sm sm:text-base font-bold text-[#1E293B]">
                  Alamat Email <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="relative">
                  <EnvelopeIcon className="w-5 h-5 text-[#64748B] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@unusu.ac.id"
                    className="w-full pl-11 pr-4 py-2.5 sm:py-3 text-sm text-[#1E293B] bg-white border border-[#CBD5E1] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm sm:text-base font-bold text-[#1E293B]">
                  Nomor WhatsApp Aktif <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="w-5 h-5 text-[#64748B] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full pl-11 pr-4 py-2.5 sm:py-3 text-sm text-[#1E293B] bg-white border border-[#CBD5E1] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] transition"
                  />
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="pt-6 border-t border-[#E8EFEA] space-y-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] flex items-center gap-2">
                  <KeyIcon className="w-5 h-5 text-[#166534]" />
                  <span>Ubah Kata Sandi SSO</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                  Kosongkan jika Anda tidak ingin mengganti kata sandi akun SSO Anda saat ini.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm sm:text-base font-bold text-[#1E293B]">Kata Sandi Saat Ini</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama"
                    className="w-full px-4 py-2.5 sm:py-3 text-sm text-[#1E293B] bg-white border border-[#CBD5E1] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm sm:text-base font-bold text-[#1E293B]">Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-2.5 sm:py-3 text-sm text-[#1E293B] bg-white border border-[#CBD5E1] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm sm:text-base font-bold text-[#1E293B]">Ulangi Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi kata sandi baru"
                    className="w-full px-4 py-2.5 sm:py-3 text-sm text-[#1E293B] bg-white border border-[#CBD5E1] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] transition"
                  />
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-[#E8EFEA] flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-7 py-3 rounded-[10px] bg-[#166534] hover:bg-[#14532D] active:bg-[#14532D] text-white font-bold text-sm sm:text-base transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Pembaruan Biodata'}
              </button>
            </div>
          </form>
        </>
      )}

      {/* MODAL ADJUST & CROP PASFOTO 3X4 DENGAN LATAR BELAKANG MERAH */}
      {cropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-50 bg-[#1E293B]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#D8E5DC]">

            <div className="flex justify-between items-center pb-3 border-b border-[#E8EFEA]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">Sesuaikan Pasfoto 3x4 Resmi</h3>
                <p className="text-[11px] text-[#64748B]">Geser dan perbesar foto agar pas di dalam bingkai 3x4 berlatar merah.</p>
              </div>
              <button
                onClick={() => setCropModalOpen(false)}
                className="p-1 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F2]"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Crop Viewport: Rasio 3:4 (w-60 h-80 / 240px x 320px) dengan Background Merah Resmi */}
            <div className="flex flex-col items-center justify-center py-2">
              <div
                onMouseDown={handleMouseDown}
                className="relative w-60 h-80 rounded-lg overflow-hidden bg-[#b91c1c] border-2 border-dashed border-white/60 shadow-md cursor-grab active:cursor-grabbing select-none"
              >
                <img
                  ref={imageRef}
                  src={rawImageSrc}
                  alt="Foto Asli"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                  }}
                  // `w-full h-full object-contain` membuat SELURUH foto muat di
                  // dalam bingkai 3x4 (tidak terpotong oleh ukuran aslinya),
                  // sehingga pengguna bisa melihat dan memposisikan seluruh
                  // gambar. Tanpa ini, foto 4000px hanya tampil potongan
                  // tengahnya dan tidak mungkin diposisikan dengan benar.
                  className="w-full h-full object-contain pointer-events-none absolute inset-0"
                />

                {/* Subtle 3x4 Guideline Grid */}
                <div className="absolute inset-0 pointer-events-none border border-white/20">
                  <div className="w-full h-1/3 border-b border-white/20" />
                  <div className="w-full h-1/3 border-b border-white/20" />
                </div>
              </div>

              <p className="text-[11px] text-[#94A3B8] mt-2">
                *Klik & geser foto untuk mengatur posisi. Latar belakang merah (#b91c1c) otomatis diterapkan.
              </p>
            </div>

            {/* Zoom Controls */}
            <div className="space-y-1.5 px-4 text-xs">
              <div className="flex justify-between text-[#475569] font-semibold">
                <span>Perbesar / Perkecil (Zoom):</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-emerald-800"
              />
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EFEA]">
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="px-3.5 py-2 rounded-[8px] text-[#475569] bg-[#F1F5F2] hover:bg-[#DCFCE7] font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-4 py-2 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-semibold text-xs shadow-sm transition"
              >
                Terapkan Pasfoto 3x4
              </button>
            </div>

          </div>
        </div>
      )}

      <NotificationModal
        isOpen={showBioNotice}
        type="info"
        title="Lengkapi Biodata Dulu"
        message="Email dan nomor WhatsApp Anda belum lengkap. Lengkapi biodata terlebih dahulu agar aplikasi SSO dapat dibuka."
        onClose={() => setBioNoticeDismissed(true)}
      />

      {/* Modal Notifikasi Hasil Submit / Validasi Profil */}
      <NotificationModal
        isOpen={notify.isOpen}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

export default Profile;
