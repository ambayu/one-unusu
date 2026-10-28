import React from "react";
import { Topbar } from "../components/layout/Topbar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { mainNavigation } from "../data/navigation";
import { externalUrls } from "../data/site";
import { Container } from "../components/ui/Container";
import { Icon } from "../components/ui/Icon";
import { SectionHeading } from "../components/ui/SectionHeading";

export const KeamananPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-12 sm:py-16">
        <Container>
          {/* Header */}
          <SectionHeading
            eyebrow="Arsitektur Keamanan"
            title="Keamanan & Protokol Single Sign-On (SSO)"
            description="Pelajari bagaimana ONE UNUSU menjaga integritas kredensial, enkripsi data, dan integritas sesi di seluruh satelit digital UNUSU."
            align="center"
          />

          {/* 3 Pilar Keamanan */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-xs">
              <div className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Icon name="shield" className="size-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-brand-950">
                Token Pertukaran v2 (Single-Use)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Saat berpindah ke aplikasi satelit (LMS, LPPM, LPM, E-Surat), sistem menggunakan tiket SSO bertanda tangan HMAC SHA-256 yang hangus setelah satu kali pakai (maksimal 60 detik) untuk menangkal Replay Attack.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-xs">
              <div className="grid size-12 place-items-center rounded-xl bg-gold-50 text-gold-700 ring-1 ring-gold-100">
                <Icon name="lock" className="size-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-brand-950">
                Zero-Knowledge Password di Satelit
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Aplikasi satelit (LMS, LPM, dsb.) tidak pernah menyimpan atau mengetahui password Anda. Kredensial akun sepenuhnya terisolasi dan diverifikasi eksklusif oleh server pusat ONE UNUSU.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-xs">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Icon name="layers" className="size-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-brand-950">
                Role-Based Access Control (RBAC)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Hak otorisasi (Mahasiswa, Dosen, Tendik, Auditor SPMI) disinkronkan secara aman melalui payload terenkripsi sehingga tiap pengguna hanya melihat data sesuai wewenangnya.
              </p>
            </div>
          </div>

          {/* Diagram Alur Protokol SSO */}
          <div className="mt-12 rounded-3xl bg-brand-950 p-8 sm:p-12 text-white shadow-xl">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold tracking-widest text-gold-400 uppercase">
                Alur Autentikasi
              </span>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold">
                Mekanisme Perpindahan Lintas Aplikasi
              </h2>
              <p className="mt-3 text-sm text-brand-100/80 leading-relaxed">
                Diagram alir pengamanan ketika Anda berpindah dari ONE UNUSU ke aplikasi satelit:
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="font-mono text-xs font-bold text-gold-300">LANGKAH 1</div>
                <div className="mt-2 text-sm font-semibold text-white">Login Utama</div>
                <div className="mt-1 text-xs text-brand-200/70">
                  User autentikasi di ONE UNUSU dengan NIM/NIDN & password terenkripsi.
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="font-mono text-xs font-bold text-gold-300">LANGKAH 2</div>
                <div className="mt-2 text-sm font-semibold text-white">Generate Tiket SSO</div>
                <div className="mt-1 text-xs text-brand-200/70">
                  ONE UNUSU mencetak tiket pertukaran singkat khusus untuk aplikasi tujuan.
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="font-mono text-xs font-bold text-gold-300">LANGKAH 3</div>
                <div className="mt-2 text-sm font-semibold text-white">Verifikasi Server</div>
                <div className="mt-1 text-xs text-brand-200/70">
                  Aplikasi satelit memvalidasi tiket langsung ke server ONE UNUSU di balik layar.
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="font-mono text-xs font-bold text-gold-300">LANGKAH 4</div>
                <div className="mt-2 text-sm font-semibold text-white">Akses Diberikan</div>
                <div className="mt-1 text-xs text-brand-200/70">
                  Sesi lokal satelit tercipta dan tiket SSO langsung dimusnahkan.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};

export default KeamananPage;
