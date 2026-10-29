import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";
import { digitalServices } from "../../data/services";

export function DigitalServicesSection() {
  const [activeServiceId, setActiveServiceId] = useState<string>(
    digitalServices[0]?.id || ""
  );

  const activeService =
    digitalServices.find((s) => s.id === activeServiceId) || digitalServices[0];

  return (
    <section
      id="aplikasi"
      aria-labelledby="layanan-title"
      className="scroll-mt-24 bg-[#F8FAF9] py-20 sm:py-28 border-y border-stone-200"
    >
      <Container>
        <SectionHeading
          id="layanan-title"
          eyebrow="Ekosistem Aplikasi Terpadu"
          title="Aplikasi Terintegrasi ONE UNUSU"
          description="Pilih modul di sebelah kiri untuk melihat pratinjau tampilan antarmuka dan spesifikasi layanan digital kampus."
          align="center"
          action={
            <Link
              to="/aplikasi"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors shadow-xs"
            >
              <span>Lihat Detail Katalog</span>
              <Icon name="arrow-right" className="size-4" />
            </Link>
          }
        />

        {/* Master-Detail Showcase: Menu di Kiri, Full Wallpaper di Kanan */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl grid lg:grid-cols-12 min-h-[580px]">
          {/* Kolom Kiri: Side Menu Daftar Aplikasi */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-stone-200 p-4 sm:p-6 bg-stone-50/60 flex flex-col justify-between">
            <div>
              <div className="px-3 pb-3 flex items-center justify-between border-b border-stone-200/80 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Daftar Modul Terkoneksi
                </span>
                <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                  {digitalServices.length} Aplikasi
                </span>
              </div>

              <div className="space-y-2">
                {digitalServices.map((service) => {
                  const isActive = service.id === activeService?.id;
                  return (
                    <button
                      key={service.id}
                      onClick={() => setActiveServiceId(service.id)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 flex items-center gap-3.5 group relative ${
                        isActive
                          ? "bg-brand-900 text-white shadow-md shadow-brand-950/15"
                          : "hover:bg-white text-stone-700 hover:text-brand-900 border border-transparent hover:border-stone-200 hover:shadow-xs"
                      }`}
                    >
                      <div
                        className={`size-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive
                            ? "bg-gold-400 text-brand-950 font-bold"
                            : "bg-white text-brand-700 border border-stone-200 group-hover:bg-brand-50"
                        }`}
                      >
                        <Icon name={service.icon} className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`font-display text-sm font-bold truncate ${
                              isActive ? "text-white" : "text-stone-900"
                            }`}
                          >
                            {service.name}
                          </h4>
                          {service.badge && (
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0 ${
                                isActive
                                  ? "bg-brand-800 text-gold-300 border border-brand-700"
                                  : "bg-stone-200/70 text-stone-600"
                              }`}
                            >
                              {service.badge}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            isActive ? "text-brand-200" : "text-stone-500"
                          }`}
                        >
                          {service.fullName || service.description}
                        </p>
                      </div>

                      {isActive && (
                        <div className="w-1.5 h-6 rounded-full bg-gold-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick SSO Link di bawah side menu */}
            <div className="pt-4 mt-4 border-t border-stone-200">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-800 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Icon name="shield" className="size-4 text-gold-300" />
                <span>Masuk Portal SSO Sekarang</span>
                <Icon name="arrow-right" className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Kolom Kanan: Full Wallpaper & Detail Aplikasi Aktif */}
          <div className="lg:col-span-7 relative min-h-[420px] lg:min-h-full bg-brand-950 flex flex-col justify-between overflow-hidden">
            {/* Wallpaper Gambar Aplikasi Full Height & Width */}
            {activeService?.image ? (
              <img
                key={activeService.id}
                src={activeService.image}
                alt={`Wallpaper antarmuka ${activeService.name}`}
                className="absolute inset-0 h-full w-full object-cover object-top animate-in fade-in duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-brand-900 text-gold-300/40">
                <Icon name={activeService?.icon || "monitor"} className="size-24" />
              </div>
            )}

            {/* Scrim Overlay Gradient agar teks dan tombol di atas wallpaper terbaca sangat jernih */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/40 to-black/30 pointer-events-none" />

            {/* Top Bar Floating Badges */}
            <div className="relative z-10 p-6 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-950/80 backdrop-blur-md text-white text-xs font-bold border border-white/15">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{activeService?.badge || "Sistem SSO"}</span>
              </span>

              <Badge tone="inverse-success">Terkoneksi Terpadu</Badge>
            </div>

            {/* Bottom Floating Card: Deskripsi & Tombol Buka */}
            <div className="relative z-10 p-6 sm:p-8 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gold-400 font-mono">
                  {activeService?.fullName}
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {activeService?.name}
                </h3>
                <p className="text-sm text-stone-200 leading-relaxed max-w-xl">
                  {activeService?.description}
                </p>
              </div>

              {/* Target Peran */}
              {activeService?.targetRoles && activeService.targetRoles.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-stone-300 mr-1">
                    Akses Otoritas:
                  </span>
                  {activeService.targetRoles.map((role) => (
                    <span
                      key={role}
                      className="px-2.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white uppercase tracking-wider"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Jump */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-400 hover:bg-gold-300 text-brand-950 px-6 py-3 text-xs font-bold shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <Icon name="shield" className="size-4" />
                  <span>Akses {activeService?.name}</span>
                  <Icon name="arrow-right" className="size-3.5" />
                </Link>

                <Link
                  to="/aplikasi"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-5 py-3 text-xs font-semibold border border-white/20 transition-all"
                >
                  <span>Panduan & Info Layanan</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Ajakan Masuk SSO (Sesuai Aturan Docs: brand-900 solid, gold-400 button, tanpa grid buram) */}
        <div className="mt-16 p-8 sm:p-10 rounded-3xl bg-brand-900 text-white text-center max-w-4xl mx-auto space-y-5 shadow-xl border border-brand-800 relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-gold-400/15 text-gold-300 text-xs font-bold uppercase tracking-wider border border-gold-400/30">
              Single Sign-On Gateway
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Siap Mengakses Layanan Kampus Anda?
            </h3>
            <p className="text-sm text-brand-100/90 max-w-xl mx-auto leading-relaxed">
              Login sekali untuk melompat langsung ke LMS, E-Surat, LPM, LPPM, dan Sarpras tanpa repot mengingat banyak kata sandi.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-400 hover:bg-gold-300 text-brand-950 px-8 py-3.5 text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5"
              >
                <Icon name="shield" className="size-4" />
                <span>Masuk dengan NIM / NIDN</span>
                <Icon name="arrow-right" className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
