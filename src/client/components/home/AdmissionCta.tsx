import React from "react";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { SmartLink } from "../ui/SmartLink";
import { externalUrls, siteConfig } from "../../data/site";

export function AdmissionCta() {
  return (
    <section aria-labelledby="pmb-title" className="bg-white py-16 sm:py-20">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-gold-50 via-white to-brand-50 p-8 ring-1 ring-gold-200 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-gold-300/30 blur-3xl pointer-events-none"
          />
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-700 uppercase">
              Penerimaan Mahasiswa Baru
            </p>
            <h2
              id="pmb-title"
              className="mt-3 font-display text-3xl font-semibold tracking-tight text-brand-950 text-balance sm:text-4xl"
            >
              Mulai perjalanan akademik Anda di {siteConfig.shortName}
            </h2>
            <p className="mt-4 text-stone-600">
              Informasi jadwal, beasiswa, jalur pendaftaran reguler dan prestasi tersedia melalui aplikasi PMB
              resmi universitas.
            </p>
          </div>
          <div className="mt-8 flex shrink-0 flex-col gap-2 lg:mt-0">
            <SmartLink
              href={externalUrls.pmb}
              external
              disabledHint="Tautan PMB belum dikonfigurasi"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition-colors hover:bg-brand-800"
              disabledClassName="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-white px-7 py-4 text-sm font-semibold text-brand-700/70"
            >
              <Icon name="graduation" className="size-5" />
              Daftar Kuliah
            </SmartLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
