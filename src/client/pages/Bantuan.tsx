import React, { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { mainNavigation } from "../data/navigation";
import { externalUrls } from "../data/site";
import { Container } from "../components/ui/Container";
import { Icon } from "../components/ui/Icon";
import { SectionHeading } from "../components/ui/SectionHeading";

const faqs = [
  {
    q: "Bagaimana cara mendapatkan akun ONE UNUSU?",
    a: "Akun diterbitkan secara otomatis oleh PUSTIK UNUSU saat mahasiswa atau dosen/tendik resmi terdaftar di pangkalan data kampus. Mahasiswa menggunakan NIM, sedangkan Dosen dan Tendik menggunakan NIDN atau NIP.",
  },
  {
    q: "Apa yang harus dilakukan jika lupa kata sandi?",
    a: "Silakan hubungi Helpdesk PUSTIK UNUSU dengan menyertakan foto identitas resmi (KTM bagi mahasiswa atau KTP/Kartu Pegawai bagi staf). Tim PUSTIK akan mereset dan memandu verifikasi data akun Anda.",
  },
  {
    q: "Aplikasi apa saja yang dapat diakses dengan akun ini?",
    a: "Satu akun berlaku untuk seluruh sistem UNUSU, antara lain: LMS UNUSU (kuliah daring), E-Surat UNUSU (administrasi naskah dinas), LPM UNUSU (penjaminan mutu & audit), LPPM UNUSU (penelitian & pengabdian), serta SDM & Sarpras.",
  },
  {
    q: "Apakah saya perlu login berulang saat membuka aplikasi lain?",
    a: "Tidak. Selama sesi login Anda masih aktif di portal ONE UNUSU, Anda dapat membuka aplikasi satelit secara instan tanpa perlu memasukkan username dan kata sandi kembali.",
  },
];

export const BantuanPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-12 sm:py-16">
        <Container>
          <SectionHeading
            eyebrow="Pusat Bantuan & Layanan"
            title="Pusat Bantuan Civitas UNUSU"
            description="Temukan jawaban cepat atas pertanyaan seputar akun, kendala login, atau hubungi kontak layanan teknis PUSTIK."
            align="center"
          />

          {/* Kartu Kontak Cepat */}
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col items-center text-center">
              <div className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name="mail" className="size-6" />
              </div>
              <h3 className="mt-4 font-bold text-brand-950">Email Helpdesk</h3>
              <p className="mt-1 text-xs text-stone-500">Layanan tiket perbaikan akun & reset sandi</p>
              <a
                href="mailto:pustik@unusu.ac.id"
                className="mt-3 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                pustik@unusu.ac.id
              </a>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col items-center text-center">
              <div className="grid size-12 place-items-center rounded-xl bg-gold-50 text-gold-700">
                <Icon name="phone" className="size-6" />
              </div>
              <h3 className="mt-4 font-bold text-brand-950">Layanan Kampus</h3>
              <p className="mt-1 text-xs text-stone-500">Gedung Rektorat & Administrasi Terpadu</p>
              <span className="mt-3 text-sm font-semibold text-stone-700">
                Kampus Gaperta, Kota Medan
              </span>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col items-center text-center">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon name="shield" className="size-6" />
              </div>
              <h3 className="mt-4 font-bold text-brand-950">Jam Operasional</h3>
              <p className="mt-1 text-xs text-stone-500">Senin - Jumat (08.30 - 16.30 WIB)</p>
              <span className="mt-3 text-sm font-semibold text-emerald-700">
                Sistem Aktif 24/7
              </span>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="mt-14 max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-brand-950 text-center mb-6">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-brand-950 hover:bg-stone-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <Icon
                      name="chevron-down"
                      className={`size-4 text-stone-500 transition-transform duration-200 ${
                        openIndex === idx ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openIndex === idx && (
                    <div className="px-5 pb-5 pt-1 text-sm text-stone-600 border-t border-stone-100 leading-relaxed bg-stone-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};

export default BantuanPage;
