import React, { useEffect, useId, useRef, useState } from 'react';
import {
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { updateProfile } from '../services/api';

/**
 * Modal ganti kata sandi wajib.
 *
 * Ditampilkan setelah login ketika server menandai akun masih memakai kata
 * sandi bawaan hasil provisioning SIAKAD (satu kata sandi yang sama untuk
 * semua akun). Modal ini SENGAJA tidak dapat ditutup: tidak ada tombol batal,
 * klik latar tidak menutup, dan tombol Escape diabaikan. Satu-satunya jalan
 * keluar adalah mengganti kata sandi atau keluar (logout).
 *
 * Aturan panjang kata sandi mengikuti validasi server pada `PUT /api/profile`
 * agar pengguna tidak ditolak setelah mengisi formulir.
 */

const PANJANG_MINIMAL = 8;

interface AturanKataSandi {
  label: string;
  lulus: (nilai: string) => boolean;
}

/** Aturan yang diperiksa di klien; semuanya wajib lulus sebelum dikirim. */
const ATURAN: AturanKataSandi[] = [
  { label: `Minimal ${PANJANG_MINIMAL} karakter`, lulus: (v) => v.length >= PANJANG_MINIMAL },
  { label: 'Mengandung huruf besar (A-Z)', lulus: (v) => /[A-Z]/.test(v) },
  { label: 'Mengandung huruf kecil (a-z)', lulus: (v) => /[a-z]/.test(v) },
  { label: 'Mengandung angka (0-9)', lulus: (v) => /[0-9]/.test(v) },
];

export interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  /** Nama pengguna untuk sapaan personal. */
  nama?: string;
  /** Username/NIDN yang dipakai login, ditampilkan agar pengguna yakin akunnya benar. */
  username?: string;
  /** Dipanggil setelah kata sandi berhasil diganti. */
  onSuccess: () => void;
  /** Keluar dari akun — satu-satunya jalan keluar tanpa mengganti kata sandi. */
  onLogout: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  isOpen,
  nama,
  username,
  onSuccess,
  onLogout,
}) => {
  const titleId = useId();
  const descId = useId();

  const [kataSandiLama, setKataSandiLama] = useState('');
  const [kataSandiBaru, setKataSandiBaru] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');

  const [lihatLama, setLihatLama] = useState(false);
  const [lihatBaru, setLihatBaru] = useState(false);
  const [lihatKonfirmasi, setLihatKonfirmasi] = useState(false);

  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  const inputPertamaRef = useRef<HTMLInputElement>(null);

  // Fokuskan kolom pertama saat modal muncul agar pengguna langsung bisa mengetik.
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => inputPertamaRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  // Kunci scroll halaman selama modal tampil.
  useEffect(() => {
    if (!isOpen) return;
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = sebelumnya;
    };
  }, [isOpen]);

  // Escape sengaja diabaikan: modal ini tidak boleh ditutup tanpa mengganti kata sandi.
  useEffect(() => {
    if (!isOpen) return;
    const cegah = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', cegah, true);
    return () => window.removeEventListener('keydown', cegah, true);
  }, [isOpen]);

  if (!isOpen) return null;

  const aturanLulus = ATURAN.map((a) => ({ ...a, ok: a.lulus(kataSandiBaru) }));
  const semuaAturanLulus = aturanLulus.every((a) => a.ok);
  const konfirmasiCocok = kataSandiBaru.length > 0 && kataSandiBaru === konfirmasi;
  const bolehKirim =
    kataSandiLama.length > 0 && semuaAturanLulus && konfirmasiCocok && !mengirim;

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat(null);

    if (!kataSandiLama) {
      setGalat('Kata sandi saat ini wajib diisi.');
      return;
    }
    if (!semuaAturanLulus) {
      setGalat('Kata sandi baru belum memenuhi seluruh persyaratan.');
      return;
    }
    if (!konfirmasiCocok) {
      setGalat('Konfirmasi kata sandi tidak cocok dengan kata sandi baru.');
      return;
    }
    if (kataSandiBaru === kataSandiLama) {
      setGalat('Kata sandi baru tidak boleh sama dengan kata sandi saat ini.');
      return;
    }

    try {
      setMengirim(true);
      const res = await updateProfile({
        currentPassword: kataSandiLama,
        newPassword: kataSandiBaru,
      });

      if (res.data?.status) {
        onSuccess();
      } else {
        setGalat(res.data?.message || 'Kata sandi gagal disimpan. Silakan coba lagi.');
      }
    } catch (err: unknown) {
      const pesan =
        err !== null && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).response?.data?.message
          : null;
      setGalat(
        typeof pesan === 'string' && pesan
          ? pesan
          : 'Kata sandi gagal disimpan. Periksa koneksi Anda lalu coba lagi.'
      );
    } finally {
      setMengirim(false);
    }
  };

  /** Kolom kata sandi dengan tombol lihat/sembunyikan. */
  const kolomSandi = (
    id: string,
    label: string,
    nilai: string,
    setNilai: (v: string) => void,
    terlihat: boolean,
    setTerlihat: (v: boolean) => void,
    opsi: { autoComplete: string; placeholder: string; inputRef?: React.Ref<HTMLInputElement> }
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={opsi.inputRef}
          type={terlihat ? 'text' : 'password'}
          value={nilai}
          onChange={(e) => setNilai(e.target.value)}
          autoComplete={opsi.autoComplete}
          placeholder={opsi.placeholder}
          className="w-full pl-10 pr-11 py-2.5 text-sm rounded-[10px] border border-[#CBD5E1] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#166534]/25 focus:border-[#166534] transition-all min-h-[44px]"
        />
        <KeyIcon
          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => setTerlihat(!terlihat)}
          aria-label={terlihat ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-[8px] text-slate-500 hover:text-[#166534] hover:bg-[#F0FDF4] transition-colors cursor-pointer"
        >
          {terlihat ? (
            <EyeSlashIcon className="w-4 h-4" aria-hidden="true" />
          ) : (
            <EyeIcon className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[1000] bg-[#1E293B]/70 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6"
      // Klik latar TIDAK menutup modal: pengguna wajib mengganti kata sandi.
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative bg-white rounded-[20px] max-w-lg w-full overflow-hidden shadow-2xl border border-[#D8E5DC] max-h-[92vh] flex flex-col"
      >
        {/* Garis aksen atas kelembagaan */}
        <div className="h-1.5 w-full bg-[#166534]" />

        {/* Header */}
        <div className="bg-[#F0FDF4] border-b border-[#D8E5DC] px-5 sm:px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] flex items-center justify-center flex-shrink-0">
              <ShieldExclamationIcon className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-[10px] font-bold uppercase tracking-wider">
                Wajib Diganti
              </span>
              <h2
                id={titleId}
                className="mt-1.5 text-base sm:text-lg font-bold text-slate-900 leading-snug"
              >
                Amankan Akun Anda
              </h2>
            </div>
          </div>
        </div>

        {/* Isi */}
        <form onSubmit={kirim} className="px-5 sm:px-6 py-5 overflow-y-auto">
          <p id={descId} className="text-sm text-slate-700 leading-relaxed">
            {nama ? `Halo, ${nama}. ` : ''}
            Akun Anda masih memakai <strong className="font-bold">kata sandi bawaan</strong> yang
            sama untuk semua akun hasil tarikan SIAKAD. Selama kata sandi ini belum diganti, siapa
            pun yang mengetahui NIDN Anda dapat masuk ke akun Anda.
          </p>

          {username && (
            <div className="mt-3 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Akun yang sedang aktif
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900 break-all">
                {username}
              </p>
            </div>
          )}

          <div className="mt-4 space-y-3.5">
            {kolomSandi(
              'sandi-lama',
              'Kata Sandi Saat Ini',
              kataSandiLama,
              setKataSandiLama,
              lihatLama,
              setLihatLama,
              {
                autoComplete: 'current-password',
                placeholder: 'Kata sandi bawaan yang Anda pakai',
                inputRef: inputPertamaRef,
              }
            )}
            {kolomSandi(
              'sandi-baru',
              'Kata Sandi Baru',
              kataSandiBaru,
              setKataSandiBaru,
              lihatBaru,
              setLihatBaru,
              {
                autoComplete: 'new-password',
                placeholder: 'Buat kata sandi baru yang kuat',
              }
            )}
            {kolomSandi(
              'sandi-konfirmasi',
              'Ulangi Kata Sandi Baru',
              konfirmasi,
              setKonfirmasi,
              lihatKonfirmasi,
              setLihatKonfirmasi,
              {
                autoComplete: 'new-password',
                placeholder: 'Ketik ulang kata sandi baru',
              }
            )}
          </div>

          {/* Daftar persyaratan */}
          <div className="mt-4 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Persyaratan Kata Sandi
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {aturanLulus.map((a) => (
                <li
                  key={a.label}
                  className={`flex items-center gap-1.5 text-xs ${
                    a.ok ? 'text-[#166534] font-semibold' : 'text-slate-500'
                  }`}
                >
                  <CheckCircleIcon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      a.ok ? 'text-[#166534]' : 'text-slate-300'
                    }`}
                    aria-hidden="true"
                  />
                  {a.label}
                </li>
              ))}
            </ul>
            {kataSandiBaru.length > 0 && konfirmasi.length > 0 && !konfirmasiCocok && (
              <p className="mt-2 text-xs font-semibold text-rose-700">
                Konfirmasi kata sandi belum cocok.
              </p>
            )}
          </div>

          {/* Galat */}
          {galat && (
            <div
              role="alert"
              className="mt-4 rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800"
            >
              {galat}
            </div>
          )}

          {/* Aksi */}
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <button
              type="button"
              onClick={onLogout}
              disabled={mengirim}
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-[12px] border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              Keluar dari Akun
            </button>
            <button
              type="submit"
              disabled={!bolehKirim}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[12px] bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mengirim ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
            </button>
          </div>

          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            Modal ini tidak dapat ditutup sampai kata sandi diganti. Ingat bahwa mengubah kata
            sandi portal <strong className="font-semibold">tidak</strong> mengubah kata sandi
            SIAKAD Anda.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChangeModal;
