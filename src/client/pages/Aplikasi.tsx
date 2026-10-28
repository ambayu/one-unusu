import React from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { mainNavigation } from "../data/navigation";
import { externalUrls } from "../data/site";
import { digitalServices } from "../data/services";
import { Container } from "../components/ui/Container";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";

export const AplikasiPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Portal Ekosistem"
            title="Katalog Aplikasi Terintegrasi ONE UNUSU"
            description="Daftar lengkap sistem akademik, riset, administrasi persuratan, dan penjaminan mutu yang terhubung dalam Single Sign-On (SSO)."
          />

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {digitalServices.map((service) => (
              <div
                key={service.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs hover:border-brand-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  {/* Foto UI Mockup Aplikasi */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-brand-950">
                    {service.image ? (
                      <img
                        src={service.image}
                        alt={`Screenshot ${service.name}`}
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-900 text-gold-300">
                        <Icon name={service.icon} className="size-12 opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-3 left-3">
                      <span className="rounded-lg bg-brand-950/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md border border-white/10">
                        {service.badge || "Sistem"}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      {service.status === "available" ? (
                        <Badge tone="inverse-success">Terkoneksi</Badge>
                      ) : (
                        <Badge tone="inverse-gold">Segera</Badge>
                      )}
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                        <Icon name={service.icon} className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-display text-xl font-bold text-brand-950 group-hover:text-brand-700 transition-colors">
                          {service.name}
                        </h3>
                        <p className="text-xs font-semibold text-gold-600">
                          {service.fullName}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {service.description}
                    </p>

                    {/* Target Roles */}
                    {service.targetRoles && (
                      <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Akses:
                        </span>
                        {service.targetRoles.map((role) => (
                          <span
                            key={role}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="border-t border-stone-100 p-6 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
                    <Icon name="shield" className="size-3.5 text-brand-600" />
                    <span>Single Sign-On</span>
                  </div>

                  {service.status === "available" ? (
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      <span>Masuk via SSO</span>
                      <Icon name="arrow-right" className="size-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-stone-400 italic">Dalam Integrasi</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
export default AplikasiPage;
