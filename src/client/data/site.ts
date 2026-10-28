import type { ExternalLink } from "./types";
import { normalizeExternalUrl } from "../lib/urls";

export const siteConfig = {
  shortName: "UNUSU",
  name: "Universitas Nahdlatul Ulama Sumatera Utara",
  platformName: "ONE UNUSU",
  platformTagline: "Integrated Digital Campus",
  copyrightYear: 2026,

  contact: {
    address: "Jl. Gaperta Ujung, Helvetia, Medan, Sumatera Utara",
    phone: "+62 61 8440000",
    email: "info@unusu.ac.id",
    officeHours: "Senin - Jumat: 08.00 - 16.00 WIB",
  },

  heroImage: {
    src: null as string | null,
    alt: "Foto kampus Universitas Nahdlatul Ulama Sumatera Utara",
  },

  social: [
    { label: "Instagram", href: "https://instagram.com/unusu" },
    { label: "YouTube", href: null },
    { label: "Facebook", href: null },
    { label: "TikTok", href: null },
  ] satisfies ExternalLink[],
};

export const externalUrls = {
  siakad: normalizeExternalUrl("https://siakad.unusu.ac.id"),
  pmb: normalizeExternalUrl("https://pmb.unusu.ac.id"),
};

export const PLACEHOLDER_TEXT = "Menunggu data resmi";
