import React, { useEffect, useRef } from 'react';
import { AnimatedFlatSsoLogo } from './AnimatedFlatSsoLogo';

interface SsoLoadingScreenProps {
  /** Judul utama layar tunggu. */
  title?: string;
  /** Keterangan satu baris di bawah judul. */
  description?: string;
  /** Ukuran logo SSO dalam piksel. */
  logoSize?: number;
  /**
   * Jeda minimum sebelum aksi perpindahan halaman dijalankan (milidetik).
   * Komponen ini hanya mengekspos nilainya lewat `onReady` — tidak pernah
   * memblokir apa pun secara diam-diam.
   */
  delayMs?: number;
  /**
   * Dipanggil setelah layar terpasang dan `delayMs` terlewati. Inilah saat
   * yang tepat untuk memulai perpindahan halaman.
   */
  onReady?: () => void;
}

/**
 * SsoLoadingScreen — layar tunggu SATU HALAMAN PENUH saat pengguna menekan
 * tombol masuk di halaman login (sebelum browser berpindah ke Portal ONE
 * UNUSU).
 *
 * Alasan memakai overlay penuh, bukan spinner kecil di tombol:
 *  - Perpindahan ke domain Portal ONE UNUSU memakan waktu; tanpa penanda yang
 *    jelas, pengguna mengira tombol tidak merespons dan menekannya berulang.
 *  - Satu layar penuh menutupi formulir sehingga tidak ada input ganda.
 *
 * Identitas visual memakai `AnimatedFlatSsoLogo` (badge hijau UNUSU dengan
 * orbit satelit) agar seragam dengan layar autentikasi lain di ekosistem.
 * Warna mengikuti hijau UNUSU (#166534 / #14532D / #D4AF37).
 *
 * Aksesibilitas:
 *  - `role="status"` + `aria-live="polite"` agar pembaca layar mengumumkan
 *    proses yang sedang berjalan.
 *  - Animasi dihentikan bila pengguna mengaktifkan `prefers-reduced-motion`.
 */
export const SsoLoadingScreen: React.FC<SsoLoadingScreenProps> = ({
  title = 'Menghubungkan ke ONE UNUSU',
  description = 'Mengalihkan Anda ke Portal Single Sign-On kampus. Jangan tutup halaman ini.',
  logoSize = 200,
  delayMs = 0,
  onReady,
}) => {
  // Cegah halaman di belakang overlay ikut ter-scroll selama proses berjalan.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Jeda minimum supaya animasi logo punya waktu tampil. Tanpa ini, perpindahan
  // halaman yang sangat cepat (mis. cache panas) membuat layar tunggu hanya
  // berkedip sepersekian detik — terlihat seperti kerusakan, bukan proses.
  //
  // `onReady` disimpan di ref agar perubahan identitas callback dari pemanggil
  // tidak me-restart timer dan memperpanjang jeda tanpa sengaja.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!onReadyRef.current) return;

    // Hormati preferensi pengguna yang meminta animasi diminimalkan.
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const wait = reduceMotion ? 0 : delayMs;
    const timer = window.setTimeout(() => onReadyRef.current?.(), wait);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0B2E1C] px-6 py-10 text-center"
    >
      {/* Pendar lembut di tengah agar latar tidak terasa datar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(34,197,94,0.18) 0%, rgba(20,83,45,0.10) 38%, transparent 68%)',
        }}
      />

      {/* Garis lengkung dekoratif, sangat halus. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/15 smso-ring"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="smso-logo">
          <AnimatedFlatSsoLogo size={logoSize} />
        </div>

        <h1 className="mt-8 text-lg font-extrabold tracking-tight text-white sm:text-xl">
          {title}
        </h1>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-emerald-100/80 sm:text-sm">
          {description}
        </p>

        {/* Tiga titik berdenyut sebagai indikator progres. */}
        <div aria-hidden="true" className="mt-7 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-[#D4AF37] smso-dot"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </div>

        <p className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/35 bg-[#14532D]/60 px-3 py-1 text-[10px] font-semibold text-[#F5E7B2] sm:text-[11px]">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-[#D4AF37] smso-dot"
          />
          Sesi aman · Token sekali pakai
        </p>
      </div>

      {/* Keyframes lokal: tidak bergantung pada konfigurasi Tailwind app. */}
      <style>{`
        @keyframes smsoFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes smsoBreathe {
          0%, 100% { transform: scale(1);    opacity: .9; }
          50%      { transform: scale(1.035); opacity: 1; }
        }
        @keyframes smsoDot {
          0%, 100% { opacity: .25; transform: translateY(0); }
          50%      { opacity: 1;   transform: translateY(-3px); }
        }
        .smso-logo   { animation: smsoBreathe 3.2s ease-in-out infinite; }
        .smso-dot    { animation: smsoDot 1.1s ease-in-out infinite; }
        .smso-ring   { animation: smsoFadeUp .5s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .smso-logo, .smso-dot, .smso-ring { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

export default SsoLoadingScreen;
