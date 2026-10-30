import React, { useState, useEffect } from "react";
import { Container } from "../ui/Container";
import { assetUrl } from "../../lib/assets";
import { fetchSliders } from "../../services/api";

const defaultHeroSlides = [
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

const resolveImageUrl = (url?: string | null, fallback = "") => {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return assetUrl(trimmed);
};

export function HeroSection() {
  const [slides, setSlides] = useState(defaultHeroSlides);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetchSliders()
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.status && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const mapped = res.data.data.map((item) => {
            const imgDesktop = resolveImageUrl(item.gambarUrl);
            const imgMobile = item.gambarMobileUrl ? resolveImageUrl(item.gambarMobileUrl, imgDesktop) : imgDesktop;
            return {
              id: item.id,
              image: imgDesktop,
              imageMobile: imgMobile,
              title: item.judul,
            };
          });
          setSlides(mapped);
        }
      })
      .catch(() => {
        // Fallback ke defaultHeroSlides bila API offline / belum ada
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

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
        {slides.map((item, index) => (
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
              {slides.map((item, idx) => (
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

            {slides.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
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
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                  aria-label="Slide berikutnya"
                  className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-brand-950/70 text-white transition-colors hover:bg-brand-950"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
}
