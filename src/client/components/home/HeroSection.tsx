import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { digitalServices } from "../../data/services";

const heroSlides = [
  {
    id: 1,
    image: "/assets/hero/hero-campus-1.png",
    tag: "Kampus Terpadu UNUSU",
    title: "Gedung Rektorat & Kampus Gaperta Medan",
  },
  {
    id: 2,
    image: "/assets/hero/hero-students-2.png",
    tag: "Aktivitas Akademik",
    title: "Kolaborasi & Ruang Belajar Mahasiswa",
  },
  {
    id: 3,
    image: "/assets/hero/hero-digital-3.png",
    tag: "Fasilitas Teknologi",
    title: "Laboratorium Komputasi & Multimedia",
  },
  {
    id: 4,
    image: "/assets/apps/app-lms.png",
    tag: "Ekosistem Satelit",
    title: "LMS & Layanan Digital Terintegrasi",
  },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[currentSlide];

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate h-[calc(100vh-5rem)] min-h-[550px] w-full flex flex-col justify-between overflow-hidden bg-brand-950 text-white"
    >
      {/* GAMBAR FULL SCREEN TINGGI MAKSIMAL (100% HEIGHT) & JERNIH */}
      <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
        {heroSlides.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover object-center"
            />
          </div>
        ))}
      </div>

      {/* OVERLAY SANGAT TIPIS HANYA DI ATAS & BAWAH SUPAYA FOTO TETAP TERANG DAN JERNIH */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-950/60 via-transparent to-brand-950/85 pointer-events-none"
      />

      {/* RUANG TENGAH KOSONG AGAR FOTO TAMPIL PENUH */}
      <div className="flex-1" />

      {/* KONTEN MINIMALIS MENEMPEL ELEGAN DI BAGIAN BAWAH */}
      <div className="relative z-10 pb-8 pt-16">
        <Container>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            {/* Teks Singkat & Bersih */}
            <div className="max-w-xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-950/70 border border-gold-400/50 px-3.5 py-1 text-xs font-bold text-gold-300 backdrop-blur-md uppercase tracking-wider">
                <span className="size-2 rounded-full bg-gold-400 animate-pulse" />
                <span>{slide.tag}</span>
              </div>
              
              <h1
                id="hero-title"
                className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
              >
                ONE UNUSU <span className="text-gold-300">Portal SSO</span>
              </h1>
              
              <p className="text-sm sm:text-base text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-medium">
                Satu akun untuk mengakses seluruh layanan akademik, administrasi, dan penjaminan mutu.
              </p>
            </div>

            {/* Tombol Aksi Cepat */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-bold text-brand-950 shadow-xl shadow-black/40 hover:bg-gold-300 transition-all hover:scale-105 active:scale-95"
              >
                <Icon name="shield" className="size-4" />
                <span>Masuk SSO</span>
              </Link>
              <Link
                to="/aplikasi"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black/60 border border-white/30 backdrop-blur-md px-6 py-3.5 text-sm font-semibold text-white hover:bg-black/80 transition-all"
              >
                <Icon name="layers" className="size-4 text-gold-300" />
                <span>Katalog ({digitalServices.length})</span>
              </Link>
            </div>

          </div>

          {/* Kontrol Navigasi Slide Bawah */}
          <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between">
            <span className="text-xs sm:text-sm text-white/80 font-medium drop-shadow">
              {slide.title}
            </span>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {heroSlides.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide ? "w-6 bg-gold-400" : "w-2 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
                  aria-label="Sebelumnya"
                  className="size-7 rounded-lg bg-black/50 border border-white/20 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
                  aria-label="Berikutnya"
                  className="size-7 rounded-lg bg-black/50 border border-white/20 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

        </Container>
      </div>

      {/* Garis Aksen Bawah */}
      <div aria-hidden="true" className="h-1 bg-gradient-to-r from-brand-700 via-gold-400 to-brand-700" />
    </section>
  );
}

export default HeroSection;
