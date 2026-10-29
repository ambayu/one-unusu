import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { digitalServices } from "../../data/services";

const heroSlides = [
  {
    id: 1,
    image: "/assets/hero/hero-campus-1.png",
    imageMobile: "/assets/hero/hero-campus-1-mobile.png",
    title: "Kampus Terpadu - Gedung Rektorat Gaperta",
  },
  {
    id: 2,
    image: "/assets/hero/hero-students-2.png",
    imageMobile: "/assets/hero/hero-students-2-mobile.png",
    title: "Aktivitas Akademik - Kolaborasi Mahasiswa",
  },
  {
    id: 3,
    image: "/assets/hero/hero-digital-3.png",
    imageMobile: "/assets/hero/hero-digital-3-mobile.png",
    title: "Fasilitas Teknologi - Laboratorium Komputasi",
  },
  {
    id: 4,
    image: "/assets/hero/hero-library-4.png",
    imageMobile: "/assets/hero/hero-library-4-mobile.png",
    title: "Pusat Literasi - Perpustakaan Kampus",
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

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate w-full overflow-hidden bg-brand-950 text-white md:flex md:h-[calc(100vh-5rem)] md:min-h-[550px] md:flex-col md:justify-between"
    >
      {/*
        Mobile: banner memakai aset mobile berukuran 1:1 sehingga tampil utuh tanpa ter-crop.
        Desktop: banner menutupi seluruh section (full-bleed) memakai aset 16:9.
      */}
      <div className="relative aspect-square w-full overflow-hidden md:absolute md:inset-0 md:aspect-auto md:h-full md:-z-20">
        {heroSlides.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <picture>
              <source media="(max-width: 767px)" srcSet={item.imageMobile} />
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover object-center"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </picture>
          </div>
        ))}
      </div>

      {/* Scrim tipis hanya di desktop, untuk keterbacaan tombol di area bawah */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden bg-gradient-to-t from-brand-950/85 via-brand-950/20 to-transparent md:block"
      />

      {/* Judul visual sudah menyatu di dalam gambar banner */}
      <h1 id="hero-title" className="sr-only">
        ONE UNUSU - Portal SSO terpadu Universitas Nahdlatul Ulama Sumatera Utara
      </h1>

      {/* Ruang tengah kosong agar foto tampil penuh di desktop */}
      <div className="hidden md:block md:flex-1" />

      {/* Aksi & navigasi slide */}
      <div className="relative z-10 py-6 md:pb-8 md:pt-16">
        <Container>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-bold text-brand-950 shadow-xl shadow-black/40 transition-all hover:scale-105 hover:bg-gold-300 active:scale-95"
              >
                <Icon name="shield" className="size-4" />
                <span>Masuk SSO</span>
              </Link>
              <Link
                to="/aplikasi"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-black/60 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-black/80"
              >
                <Icon name="layers" className="size-4 text-gold-300" />
                <span>Katalog ({digitalServices.length})</span>
              </Link>
            </div>

            <div className="flex items-center justify-between gap-3 md:justify-end">
              <div className="flex items-center gap-1.5">
                {heroSlides.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Slide ${idx + 1}: ${item.title}`}
                    aria-current={idx === currentSlide}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide ? "w-6 bg-gold-400" : "w-2 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))
                  }
                  aria-label="Slide sebelumnya"
                  className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white transition-colors hover:bg-black/80"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
                  aria-label="Slide berikutnya"
                  className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white transition-colors hover:bg-black/80"
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
