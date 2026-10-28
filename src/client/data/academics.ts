import type { Faculty, StudyProgram } from "./types";

export const academicDataStatus = {
  source: "project-owner",
  validation: "pending-administrative",
} as const;

export const faculties: Faculty[] = [
  { id: "fakultas-1", slug: "fakultas-ilmu-komputer", order: 1, name: "Fakultas Ilmu Komputer", websiteUrl: null },
  { id: "fakultas-2", slug: "fakultas-ilmu-pendidikan", order: 2, name: "Fakultas Ilmu Pendidikan", websiteUrl: null },
  { id: "fakultas-3", slug: "fakultas-ekonomi", order: 3, name: "Fakultas Ekonomi", websiteUrl: null },
  { id: "fakultas-4", slug: "fakultas-pertanian", order: 4, name: "Fakultas Pertanian", websiteUrl: null },
  { id: "fakultas-5", slug: "fakultas-ilmu-kesehatan", order: 5, name: "Fakultas Ilmu Kesehatan", websiteUrl: null },
  { id: "fakultas-6", slug: "fakultas-agama-islam", order: 6, name: "Fakultas Agama Islam", websiteUrl: null },
];

export const studyPrograms: StudyProgram[] = [
  { id: "prodi-1", slug: "teknik-informatika", order: 1, name: "Teknik Informatika", degree: "S1", facultyId: "fakultas-1", websiteUrl: null },
  { id: "prodi-2", slug: "sistem-informasi", order: 2, name: "Sistem Informasi", degree: "S1", facultyId: "fakultas-1", websiteUrl: null },
  { id: "prodi-3", slug: "ilmu-komputer", order: 3, name: "Ilmu Komputer", degree: "S1", facultyId: "fakultas-1", websiteUrl: null },
  { id: "prodi-4", slug: "pendidikan-guru-sekolah-dasar-pgsd", order: 4, name: "Pendidikan Guru Sekolah Dasar (PGSD)", degree: "S1", facultyId: "fakultas-2", websiteUrl: null },
  { id: "prodi-5", slug: "manajemen", order: 5, name: "Manajemen", degree: "S1", facultyId: "fakultas-3", websiteUrl: null },
  { id: "prodi-6", slug: "agribisnis", order: 6, name: "Agribisnis", degree: "S1", facultyId: "fakultas-4", websiteUrl: null },
  { id: "prodi-7", slug: "ilmu-dan-teknologi-pangan", order: 7, name: "Ilmu dan Teknologi Pangan", degree: "S1", facultyId: "fakultas-4", websiteUrl: null },
  { id: "prodi-8", slug: "budidaya-pertanian", order: 8, name: "Budidaya Pertanian", degree: "S1", facultyId: "fakultas-4", websiteUrl: null },
  { id: "prodi-9", slug: "ilmu-gizi", order: 9, name: "Ilmu Gizi", degree: "S1", facultyId: "fakultas-5", websiteUrl: null },
  { id: "prodi-10", slug: "d3-analisis-kesehatan", order: 10, name: "Analisis Kesehatan", degree: "D3", facultyId: "fakultas-5", websiteUrl: null },
  { id: "prodi-11", slug: "pendidikan-islam-anak-usia-dini", order: 11, name: "Pendidikan Islam Anak Usia Dini", degree: "S1", facultyId: "fakultas-6", websiteUrl: null },
  { id: "prodi-12", slug: "pendidikan-agama-islam", order: 12, name: "Pendidikan Agama Islam", degree: "S1", facultyId: "fakultas-6", websiteUrl: null },
  { id: "prodi-13", slug: "hukum-keluarga-islam", order: 13, name: "Hukum Keluarga Islam", degree: "S1", facultyId: "fakultas-6", websiteUrl: null },
  { id: "prodi-14", slug: "studi-islam", order: 14, name: "Studi Islam", degree: "S1", facultyId: "fakultas-6", websiteUrl: null },
];

export function formatOrder(order: number): string {
  return String(order).padStart(2, "0");
}

export function programsByFaculty(facultyId: string): StudyProgram[] {
  return studyPrograms.filter((program) => program.facultyId === facultyId);
}

export const ACADEMIC_ROUTES = {
  faculties: "/fakultas",
  programs: "/prodi",
} as const;

export function facultyHref(faculty: Pick<Faculty, "slug">): string {
  return `/fakultas`;
}

export function programHref(program: Pick<StudyProgram, "slug">): string {
  return `/prodi`;
}

export function facultyDisplayName(faculty: Faculty): string {
  return faculty.name ?? `Fakultas ${formatOrder(faculty.order)}`;
}

export function programDisplayName(program: StudyProgram): string {
  return program.name ?? `Program Studi ${formatOrder(program.order)}`;
}

export function programFullName(program: StudyProgram): string {
  const name = programDisplayName(program);
  return program.degree ? `${program.degree} ${name}` : name;
}
