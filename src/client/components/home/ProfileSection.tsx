import React from "react";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";
import { siteConfig } from "../../data/site";
import { assetUrl } from "../../lib/assets";

const highlights = [
  "Satu kredensial, akses ke semua aplikasi",
  "Token SSO sekali pakai (single-use v2)",
  "Kendali akses berbasis peran dan izin",
];

export function ProfileSection() {
  return (
    <section id="profil" aria-labelledby="profil-title" className="scroll-mt-24 bg-ivory py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <SectionHeading
            id="profil-title"
            eyebrow="Tentang Platform"
            title={`Mengenal ${siteConfig.platformName}`}
          />

          <div className="mt-6 space-y-4 text-base leading-relaxed text-stone-600">
            <p>
              {siteConfig.platformName} adalah gerbang identitas digital tunggal yang menghubungkan
              seluruh ekosistem layanan {siteConfig.name} ke dalam satu pengalaman akses.
            </p>
            <p>
              Bukan sekadar katalog tautan, {siteConfig.platformName} mengelola autentikasi, izin per
              peran, dan penerbitan token SSO sehingga pengguna berpindah aplikasi tanpa perlu masuk
              berulang kali.
            </p>
          </div>

          <ul className="mt-6 space-y-2.5">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-stone-700">
                <span className="mt-0.5 grid size-5 flex-shrink-0 place-items-center rounded-full bg-brand-700 text-white">
                  <Icon name="shield" className="size-3" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual mahasiswa setengah badan dengan latar transparan */}
        <div className="lg:col-span-6">
          <div className="relative mx-auto flex max-w-md items-end justify-center">
            <div className="absolute inset-x-2 bottom-0 h-[78%] rounded-[32px] bg-gradient-to-tr from-brand-100 via-gold-100/60 to-transparent" />
            <img
              src={assetUrl("/assets/profil-mahasiswa.png")}
              alt="Mahasiswa menggunakan layanan digital ONE UNUSU"
              className="relative z-10 block w-full max-w-[380px] h-auto object-contain drop-shadow-[0_20px_40px_rgba(6,34,23,0.16)]"
              loading="lazy"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
