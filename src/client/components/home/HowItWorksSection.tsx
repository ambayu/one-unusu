import React from "react";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";

const features = [
  {
    icon: "shield" as const,
    title: "Satu Akun untuk Semua (Single Sign-On)",
    description: "Cukup gunakan NIM bagi Mahasiswa dan NIDN bagi Dosen/Tendik untuk mengakses seluruh layanan kampus tanpa login ulang.",
  },
  {
    icon: "lock" as const,
    title: "Keamanan Kriptografi & Sesi Terenkripsi",
    description: "Pertukaran tiket otentikasi aman sekali pakai antara ONE UNUSU dengan server LMS, LPPM, LPM, dan E-Surat.",
  },
  {
    icon: "layers" as const,
    title: "Ekosistem Terintegrasi",
    description: "Menghubungkan tridharma perguruan tinggi, perkuliahan daring, persuratan dinas, dan audit mutu dalam satu kontrol terpusat.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="tentang" aria-labelledby="tentang-title" className="scroll-mt-24 bg-ivory py-20 sm:py-28">
      <Container>
        <SectionHeading
          id="tentang-title"
          eyebrow="Keamanan & Kemudahan"
          title="Bagaimana ONE UNUSU Bekerja?"
          description="Standar portal identitas modern yang dirancang untuk mempermudah akses dan menjaga keamanan data civitas kampus."
          align="center"
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {features.map((item, index) => (
            <div
              key={item.title}
              className="relative flex flex-col justify-between rounded-3xl bg-white p-8 border border-stone-200/90 shadow-xs hover:border-brand-300 transition-colors"
            >
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <Icon name={item.icon} className="size-6" />
                </span>
                <span className="mt-4 block font-mono text-xs font-bold text-gold-600">
                  0{index + 1}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold text-brand-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Panduan Login */}
        <div id="panduan" className="mt-16 rounded-3xl bg-brand-900 p-8 sm:p-12 text-white">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
              Panduan Akses Civitas
            </p>
            <h3 className="mt-3 font-display text-2xl sm:text-3xl font-semibold">
              Belum Memiliki Akun atau Mengalami Kendala?
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-brand-100/80">
              Akun SSO secara otomatis diterbitkan oleh <strong>Biro PUSTIK UNUSU</strong> berdasarkan data registrasi resmi akademik. Pastikan Anda menggunakan NIM / NIDN resmi yang terdaftar aktif.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 border border-white/10">
                <Icon name="mail" className="size-4 text-gold-300" />
                pustik@unusu.ac.id
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 border border-white/10">
                <Icon name="phone" className="size-4 text-gold-300" />
                Helpdesk PUSTIK Gaperta
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default HowItWorksSection;
