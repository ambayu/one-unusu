import React from "react";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { PlaceholderValue } from "../ui/PlaceholderValue";
import { SmartLink } from "../ui/SmartLink";
import { topbarLinks } from "../../data/navigation";
import { siteConfig } from "../../data/site";

export function Topbar() {
  const { contact } = siteConfig;

  return (
    <div className="hidden bg-brand-950 text-[0.78rem] text-brand-100/85 md:block border-b border-white/10">
      <Container className="flex h-10 items-center justify-between gap-6">
        <ul className="flex items-center gap-6" aria-label="Kontak universitas">
          <li className="flex items-center gap-2">
            <Icon name="phone" className="size-3.5 text-gold-300" />
            <span className="sr-only">Telepon:</span>
            <PlaceholderValue value={contact.phone} fallback="Telepon menunggu data resmi" />
          </li>
          <li className="flex items-center gap-2">
            <Icon name="mail" className="size-3.5 text-gold-300" />
            <span className="sr-only">Email:</span>
            <PlaceholderValue value={contact.email} fallback="Email menunggu data resmi" />
          </li>
        </ul>

        <nav aria-label="Tautan layanan cepat">
          <ul className="flex items-center divide-x divide-white/15">
            {topbarLinks.map((link) => (
              <li key={link.label} className="px-3 last:pr-0">
                <SmartLink
                  href={link.href}
                  external={link.external}
                  className="inline-flex items-center gap-1 font-medium text-white transition-colors hover:text-gold-300"
                  disabledClassName="inline-flex items-center gap-1 text-brand-100/50"
                  disabledHint={link.external ? "Tautan belum dikonfigurasi" : "Segera hadir"}
                >
                  {link.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </div>
  );
}
