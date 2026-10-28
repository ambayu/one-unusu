import React from "react";

type BadgeTone = "brand" | "gold" | "neutral" | "sample" | "inverse" | "inverse-success" | "inverse-gold";

const tones: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  gold: "bg-gold-50 text-gold-700 ring-gold-200",
  neutral: "bg-stone-100 text-stone-600 ring-stone-200",
  sample: "bg-amber-50 text-amber-800 ring-amber-300 border-dashed",
  inverse: "bg-white/10 text-white ring-white/25",
  "inverse-success": "bg-brand-500/20 text-brand-100 ring-brand-400/40",
  "inverse-gold": "bg-white/10 text-gold-300 ring-white/25",
};

type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export function Badge({ children, tone = "brand", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <Badge tone="sample" className={className}>
      Contoh
    </Badge>
  );
}
