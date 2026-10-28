import React from "react";

type SectionHeadingProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  action?: React.ReactNode;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  action,
}: SectionHeadingProps) {
  const centered = align === "center";
  const dark = tone === "dark";

  return (
    <div
      className={`flex flex-col gap-6 ${
        centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"
      }`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        <p
          className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] ${
            centered ? "justify-center" : ""
          } ${dark ? "text-gold-300" : "text-gold-700"}`}
        >
          <span aria-hidden="true" className="h-px w-8 bg-current" />
          {eyebrow}
        </p>
        <h2
          id={id}
          className={`mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl ${
            dark ? "text-white" : "text-brand-950"
          }`}
        >
          {title}
        </h2>
        {description ? (
          <div
            className={`mt-4 text-base leading-relaxed text-pretty ${
              dark ? "text-brand-100/80" : "text-stone-600"
            }`}
          >
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
