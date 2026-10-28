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

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {digitalServices.map((service) => (
              <div
                key={service.id}
                className="group flex flex-col justify-between overflow-hidden rounded-[16px] border border-brand-100 bg-white shadow-xs hover:border-brand-200 hover:shadow-sm transition-all duration-200"
              >
                <div>
                  {/* Foto UI Mockup Aplikasi */}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-3 left-3">
                      <span className="rounded-[6px] bg-brand-950/80 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/10">
                        {service.badge || "Sistem"}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      {service.status === "available" ? (
                        <span className="rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] px-2.5 py-0.5 text-[10px] font-bold">
                          Terkoneksi
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-2.5 py-0.5 text-[10px] font-bold">
                          Segera
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-[8px] bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]">
                        <Icon name={service.icon} className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-lg text-[#1E293B] group-hover:text-[#166534] transition-colors">
                          {service.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#64748B]">
                          {service.fullName}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                      {service.description}
                    </p>

                    {/* Target Roles */}
                    {service.targetRoles && (
                      <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                          Akses:
                        </span>
                        {service.targetRoles.map((role) => (
                          <span
                            key={role}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-[4px] bg-brand-50 text-[#475569] border border-brand-100"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="border-t border-brand-100 p-6 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
                    <Icon name="shield" className="size-3.5 text-[#166534]" />
                    <span>Single Sign-On</span>
                  </div>

                  {service.status === "available" ? (
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs transition-colors shadow-xs"
                    >
                      <span>Masuk via SSO</span>
                      <Icon name="arrow-right" className="size-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-[#94A3B8] italic">Dalam Integrasi</span>
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
