import React, { useEffect, useRef, useState, FocusEvent } from "react";
import { Link } from "react-router-dom";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { Logo } from "../ui/Logo";
import { SmartLink } from "../ui/SmartLink";
import type { NavItem, NavLink } from "../../data/types";
import { normalizeExternalUrl } from "../../lib/urls";

type NavbarProps = {
  items: NavItem[];
  registerUrl: string | null;
};

const disabledHintFor = (link: NavLink) =>
  link.external ? "Tautan belum dikonfigurasi" : "Halaman segera hadir";

export function Navbar({ items, registerUrl }: NavbarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!openMenu && !mobileOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        if (mobilePanelRef.current?.contains(document.activeElement)) {
          mobileToggleRef.current?.focus();
        }
        setOpenMenu(null);
        setMobileOpen(false);
        setMobileSection(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (openMenu) {
        triggerRefs.current[openMenu]?.focus();
        setOpenMenu(null);
      } else if (mobileOpen) {
        setMobileOpen(false);
        setMobileSection(null);
        mobileToggleRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu, mobileOpen]);

  const handleNavBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setMobileOpen(false);
      setMobileSection(null);
    }
  };

  const handleDropdownBlur = (id: string) => (event: FocusEvent<HTMLLIElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null) && openMenu === id) {
      setOpenMenu(null);
    }
  };

  const closeAll = () => {
    if (mobileOpen) mobileToggleRef.current?.focus();
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileSection(null);
  };

  return (
    <header
      ref={navRef}
      onBlur={handleNavBlur}
      className={`sticky top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-brand-100 bg-white/95 shadow-[0_8px_30px_-12px_rgba(6,34,23,0.25)] backdrop-blur"
          : "border-transparent bg-white"
      }`}
    >
      <Container className="flex h-20 items-center justify-between gap-6">
        <Logo compact />

        {/* Desktop navigation */}
        <nav ref={desktopNavRef} aria-label="Navigasi utama" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {items.map((item) =>
              item.children ? (
                <li key={item.id} className="relative" onBlur={handleDropdownBlur(item.id)}>
                  <button
                    ref={(element) => {
                      triggerRefs.current[item.id] = element;
                    }}
                    type="button"
                    aria-expanded={openMenu === item.id}
                    aria-controls={`menu-${item.id}`}
                    onClick={() => setOpenMenu((current) => (current === item.id ? null : item.id))}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-[0.9rem] whitespace-nowrap font-medium transition-colors ${
                      openMenu === item.id
                        ? "bg-brand-50 text-brand-800"
                        : "text-stone-700 hover:bg-brand-50 hover:text-brand-800"
                    }`}
                  >
                    {item.label}
                    <Icon
                      name="chevron-down"
                      className={`size-4 transition-transform duration-200 ${
                        openMenu === item.id ? "rotate-180 text-gold-600" : "text-stone-400"
                      }`}
                    />
                  </button>

                  <div
                    id={`menu-${item.id}`}
                    hidden={openMenu !== item.id}
                    className="absolute top-full left-1/2 mt-3 w-72 -translate-x-1/2"
                  >
                    <ul className="animate-dropdown max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain rounded-2xl border border-brand-100 bg-white p-2 shadow-[0_24px_60px_-20px_rgba(6,34,23,0.35)]">
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <SmartLink
                            href={child.href}
                            external={child.external}
                            onClick={closeAll}
                            disabledHint={disabledHintFor(child)}
                            className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-50"
                            disabledClassName="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 opacity-60"
                          >
                            <DropdownItemContent link={child} />
                          </SmartLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ) : (
                <li key={item.id}>
                  <SmartLink
                    href={item.href ?? null}
                    className="block rounded-lg px-2.5 py-2 text-[0.9rem] whitespace-nowrap font-medium text-stone-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
                  >
                    {item.label}
                  </SmartLink>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* SSO Portal Button */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/80 hover:bg-brand-100 text-brand-900 px-3.5 py-2 text-xs font-bold transition shadow-xs"
          >
            <Icon name="shield" className="size-3.5 text-brand-700" />
            <span>Login SSO</span>
          </Link>

          <RegisterButton href={registerUrl} className="hidden sm:inline-flex" />

          <button
            ref={mobileToggleRef}
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => {
              setMobileOpen((open) => !open);
              setMobileSection(null);
            }}
            className="grid size-11 place-items-center rounded-xl border border-brand-100 text-brand-800 transition-colors hover:bg-brand-50 lg:hidden"
          >
            <Icon name={mobileOpen ? "close" : "menu"} className="size-5" />
            <span className="sr-only">{mobileOpen ? "Tutup menu" : "Buka menu"}</span>
          </button>
        </div>
      </Container>

      {/* Mobile navigation */}
      <div
        ref={mobilePanelRef}
        id="mobile-menu"
        hidden={!mobileOpen}
        className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-brand-100 bg-white lg:hidden"
      >
        <Container className="py-4">
          <nav aria-label="Navigasi utama (seluler)">
            <ul className="divide-y divide-stone-100">
              {items.map((item) =>
                item.children ? (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-expanded={mobileSection === item.id}
                      aria-controls={`mobile-section-${item.id}`}
                      onClick={() =>
                        setMobileSection((current) => (current === item.id ? null : item.id))
                      }
                      className="flex w-full items-center justify-between py-3.5 text-left font-medium text-stone-800"
                    >
                      {item.label}
                      <Icon
                        name="chevron-down"
                        className={`size-5 text-stone-400 transition-transform ${
                          mobileSection === item.id ? "rotate-180 text-gold-600" : ""
                        }`}
                      />
                    </button>
                    <ul
                      id={`mobile-section-${item.id}`}
                      hidden={mobileSection !== item.id}
                      className="mb-3 space-y-1 rounded-xl bg-brand-50/60 p-2"
                    >
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <SmartLink
                            href={child.href}
                            external={child.external}
                            onClick={closeAll}
                            disabledHint={disabledHintFor(child)}
                            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-700 hover:bg-white"
                            disabledClassName="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-500"
                          >
                            <DropdownItemContent link={child} compact />
                          </SmartLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={item.id}>
                    <SmartLink
                      href={item.href ?? null}
                      onClick={closeAll}
                      className="block py-3.5 font-medium text-stone-800"
                    >
                      {item.label}
                    </SmartLink>
                  </li>
                ),
              )}
            </ul>
          </nav>
          <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={closeAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white"
            >
              <Icon name="shield" className="size-4" />
              Masuk Portal SSO
            </Link>
            <RegisterButton href={registerUrl} className="flex w-full" />
          </div>
        </Container>
      </div>
    </header>
  );
}

function DropdownItemContent({ link, compact = false }: { link: NavLink; compact?: boolean }) {
  const unavailable = !(link.external ? normalizeExternalUrl(link.href) : link.href);

  return (
    <>
      <span className="flex flex-col">
        <span className={`text-sm font-medium ${unavailable ? "text-stone-500" : "text-stone-800"}`}>
          {link.label}
        </span>
        {link.description && !compact ? (
          <span className="text-xs text-stone-500">{link.description}</span>
        ) : null}
      </span>
      {unavailable ? (
        <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] font-semibold text-stone-500 uppercase">
          Segera
        </span>
      ) : link.external ? (
        <Icon name="external" className="mt-0.5 size-3.5 shrink-0 text-stone-400" />
      ) : null}
    </>
  );
}

function RegisterButton({ href, className = "" }: { href: string | null; className?: string }) {
  return (
    <SmartLink
      href={href}
      external
      disabledHint="Tautan PMB belum dikonfigurasi"
      className={`items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-brand-950 shadow-sm transition-colors hover:bg-gold-300 ${className}`}
      disabledClassName={`items-center justify-center gap-2 rounded-xl border border-dashed border-gold-400 bg-gold-50 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-gold-700 ${className}`}
    >
      <Icon name="graduation" className="size-4" />
      Daftar Kuliah
    </SmartLink>
  );
}
