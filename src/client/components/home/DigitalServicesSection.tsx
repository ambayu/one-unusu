import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";
import { digitalServices } from "../../data/services";
import type { DigitalService } from "../../data/types";

export function DigitalServicesSection() {
  return (
    <section
      id="aplikasi"
      aria-labelledby="layanan-title"
      className="scroll-mt-24 bg-white py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          id="layanan-title"
          eyebrow="Ekosistem Aplikasi"
          title="Aplikasi Terintegrasi ONE UNUSU"
          description="Akses terpusat ruang belajar digital, tata naskah dinas, penjaminan mutu, penelitian, dan inventaris fasilitas kampus."
          align="center"
          action={
            <Link
              to="/aplikasi"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition-colors"
            >
              <span>Lihat Detail Katalog</span>
              <Icon name="arrow-right" className="size-4" />
            </Link>
          }
        />

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {digitalServices.map((service) => (
            <ServiceVisualCard key={service.id} service={service} />
          ))}
        </div>

        {/* Banner Ajakan Masuk SSO */}
        <div className="mt-16 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 text-white text-center max-w-4xl mx-auto space-y-5 shadow-xl relative overflow-hidden">
          <div className="pattern-grid-dark absolute inset-0 opacity-40 pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-gold-400/20 text-gold-300 text-xs font-bold uppercase tracking-wider border border-gold-400/30">
              Single Sign-On Gateway
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Siap Mengakses Layanan Kampus Anda?
            </h3>
            <p className="text-sm text-brand-100/80 max-w-xl mx-auto leading-relaxed">
              Login sekali untuk melompat langsung ke LMS, E-Surat, LPM, LPPM, dan Sarpras tanpa repot mengingat banyak kata sandi.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-8 py-3.5 text-sm font-bold text-brand-950 hover:bg-gold-300 transition-all shadow-lg hover:-translate-y-0.5"
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

function ServiceVisualCard({ service }: { service: DigitalService }) {
  const isAvailable = service.status === "available";

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs hover:border-brand-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      <div>
        {/* Gambar / Screenshot Mockup Aplikasi */}
        <div className="relative aspect-[16/10] overflow-hidden bg-brand-950">
          {service.image ? (
            <img
              src={service.image}
              alt={`Tampilan antarmuka ${service.name}`}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-900 text-gold-300">
              <Icon name={service.icon} className="size-12 opacity-50" />
            </div>
          )}
          {/* Subtle gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent pointer-events-none" />

          {/* Badge Kategori di atas gambar */}
          <div className="absolute top-3 left-3">
            <span className="rounded-lg bg-brand-950/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md border border-white/10">
              {service.badge || "Sistem"}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            {isAvailable ? (
              <Badge tone="inverse-success">Terkoneksi</Badge>
            ) : (
              <Badge tone="inverse-gold">Segera</Badge>
            )}
          </div>
        </div>

        {/* Konten Keterangan */}
        <div className="p-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Icon name={service.icon} className="size-4" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-brand-950 group-hover:text-brand-700 transition-colors">
                {service.name}
              </h3>
              <p className="text-[11px] font-semibold text-gold-600">
                {service.fullName}
              </p>
            </div>
          </div>

          <p className="pt-2 text-xs text-stone-600 leading-relaxed line-clamp-3">
            {service.description}
          </p>
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="border-t border-stone-100 p-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
          <Icon name="shield" className="size-3.5 text-brand-600" />
          <span>SSO Token v2</span>
        </div>

        {isAvailable ? (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-700 text-brand-800 hover:text-white font-bold text-xs transition-colors"
          >
            <span>Buka Aplikasi</span>
            <Icon name="arrow-right" className="size-3.5" />
          </Link>
        ) : (
          <span className="text-xs text-stone-400 italic">Dalam Integrasi</span>
        )}
      </div>
    </div>
  );
}
