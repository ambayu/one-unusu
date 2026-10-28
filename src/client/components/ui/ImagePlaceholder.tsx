import React from "react";
import { Icon } from "./Icon";

type ImagePlaceholderProps = {
  label: string;
  hint?: string;
  className?: string;
  tone?: "light" | "dark";
  compact?: boolean;
};

export function ImagePlaceholder({
  label,
  hint,
  className = "",
  tone = "light",
  compact = false,
}: ImagePlaceholderProps) {
  const dark = tone === "dark";

  return (
    <div
      role="img"
      aria-label={`Placeholder: ${label}`}
      className={`relative isolate flex items-center justify-center overflow-hidden ${
        dark ? "bg-brand-800 text-brand-100" : "bg-brand-50 text-brand-700"
      } ${className}`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 ${dark ? "pattern-grid-dark" : "pattern-grid"}`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-3 -z-10 rounded-[inherit] border-2 border-dashed ${
          dark ? "border-white/20" : "border-brand-300/70"
        }`}
      />
      <div className={`flex flex-col items-center text-center ${compact ? "gap-1 p-3" : "gap-3 p-6"}`}>
        <span
          className={`grid place-items-center rounded-full ${
            compact ? "size-9" : "size-14"
          } ${dark ? "bg-white/10" : "bg-white shadow-sm ring-1 ring-brand-100"}`}
        >
          <Icon name="building" className={compact ? "size-4" : "size-6"} />
        </span>
        <span
          className={`font-semibold uppercase tracking-[0.18em] ${
            compact ? "text-[0.6rem]" : "text-xs"
          }`}
        >
          Placeholder Foto
        </span>
        {!compact ? (
          <>
            <span className={`font-display text-lg ${dark ? "text-white" : "text-brand-900"}`}>
              {label}
            </span>
            {hint ? (
              <span className={`max-w-xs text-xs ${dark ? "text-brand-100/70" : "text-brand-700/80"}`}>
                {hint}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
