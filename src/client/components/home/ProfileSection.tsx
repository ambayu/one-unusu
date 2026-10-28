import React from "react";
import { Badge } from "../ui/Badge";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";
import { faculties, studyPrograms } from "../../data/academics";
import { siteConfig } from "../../data/site";
import type { IconName } from "../../data/types";

const ecosystem: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "globe",
    title: "1 Website Universitas",
    description: "Pusat informasi resmi universitas.",
  },
  {
    icon: "building",
    title: `${faculties.length} Website Fakultas`,
    description: "Halaman khusus untuk setiap fakultas.",
  },
  {
    icon: "book",
    title: `${studyPrograms.length} Website Program Studi`,
    description: "Informasi kurikulum dan kegiatan prodi.",
  },
  {
    icon: "layers",
    title: "Website Lembaga & Satelit",
    description: "LPM, LPPM, E-Surat, LMS, dan Sarpras.",
  },
];

export function ProfileSection() {
  return (
    <section id="profil" aria-labelledby="profil-title" className="scroll-mt-24 bg-ivory py-20 sm:py-28">
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading id="profil-title" eyebrow="Profil Singkat" title={`Mengenal ${siteConfig.shortName}`} />

          <div className="mt-6 space-y-4 text-base leading-relaxed text-stone-600">
            <p>
              {siteConfig.name} ({siteConfig.shortName}) adalah perguruan tinggi Nahdlatul Ulama yang berada di
              Medan, Sumatera Utara. Melalui {siteConfig.platformName}, seluruh informasi dan layanan
              kampus dihadirkan dalam satu ekosistem digital yang terintegrasi secara profesional.
            </p>
            <p>
              Mengemban misi mencetak intelektual muslim berwawasan kebangsaan, berkarakter Aswaja An-Nahdliyah,
              serta berdaya saing global di bidang sains, teknologi, dan kemasyarakatan.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-gold-400 bg-gold-50/70 p-5">
            <div className="flex items-center gap-2">
              <Badge tone="gold">Nilai Luhur Aswaja</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              Menjunjung tinggi prinsip <em>Tawassuth</em> (moderat), <em>Tawazun</em> (seimbang),
              <em> Tasamuh</em> (toleran), dan <em>I'tidal</em> (tegak lurus) dalam seluruh tridharma perguruan tinggi.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-40px_rgba(6,34,23,0.35)] ring-1 ring-brand-100 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-xl font-semibold text-brand-950">
                Ekosistem {siteConfig.platformName}
              </h3>
              <Badge>{siteConfig.platformTagline}</Badge>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {ecosystem.map((item) => (
                <li
                  key={item.title}
                  className="group rounded-2xl border border-stone-100 bg-ivory/60 p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-700 text-gold-300 shadow-sm">
                    <Icon name={item.icon} className="size-5" />
                  </span>
                  <p className="mt-4 font-semibold text-brand-950">{item.title}</p>
                  <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
