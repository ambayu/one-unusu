import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { PlaceholderValue } from "../ui/PlaceholderValue";
import { SectionHeading } from "../ui/SectionHeading";
import { SmartLink } from "../ui/SmartLink";
import {
  ACADEMIC_ROUTES,
  faculties,
  facultyHref,
  formatOrder,
  programHref,
  programsByFaculty,
  studyPrograms,
} from "../../data/academics";
import { normalizeExternalUrl } from "../../lib/urls";

export function AcademicSection() {
  return (
    <section aria-labelledby="fakultas-title" className="bg-white py-20 sm:py-28">
      <Container>
        {/* Faculties */}
        <div id="fakultas" className="scroll-mt-28">
          <SectionHeading
            id="fakultas-title"
            eyebrow="Akademik"
            title={`${faculties.length} Fakultas`}
            description="Fakultas unggulan yang menaungi 14 program studi dalam ekosistem akademik terpadu ONE UNUSU."
            action={<ViewAllLink href={ACADEMIC_ROUTES.faculties} label="Semua fakultas" />}
          />

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {faculties.map((faculty) => {
              const programCount = programsByFaculty(faculty.id).length;
              return (
                <li
                  key={faculty.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_24px_50px_-30px_rgba(6,34,23,0.45)]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 to-gold-400 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <Icon name="building" className="size-6" />
                    </span>
                    <span className="font-display text-3xl font-semibold text-brand-100" aria-hidden="true">
                      {formatOrder(faculty.order)}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-brand-950">
                    <Link to={facultyHref(faculty)} className="hover:text-brand-700 hover:underline">
                      <PlaceholderValue
                        value={faculty.name}
                        fallback={`Fakultas ${formatOrder(faculty.order)}`}
                      />
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-stone-500">
                    {programCount > 0 ? `${programCount} program studi` : "Daftar prodi menunggu data"}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                    <Link
                      to={facultyHref(faculty)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
                    >
                      Profil fakultas
                      <Icon name="arrow-right" className="size-4" />
                    </Link>
                    <SmartLink
                      href={faculty.websiteUrl}
                      external
                      disabledHint="Website fakultas segera hadir"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
                      disabledClassName="inline-flex items-center gap-1.5 text-sm font-medium text-stone-400"
                    >
                      Website fakultas
                      {!normalizeExternalUrl(faculty.websiteUrl) ? <Badge tone="neutral">Segera</Badge> : null}
                    </SmartLink>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Study programs */}
        <div id="prodi" className="mt-24 scroll-mt-28">
          <SectionHeading
            eyebrow="Program Studi"
            title={`${studyPrograms.length} Program Studi`}
            description="Program sarjana dan vokasi terakreditasi untuk menghasilkan lulusan yang siap kerja dan berakhlak mulia."
            action={<ViewAllLink href={ACADEMIC_ROUTES.programs} label="Semua program studi" />}
          />

          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {studyPrograms.map((program) => {
              const faculty = faculties.find((item) => item.id === program.facultyId);
              return (
                <li
                  key={program.id}
                  className="flex items-center gap-4 rounded-xl border border-stone-200 bg-ivory/50 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white font-display text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
                    {formatOrder(program.order)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Link
                      to={programHref(program)}
                      className="wrap-anywhere text-sm font-semibold text-brand-950 hover:text-brand-700 hover:underline"
                    >
                      <PlaceholderValue value={program.name} fallback={`Prodi ${formatOrder(program.order)}`} />
                    </Link>
                    <span className="wrap-anywhere text-xs text-stone-500">
                      {program.degree ?? "S1"} · {faculty?.name ?? "Fakultas"}
                    </span>
                    <SmartLink
                      href={program.websiteUrl}
                      external
                      showExternalIcon
                      disabledHint="Website prodi belum tersedia"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900"
                      disabledClassName="mt-2 inline-flex flex-wrap items-center gap-1.5 text-xs text-stone-500"
                    >
                      Website prodi
                      {!normalizeExternalUrl(program.websiteUrl) ? <Badge tone="neutral">Belum tersedia</Badge> : null}
                    </SmartLink>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="inline-flex items-center gap-2 rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
    >
      {label}
      <Icon name="arrow-right" className="size-4" />
    </Link>
  );
}
