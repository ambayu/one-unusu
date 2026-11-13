import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMe, updateProfile, UserProfile } from '../services/api';
import { ProfileSkeleton } from '../components/Skeleton';
import { NotificationModal, NotificationType } from '../components/NotificationModal';
import { isBiodataComplete } from '../lib/biodata';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  KeyIcon,
  PhoneIcon,
  CameraIcon,
  AcademicCapIcon,
  IdentificationIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  XMarkIcon,
  ArrowPathIcon,
  UserCircleIcon,
  MapPinIcon,
  CalendarDaysIcon,
  HomeModernIcon,
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
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
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

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Generate 3x4 Canvas with Solid Red Background (#b91c1c)
  const handleApplyCrop = () => {
    if (!imageRef.current) return;

    // Standard 3x4 portrait aspect ratio (300 x 400px)
    const targetW = 300;
    const targetH = 400;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Mandatory Red Background (Latar Merah Resmi #b91c1c)
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Draw user image transformed (zoom & pan)
    const img = imageRef.current;
    ctx.save();
    ctx.translate(targetW / 2 + pan.x, targetH / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // 3. Export to base64 jpeg
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setAvatar(croppedDataUrl);
    setCropModalOpen(false);
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
        }
      } else {
        setNotify({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memperbarui',
          message: res.data.message || 'Gagal memperbarui biodata akun Anda.',
        });
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      setNotify({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: err.response?.data?.message || 'Terjadi kesalahan pada server saat memperbarui data biodata.',
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
          <div className="bg-white rounded-[16px] p-6 sm:p-7 border border-[#D8E5DC] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">

              {/* Photo 3x4 & Basic Info */}
              <div className="flex items-start sm:items-center gap-5">
                <div className="relative group flex-shrink-0">
                  <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-[#D8E5DC] bg-[#B91C1C] shadow-xs flex items-center justify-center text-white">
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

                <div className="space-y-1 min-w-0">
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

                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                      {user?.role === 'MAHASISWA' && 'Biodata Mahasiswa'}
                      {user?.role === 'DOSEN' && 'Biodata Dosen Pengajar'}
                      {user?.role === 'SUPERADMIN' && 'Biodata Super Administrator'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-[#F0FDF4] border border-[#D8E5DC] text-[#166534] text-xs font-semibold self-start sm:self-auto">
                <ShieldCheckIcon className="w-4 h-4 text-[#166534]" />
                <span>SSO Terverifikasi</span>
              </div>
            </div>

            {/* CARD 1: KHUSUS BIODATA MAHASISWA */}
            {user?.role === 'MAHASISWA' && (
              <div className="pt-5 border-t border-[#D8E5DC]/60 space-y-3">
                <p className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                  Data Akademik Mahasiswa
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Nomor Induk Mahasiswa</span>
                    <p className="font-mono font-bold text-[#1E293B] mt-0.5">{user.nim || user.username}</p>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Program Studi (S1)</span>
                    <p className="font-bold text-[#1E293B] mt-0.5">{user.prodi || 'S1 Sistem Informasi'}</p>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Fakultas</span>
                    <p className="font-bold text-[#1E293B] mt-0.5">{user.fakultas || 'Sains & Teknologi'}</p>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Status & Angkatan</span>
                    <p className="font-bold text-[#166534] mt-0.5">
                      {user.statusAkademik || 'AKTIF'} {user.angkatan ? `· ${user.angkatan}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 2: KHUSUS BIODATA DOSEN */}
            {user?.role === 'DOSEN' && (
              <div className="pt-5 border-t border-[#D8E5DC]/60 space-y-3">
                <p className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                  Data Ketenagaan Dosen & Homebase
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">NIDN / NUP</span>
                    <p className="font-mono font-bold text-[#1E293B] mt-0.5">{user.nidn || user.username}</p>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Homebase Prodi</span>
                    <p className="font-bold text-[#1E293B] mt-0.5">{user.prodi || 'S1 Pendidikan Agama Islam'}</p>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Fakultas Induk</span>
                    <p className="font-bold text-[#1E293B] mt-0.5">{user.fakultas || 'Studi Islam'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 3: KHUSUS BIODATA SUPERADMIN */}
            {user?.role === 'SUPERADMIN' && (
              <div className="pt-5 border-t border-[#D8E5DC]/60 space-y-3">
                <p className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                  Otoritas Manajemen Sistem & Infrastruktur
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Username Administrator</span>
                    <p className="font-mono font-bold text-[#1E293B] mt-0.5">{user.username}</p>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Unit Kerja</span>
                    <p className="font-bold text-[#1E293B] mt-0.5">PUSTIK / IT Center UNUSU</p>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded-[8px] border border-[#D8E5DC]">
                    <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Hak Akses</span>
                    <p className="font-bold text-[#166534] mt-0.5">Full Root SSO & Master DB</p>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 4: BIODATA KEPENDUDUKAN & AKADEMIK SINKRONISASI SIAKAD */}
            {(user?.nik || user?.tempatLahir || user?.jenisKelamin || user?.alamat || user?.asalSekolah || user?.namaIbuKandung || user?.syncedAt) && (
              <div className="pt-5 border-t border-[#D8E5DC]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1.5">
                    <IdentificationIcon className="w-4 h-4 text-[#166534]" />
                    <span>Biodata Kependudukan & Riwayat SIAKAD</span>
                  </p>
                  {user.syncedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#64748B] bg-[#F1F5F2] px-2.5 py-0.5 rounded-full border border-[#D8E5DC]">
                      <ClockIcon className="w-3.5 h-3.5 text-[#166534]" />
                      Sinkron: {new Date(user.syncedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {user.nik && (
                    <div className="p-3 bg-[#F8FAF9] rounded-[8px] border border-[#D8E5DC]">
                      <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Nomor Induk Kependudukan (NIK)</span>
                      <p className="font-mono font-bold text-[#1E293B] mt-0.5 tracking-wider">{user.nik}</p>
                    </div>
                  )}

                  {(user.tempatLahir || user.tanggalLahir) && (
                    <div className="p-3 bg-[#F8FAF9] rounded-[8px] border border-[#D8E5DC]">
                      <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Tempat, Tanggal Lahir</span>
                      <p className="font-bold text-[#1E293B] mt-0.5">
                        {[user.tempatLahir, user.tanggalLahir].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}

                  {user.jenisKelamin && (
                    <div className="p-3 bg-[#F8FAF9] rounded-[8px] border border-[#D8E5DC]">
                      <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Jenis Kelamin</span>
                      <p className="font-bold text-[#1E293B] mt-0.5">
                        {user.jenisKelamin === 'L' ? 'Laki-laki (L)' : user.jenisKelamin === 'P' ? 'Perempuan (P)' : user.jenisKelamin}
                      </p>
                    </div>
                  )}

                  {user.namaIbuKandung && (
                    <div className="p-3 bg-[#F8FAF9] rounded-[8px] border border-[#D8E5DC]">
                      <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Nama Ibu Kandung</span>
                      <p className="font-bold text-[#1E293B] mt-0.5">{user.namaIbuKandung}</p>
                    </div>
                  )}

                  {user.asalSekolah && (
                    <div className="p-3 bg-[#F8FAF9] rounded-[8px] border border-[#D8E5DC]">
                      <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Asal Sekolah / Madrasah</span>
                      <p className="font-bold text-[#1E293B] mt-0.5">{user.asalSekolah}</p>
                    </div>
                  )}

                  {user.alamat && (
                    <div className="p-3 bg-[#F8FAF9] rounded-[8px] border border-[#D8E5DC] sm:col-span-2 lg:col-span-3">
                      <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Alamat Domisili Terdata</span>
                      <p className="text-[#1E293B] mt-0.5 font-medium leading-relaxed">{user.alamat}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Input Kontak & Keamanan Akun */}
          <form onSubmit={handleSubmit} className="bg-white rounded-[16px] p-6 sm:p-7 border border-[#D8E5DC] shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-[#166534]" />
                <span>Kontak & Pasfoto Biodata</span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Pastikan alamat email dan nomor WhatsApp Anda aktif untuk komunikasi resmi kampus.
              </p>
            </div>

            {/* Photo Upload Notice */}
            <div className="p-3.5 rounded-[10px] bg-[#F0FDF4] border border-[#D8E5DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CameraIcon className="w-5 h-5 text-[#166534] flex-shrink-0" />
                <div>
                  <span className="font-bold text-[#1E293B]">Pasfoto Resmi (3x4 Latar Belakang Merah)</span>
                  <p className="text-[11px] text-[#64748B]">Gunakan foto formal menghadap ke depan dengan latar merah.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-[8px] border border-[#D8E5DC] bg-white hover:bg-[#F0FDF4] text-xs font-semibold text-[#166534] transition"
              >
                {avatar ? 'Ganti Pasfoto' : 'Pilih & Crop Pasfoto'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1E293B]">
                  Alamat Email <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="relative">
                  <EnvelopeIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@unusu.ac.id"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1E293B]">
                  Nomor WhatsApp Aktif <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="pt-6 border-t border-[#E8EFEA] space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                  <KeyIcon className="w-4 h-4 text-[#166534]" />
                  <span>Ubah Kata Sandi SSO</span>
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Kosongkan jika Anda tidak ingin mengganti kata sandi akun SSO Anda saat ini.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#1E293B]">Kata Sandi Saat Ini</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#1E293B]">Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#1E293B]">Ulangi Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi kata sandi baru"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8E5DC] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8EFEA] flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-[8px] bg-[#166534] hover:bg-[#14532D] active:bg-[#14532D] text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
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
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
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
                  className="max-w-none absolute inset-0 m-auto pointer-events-none"
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
                className="px-4 py-2 rounded-[8px] text-white bg-[#166534] hover:bg-[#14532D] font-semibold text-xs shadow-xs transition"
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
