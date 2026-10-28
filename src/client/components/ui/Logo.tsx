import React from "react";
import { Link } from "react-router-dom";
import { siteConfig } from "../../data/site";

type LogoProps = {
  tone?: "light" | "dark";
  compact?: boolean;
};

export function Logo({ tone = "light", compact = false }: LogoProps) {
  const dark = tone === "dark";

  return (
    <Link
      to="/"
      className="group flex items-center gap-3 rounded-lg"
      aria-label={`${siteConfig.platformName} : ${siteConfig.name}, ke beranda`}
    >
      <span
        aria-hidden="true"
        title="Logo UNUSU"
        className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 font-display text-lg font-bold text-gold-300 shadow-md ring-1 ring-gold-400/40"
      >
        U
        <span className="absolute -right-1 -bottom-1 size-3 rounded-full bg-gold-400 ring-2 ring-white" />
      </span>
      <span className="flex flex-col leading-tight" aria-hidden="true">
        <span
          className={`font-display text-lg font-semibold tracking-tight whitespace-nowrap ${
            dark ? "text-white" : "text-brand-950"
          }`}
        >
          {siteConfig.platformName}
        </span>
        <span
          className={`max-w-[15rem] text-[0.68rem] font-medium leading-snug ${
            compact ? "hidden sm:block" : ""
          } ${
            dark ? "text-brand-100/75" : "text-stone-500"
          }`}
        >
          {siteConfig.name}
        </span>
      </span>
    </Link>
  );
}
