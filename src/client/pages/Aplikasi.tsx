import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { mainNavigation } from "../data/navigation";
import { externalUrls } from "../data/site";
import { digitalServices } from "../data/services";
import { Container } from "../components/ui/Container";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Icon } from "../components/ui/Icon";
import type { DigitalService } from "../data/types";

export const AplikasiPage: React.FC = () => {
  const ssoApps = digitalServices.filter((s) => s.isSsoIntegrated);
  const nonSsoApps = digitalServices.filter((s) => !s.isSsoIntegrated);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-16 sm:py-24 bg-[#F8FAF9]">
        <Container>
          <SectionHeading
            eyebrow="Portal Ekosistem Kampus"
            title="Katalog Aplikasi ONE UNUSU"
            description="Daftar lengkap sistem layanan digital kampus. Bedakan aplikasi yang sudah terintegrasi Single Sign-On (SSO) langsung dengan akun NIM/NIDN dan aplikasi mandiri/eksternal."
          />

          {/* Daftar Aplikasi: Ditampilkan Semua & Dipisahkan Per Section */}
          <div className="mt-12 space-y-16">
            {/* Section 1: Aplikasi Terintegrasi Single Sign-On (SSO) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-xl font-bold font-display text-brand-950">
                    Aplikasi Terintegrasi Single Sign-On (SSO)
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {ssoApps.length} Layanan
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-stone-500">
                  Login sekali menggunakan akun NIM / NIDN resmi
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {ssoApps.map((service) => (
                  <AppCatalogCard key={service.id} service={service} />
                ))}
              </div>
            </div>

            {/* Section 2: Aplikasi Eksternal / Mandiri (Non-SSO) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <span className="size-3 rounded-full bg-amber-500" />
                  <h2 className="text-xl font-bold font-display text-stone-900">
                    Aplikasi Mandiri & Eksternal (Non-SSO)
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {nonSsoApps.length} Layanan
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-stone-500">
                  Menggunakan kredensial terpisah atau akses publik langsung
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {nonSsoApps.map((service) => (
                  <AppCatalogCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};

function AppCatalogCard({ service }: { service: DigitalService }) {
  const isSso = Boolean(service.isSsoIntegrated);

  return (
    <div
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl bg-white transition-all duration-200 border ${
        isSso
          ? "border-emerald-200/90 hover:border-emerald-500 shadow-xs hover:shadow-md"
          : "border-stone-200 hover:border-stone-400 shadow-xs hover:shadow-md"
      }`}
    >
      <div>
        {/* Mockup Banner Aplikasi */}
        <div className="relative aspect-[16/10] overflow-hidden bg-brand-950">
          {service.image ? (
            <img
              src={service.image}
              alt={`Screenshot ${service.name}`}
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-102"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-900 text-white">
              <Icon name={service.icon} className="size-12 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

          {/* Badge Kategori Kiri Atas */}
          <div className="absolute top-3 left-3">
            <span className="rounded-md bg-brand-950/85 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/10 backdrop-blur-xs">
              {service.badge || "Sistem"}
            </span>
          </div>

          {/* Badge Status SSO vs Non-SSO di Kanan Atas */}
          <div className="absolute top-3 right-3">
            {isSso ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 text-white px-2.5 py-1 text-[10.5px] font-bold shadow-xs">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                <span>Terintegrasi SSO</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2.5 py-1 text-[10.5px] font-bold shadow-xs">
                <span>Eksternal / Non-SSO</span>
              </span>
            )}
          </div>
        </div>

        {/* Keterangan & Deskripsi */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-9 place-items-center rounded-lg border flex-shrink-0 ${
                isSso
                  ? "bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]"
                  : "bg-stone-100 text-stone-700 border-stone-200"
              }`}
            >
              <Icon name={service.icon} className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-[#1E293B] group-hover:text-brand-700 transition-colors truncate">
                {service.name}
              </h3>
              <p className="text-[11px] font-semibold text-[#64748B] truncate">
                {service.fullName}
              </p>
            </div>
          </div>

          <p className="text-xs text-[#475569] leading-relaxed line-clamp-3">
            {service.description}
          </p>

          {/* Target Roles */}
          {service.targetRoles && (
            <div className="pt-1 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Akses:
              </span>
              {service.targetRoles.map((role) => (
                <span
                  key={role}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Kartu & Tombol Aksi */}
      <div className="border-t border-stone-100 p-5 pt-3.5 flex items-center justify-between bg-stone-50/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {isSso ? (
            <div className="flex items-center gap-1.5 text-[#166534]">
              <Icon name="shield" className="size-3.5" />
              <span>Login Sekali (SSO)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-stone-500">
              <Icon name="external" className="size-3.5" />
              <span>Portal Terpisah</span>
            </div>
          )}
        </div>

        {isSso ? (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <span>Masuk via SSO</span>
            <Icon name="arrow-right" className="size-3" />
          </Link>
        ) : service.url ? (
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <span>Buka Portal</span>
            <Icon name="external" className="size-3" />
          </a>
        ) : (
          <span className="text-xs text-stone-400 italic">Segera Hadir</span>
        )}
      </div>
    </div>
  );
}
