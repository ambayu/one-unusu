import React from "react";
import { Badge, SampleBadge } from "../ui/Badge";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { ImagePlaceholder } from "../ui/ImagePlaceholder";
import { SectionHeading } from "../ui/SectionHeading";
import { formatDateId, parseIsoDate, sampleAgenda, sampleNews } from "../../data/news";
import type { AgendaItem, NewsItem } from "../../data/types";

export function NewsAgendaSection() {
  return (
    <section aria-labelledby="berita-title" className="bg-ivory py-20 sm:py-28">
      <Container>
        <div id="berita" className="scroll-mt-28">
          <SectionHeading
            id="berita-title"
            eyebrow="Kabar Kampus"
            title="Berita dan Agenda"
            description="Informasi aktual kegiatan tridharma, prestasi mahasiswa, dan kalender kegiatan universitas."
          />
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
            {sampleNews.map((item, index) => (
              <li key={item.id} className={index === 0 ? "sm:col-span-2" : ""}>
                <NewsCard item={item} featured={index === 0} />
              </li>
            ))}
          </ul>

          <aside id="agenda" aria-labelledby="agenda-title" className="scroll-mt-28 lg:col-span-4">
            <div className="h-full rounded-3xl bg-brand-900 p-6 text-white sm:p-8 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 id="agenda-title" className="font-display text-2xl font-semibold">
                  Agenda Kampus
                </h3>
                <Badge tone="inverse">Kegiatan</Badge>
              </div>
              <ol className="mt-6 space-y-4">
                {sampleAgenda.map((item) => (
                  <li key={item.id}>
                    <AgendaRow item={item} />
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}

function NewsCard({ item, featured }: { item: NewsItem; featured: boolean }) {
  return (
    <article
      className={`flex h-full overflow-hidden rounded-2xl border border-stone-200 bg-white ${
        featured ? "flex-col md:flex-row" : "flex-col"
      } shadow-xs hover:shadow-md transition-shadow`}
    >
      <ImagePlaceholder
        label="Foto kegiatan"
        compact
        className={featured ? "aspect-[16/9] md:aspect-auto md:w-1/2" : "aspect-[16/9]"}
      />
      <div className={`flex flex-1 flex-col p-6 ${featured ? "md:justify-center md:p-8" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{item.category}</Badge>
        </div>
        <h3
          className={`mt-4 font-display font-semibold text-brand-950 text-balance ${
            featured ? "text-2xl" : "text-lg"
          }`}
        >
          {item.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.excerpt}</p>
        <p className="mt-auto flex items-center gap-2 pt-5 text-xs text-stone-500">
          <Icon name="calendar" className="size-4 text-gold-600" />
          <time dateTime={item.date}>{formatDateId(item.date)}</time>
        </p>
      </div>
    </article>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  const date = parseIsoDate(item.date);

  return (
    <article className="flex gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10 transition-colors">
      {date ? (
        <time
          dateTime={item.date}
          className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gold-400 py-2 text-brand-950 font-bold"
        >
          <span className="font-display text-2xl leading-none">{date.day}</span>
          <span className="mt-1 text-[0.65rem] tracking-wider uppercase">
            {date.monthShort}
          </span>
        </time>
      ) : (
        <span className="flex w-14 shrink-0 items-center justify-center rounded-xl bg-gold-400 p-2 text-center text-xs text-brand-950">
          Tanggal
        </span>
      )}
      <div className="min-w-0">
        <h4 className="text-sm leading-snug font-semibold text-white">{item.title}</h4>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-100/70">
          <Icon name="clock" className="size-3.5 text-gold-300" />
          {item.time}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-100/70">
          <Icon name="map-pin" className="size-3.5 text-gold-300" />
          {item.location}
        </p>
      </div>
    </article>
  );
}
