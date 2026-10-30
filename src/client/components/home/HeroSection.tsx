import React, { useState, useEffect } from "react";
import { Container } from "../ui/Container";
import { assetUrl } from "../../lib/assets";

const heroSlides = [
  {
    id: 1,
    image: assetUrl("/assets/hero/hero-campus-1.png"),
    imageMobile: assetUrl("/assets/hero/hero-campus-1-mobile.png"),
    title: "Kampus Terpadu - Gedung Rektorat Gaperta",
  },
  {
    id: 2,
    image: assetUrl("/assets/hero/hero-students-2.png"),
    imageMobile: assetUrl("/assets/hero/hero-students-2-mobile.png"),
    title: "Aktivitas Akademik - Kolaborasi Mahasiswa",
  },
  {
    id: 3,
    image: assetUrl("/assets/hero/hero-digital-3.png"),
    imageMobile: assetUrl("/assets/hero/hero-digital-3-mobile.png"),
    title: "Fasilitas Teknologi - Laboratorium Komputasi",
  },
  {
    id: 4,
    image: assetUrl("/assets/hero/hero-library-4.png"),
    imageMobile: assetUrl("/assets/hero/hero-library-4-mobile.png"),
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
      className="relative isolate w-full overflow-hidden bg-brand-950 text-white md:flex md:h-[calc(100vh-5rem)] md:min-h-[550px] md:flex-col md:justify-end"
    >
      {/*
        Mobile: banner memakai aset mobile berukuran 1:1 sehingga tampil utuh tanpa ter-crop.
        Desktop: banner menutupi seluruh section (full-bleed) memakai aset 16:9.
      */}
      <div className="relative aspect-square w-full overflow-hidden md:absolute md:inset-0 md:aspect-auto md:h-full">
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

      {/* Judul visual sudah menyatu di dalam gambar banner */}
      <h1 id="hero-title" className="sr-only">
        ONE UNUSU - Portal SSO terpadu Universitas Nahdlatul Ulama Sumatera Utara
      </h1>

      {/* Navigasi slide */}
      <div className="relative z-10 py-5 md:pb-6">
        <Container>
          <div className="flex items-center justify-between gap-3">
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
                className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-brand-950/70 text-white transition-colors hover:bg-brand-950"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
                aria-label="Slide berikutnya"
                className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-brand-950/70 text-white transition-colors hover:bg-brand-950"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
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
