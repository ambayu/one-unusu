import React from "react";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { Logo } from "../ui/Logo";
import { PlaceholderValue } from "../ui/PlaceholderValue";
import { SmartLink } from "../ui/SmartLink";
import { footerQuickLinks } from "../../data/navigation";
import { digitalServices } from "../../data/services";
import { siteConfig } from "../../data/site";
import type { IconName } from "../../data/types";

export function Footer() {
  const { contact } = siteConfig;

  const contactRows: { icon: IconName; label: string; value: string | null }[] = [
    { icon: "map-pin", label: "Alamat", value: contact.address },
    { icon: "phone", label: "Telepon", value: contact.phone },
    { icon: "mail", label: "Email", value: contact.email },
    { icon: "clock", label: "Jam layanan", value: contact.officeHours },
  ];

  return (
    <footer id="kontak" className="relative scroll-mt-24 overflow-hidden bg-brand-950 text-brand-100/80">
      <div aria-hidden="true" className="pattern-grid-dark absolute inset-0 opacity-60 pointer-events-none" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent"
      />

      <Container className="relative grid gap-12 py-16 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <Logo tone="dark" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed">
            {siteConfig.platformName} : {siteConfig.platformTagline}. Portal terpadu website
            universitas, fakultas, program studi, dan layanan digital {siteConfig.name}.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Media sosial">
            {siteConfig.social.map((item) => (
              <li key={item.label}>
                <SmartLink
                  href={item.href}
                  external
                  disabledHint="Akun belum dikonfigurasi"
                  className="inline-flex rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-gold-400 hover:text-gold-300"
                  disabledClassName="inline-flex rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-brand-100/45"
                >
                  {item.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </div>

        <FooterColumn title="Tautan Cepat" className="lg:col-span-2">
          {footerQuickLinks.map((link) => (
            <li key={link.label}>
              <SmartLink href={link.href} className="text-sm transition-colors hover:text-gold-300">
                {link.label}
              </SmartLink>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn
          title="Layanan Digital"
          className="lg:col-span-3"
          listClassName="grid grid-cols-2 gap-x-4 gap-y-3"
        >
          {digitalServices.map((service) => (
            <li key={service.id}>
              <SmartLink
                href={service.status === "available" ? service.url : null}
                external={service.url?.startsWith("http")}
                disabledHint={service.status === "available" ? "Tautan belum dikonfigurasi" : "Segera hadir"}
                className="text-sm transition-colors hover:text-gold-300"
                disabledClassName="text-sm text-brand-100/45"
              >
                {service.name}
              </SmartLink>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Kontak" className="lg:col-span-3">
          {contactRows.map((row) => (
            <li key={row.label} className="flex gap-3 text-sm">
              <Icon name={row.icon} className="mt-0.5 size-4 shrink-0 text-gold-300" />
              <span>
                <span className="sr-only">{row.label}: </span>
                <PlaceholderValue value={row.value} fallback={`${row.label} menunggu data resmi`} />
              </span>
            </li>
          ))}
        </FooterColumn>
      </Container>

      <div className="relative border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-brand-100/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {siteConfig.copyrightYear} {siteConfig.name}.
          </p>
          <p>Situs Satu Pintu Terpadu Civitas Kampus UNUSU</p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  className = "",
  listClassName = "space-y-3",
  children,
}: {
  title: string;
  className?: string;
  listClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">{title}</h2>
      <ul className={`mt-5 ${listClassName}`}>{children}</ul>
    </div>
  );
}
