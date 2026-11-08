import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { mainNavigation } from "../data/navigation";
import { externalUrls } from "../data/site";
import { Container } from "../components/ui/Container";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Icon } from "../components/ui/Icon";
import {
  AppCatalogItem,
  DirectoryItem,
  fetchAppCatalog,
  fetchDirectories,
  getSsoRedirectV2,
} from "../services/api";
import { openTabTujuan, arahkanTab, tutupTab } from "../lib/ssoLaunch";

/**
 * Katalog aplikasi publik.
 *
 * Daftar TIDAK lagi memakai data statis: hanya aplikasi yang benar-benar
 * terhubung ke ONE UNUSU yang ditampilkan.
 * - Seksi SSO     : `GET /api/applications/catalog` (registry `sso_apps` aktif).
 * - Seksi Non-SSO : `GET /api/directories` (direktori publik yang aktif).
 * Dengan begitu katalog selalu mencerminkan kondisi integrasi sebenarnya.
 */

interface CatalogEntry {
  key: string;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: "shield" | "globe";
  image?: string | null;
  targetRoles?: string[];
  isSso: boolean;
  url?: string | null;
  /** Hanya terisi untuk entri SSO; dipakai menerbitkan tiket sekali pakai. */
  clientId?: string;
}

const isImageSource = (value?: string | null): boolean =>
  Boolean(
    value &&
      (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")),
  );

const toSsoEntry = (app: AppCatalogItem): CatalogEntry => ({
  key: `sso-${app.id}-${app.clientId}`,
  name: app.name,
  subtitle: app.clientId,
  description: app.description || "Layanan digital kampus yang terhubung ke SSO ONE UNUSU.",
  badge: app.badge || "Sistem",
  icon: "shield",
  image: isImageSource(app.icon) ? app.icon : null,
  targetRoles: app.targetRoles,
  isSso: true,
  url: null,
  clientId: app.clientId,
});

const toDirectoryEntry = (item: DirectoryItem): CatalogEntry => ({
  key: `dir-${item.id}`,
  name: item.nama,
  subtitle: item.kategori,
  description: item.deskripsi || "Portal mandiri di luar integrasi Single Sign-On.",
  badge: item.kategori || "Mandiri",
  icon: "globe",
  image: isImageSource(item.icon) ? item.icon : null,
  isSso: false,
  url: item.urlTarget,
});

export const AplikasiPage: React.FC = () => {
  const navigate = useNavigate();
  const [ssoApps, setSsoApps] = useState<CatalogEntry[]>([]);
  const [nonSsoApps, setNonSsoApps] = useState<CatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [launchingKey, setLaunchingKey] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [ssoResult, directoryResult] = await Promise.allSettled([
        fetchAppCatalog(),
        fetchDirectories(),
      ]);

      if (ssoResult.status === "fulfilled" && ssoResult.value.data.status) {
        setSsoApps(ssoResult.value.data.data.map(toSsoEntry));
      } else {
        setSsoApps([]);
      }

      if (directoryResult.status === "fulfilled" && directoryResult.value.data.status) {
        setNonSsoApps(directoryResult.value.data.data.map(toDirectoryEntry));
      } else {
        setNonSsoApps([]);
      }

      if (ssoResult.status === "rejected" && directoryResult.status === "rejected") {
        setErrorMessage(
          "Katalog aplikasi tidak dapat dimuat. Periksa koneksi ke server ONE UNUSU.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  /**
   * Membuka aplikasi cabang di tab baru.
   *
   * Halaman katalog dapat dibuka tanpa sesi, sehingga status masuk diperiksa
   * lebih dulu. Bila belum masuk, pengguna dikirim ke halaman login portal
   * dengan `next` menuju katalog ini — halaman katalog tidak punya hak
   * menerbitkan tiket SSO tanpa sesi.
   */
  const handleLaunch = useCallback(
    async (entry: CatalogEntry) => {
      if (!entry.clientId) return;

      const sesiAktif = Boolean(
        localStorage.getItem('one_unusu_token') || localStorage.getItem('one_unusu_user'),
      );
      if (!sesiAktif) {
        navigate(`/login?next=${encodeURIComponent('/aplikasi')}`);
        return;
      }

      // Jendela tujuan dibuka di dalam gestur klik; lihat `lib/ssoLaunch`.
      const tabTujuan = openTabTujuan();

      try {
        setLaunchingKey(entry.key);
        const res = await getSsoRedirectV2(entry.clientId);
        if (res.data.status && res.data.redirectUrl) {
          arahkanTab(tabTujuan, res.data.redirectUrl);
        } else {
          tutupTab(tabTujuan);
          setErrorMessage(
            res.data.message || "Akses ditolak. Anda tidak memiliki akses ke aplikasi ini.",
          );
        }
      } catch (err: any) {
        tutupTab(tabTujuan);
        setErrorMessage(
          err.response?.data?.message || "Gagal membuka aplikasi. Periksa sesi Anda lalu coba lagi.",
        );
      } finally {
        setLaunchingKey(null);
      }
    },
    [navigate],
  );

  const totalLayanan = useMemo(
    () => ssoApps.length + nonSsoApps.length,
    [ssoApps, nonSsoApps],
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />

      <main className="flex-1 py-16 sm:py-24 bg-[#F8FAF9]">
        <Container>
          <SectionHeading
            eyebrow="Portal Ekosistem Kampus"
            title="Katalog Aplikasi ONE UNUSU"
            description="Hanya aplikasi yang sudah benar-benar terhubung ke ONE UNUSU yang ditampilkan di sini. Aplikasi ber-SSO memakai akun NIM/NIDN yang sama, sedangkan portal mandiri tetap memakai kredensialnya sendiri."
          />

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {ssoApps.length} aplikasi terhubung SSO
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 font-semibold text-stone-700">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {nonSsoApps.length} portal mandiri
            </span>
            <span className="text-stone-500">Total {totalLayanan} layanan terdaftar</span>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              disabled={isLoading}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
            >
              <Icon name="clock" className="size-3.5" />
              {isLoading ? "Memuat…" : "Muat ulang"}
            </button>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {errorMessage}
            </div>
          )}

          <div className="mt-12 space-y-16">
            {/* Section 1: Aplikasi yang terhubung ke SSO ONE UNUSU */}
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-xl font-bold font-display text-brand-950">
                    Aplikasi Terintegrasi Single Sign-On (SSO)
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {ssoApps.length} Layanan
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-stone-500">
                  Login sekali menggunakan akun NIM / NIDN resmi
                </p>
              </div>

              {isLoading ? (
                <SkeletonGrid />
              ) : ssoApps.length === 0 ? (
                <EmptyState
                  title="Belum ada aplikasi yang terhubung"
                  description="Aplikasi cabang akan muncul di sini setelah didaftarkan pada panel Registrasi SSO ONE UNUSU."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {ssoApps.map((entry) => (
                    <AppCatalogCard
                      key={entry.key}
                      entry={entry}
                      onLaunch={handleLaunch}
                      launching={launchingKey === entry.key}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Portal mandiri / non-SSO dari direktori publik */}
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="size-3 rounded-full bg-amber-500" />
                  <h2 className="text-xl font-bold font-display text-stone-900">
                    Aplikasi Mandiri &amp; Eksternal (Non-SSO)
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {nonSsoApps.length} Layanan
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-stone-500">
                  Menggunakan kredensial terpisah atau akses publik langsung
                </p>
              </div>

              {isLoading ? (
                <SkeletonGrid />
              ) : nonSsoApps.length === 0 ? (
                <EmptyState
                  title="Belum ada portal mandiri terdaftar"
                  description="Portal non-SSO akan tampil setelah ditambahkan pada menu Aplikasi Non-SSO di panel administrasi."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {nonSsoApps.map((entry) => (
                    <AppCatalogCard
                      key={entry.key}
                      entry={entry}
                      onLaunch={handleLaunch}
                      launching={launchingKey === entry.key}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};

function SkeletonGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-2xl border border-stone-200 bg-white"
        >
          <div className="aspect-[16/10] bg-stone-200/70" />
          <div className="space-y-3 p-5">
            <div className="h-3.5 w-2/3 rounded bg-stone-200" />
            <div className="h-3 w-1/2 rounded bg-stone-200/80" />
            <div className="h-3 w-full rounded bg-stone-200/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
      <Icon name="layers" className="mx-auto size-8 text-stone-400" />
      <p className="mt-3 text-sm font-bold text-stone-700">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">{description}</p>
    </div>
  );
}

function AppCatalogCard({
  entry,
  onLaunch,
  launching,
}: {
  entry: CatalogEntry;
  onLaunch: (entry: CatalogEntry) => void;
  launching: boolean;
}) {
  const isSso = entry.isSso;

  return (
    <div
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl bg-white transition-all duration-200 border ${
        isSso
          ? "border-emerald-200/90 hover:border-emerald-500 shadow-xs hover:shadow-md"
          : "border-stone-200 hover:border-stone-400 shadow-xs hover:shadow-md"
      }`}
    >
      <div>
        {/* Banner Aplikasi */}
        <div className="relative aspect-[16/10] overflow-hidden bg-brand-950">
          {entry.image ? (
            <img
              src={entry.image}
              alt={`Tampilan ${entry.name}`}
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-102"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-900 text-white">
              <Icon name={entry.icon} className="size-12 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

          <div className="absolute top-3 left-3">
            <span className="rounded-md bg-brand-950/85 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/10 backdrop-blur-xs">
              {entry.badge}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            {isSso ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 text-white px-2.5 py-1 text-[10.5px] font-bold shadow-xs">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                <span>Terintegrasi SSO</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2.5 py-1 text-[10.5px] font-bold shadow-xs">
                <span>Eksternal / Non-SSO</span>
              </span>
            )}
          </div>
        </div>

        {/* Keterangan & Deskripsi */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-9 place-items-center rounded-lg border flex-shrink-0 ${
                isSso
                  ? "bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]"
                  : "bg-stone-100 text-stone-700 border-stone-200"
              }`}
            >
              <Icon name={entry.icon} className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-[#1E293B] group-hover:text-brand-700 transition-colors truncate">
                {entry.name}
              </h3>
              <p className="text-[11px] font-semibold text-[#64748B] truncate font-mono">
                {entry.subtitle}
              </p>
            </div>
          </div>

          <p className="text-xs text-[#475569] leading-relaxed line-clamp-3">{entry.description}</p>

          {entry.targetRoles && entry.targetRoles.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Akses:
              </span>
              {entry.targetRoles.map((role) => (
                <span
                  key={role}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Kartu & Tombol Aksi */}
      <div className="border-t border-stone-100 p-5 pt-3.5 flex items-center justify-between bg-stone-50/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {isSso ? (
            <div className="flex items-center gap-1.5 text-[#166534]">
              <Icon name="shield" className="size-3.5" />
              <span>Login Sekali (SSO)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-stone-500">
              <Icon name="external" className="size-3.5" />
              <span>Portal Terpisah</span>
            </div>
          )}
        </div>

        {isSso ? (
          <button
            type="button"
            onClick={() => onLaunch(entry)}
            disabled={launching}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-60 disabled:cursor-wait"
          >
            <span>{launching ? "Membuka Tab Baru…" : "Buka Aplikasi"}</span>
            <Icon name="external" className="size-3" />
          </button>
        ) : entry.url ? (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <span>Buka Portal</span>
            <Icon name="external" className="size-3" />
          </a>
        ) : (
          <span className="text-xs text-stone-400 italic">Segera Hadir</span>
        )}
      </div>
    </div>
  );
}
