"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Globe, HeartPulse, LogIn, LogOut, Mail, Menu, Phone, UserRound, X } from "lucide-react";
import { useT, LANGS } from "@/i18n";
import { useAuth, homeFor } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { btnClass } from "./kit";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export function Logo({ className }) {
  const { t } = useT();
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-display text-lg font-bold", className)}>
      <span className="grid size-9 place-items-center rounded-lg bg-hero text-primary-foreground">
        <HeartPulse className="size-5" aria-hidden />
      </span>
      {t("common.appName")}
    </Link>
  );
}

export function LangSwitch({ align = "end" }) {
  const { t, lang, setLang } = useT();
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-muted"
        aria-label={`${t("common.language")}: ${current.label}`}
      >
        <Globe className="size-4 text-muted-foreground" aria-hidden />
        {current.label}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
          {LANGS.map((l) => (
            <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.code}>
              {l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountLink({ onNavigate, mobile = false }) {
  const { t } = useT();
  const { user, roles, loading } = useAuth();
  if (loading) return <span className="h-11 w-24" aria-hidden />;
  if (user)
    return (
      <Link href={homeFor(roles)} onClick={onNavigate} className={btnClass("primary")}>
        <UserRound className="size-4" aria-hidden />
        {t("common.myAccount")}
      </Link>
    );
  return (
    <span className="flex items-center gap-2">
      <Link href="/register" onClick={onNavigate} className={btnClass("outline", mobile ? "" : "hidden lg:inline-flex")}>
        {t("register.short")}
      </Link>
      <Link href="/login" onClick={onNavigate} className={btnClass("primary")}>
        {t("common.signIn")}
      </Link>
    </span>
  );
}

export function SkipLink() {
  const { t } = useT();
  return (
    <a
      href="#main"
      className="sr-only z-[60] focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg"
    >
      {t("common.skip")}
    </a>
  );
}

export function SiteHeader() {
  const { t } = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/", label: t("common.home") },
    { href: "/doctors", label: t("nav.findDoctors") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];
  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <SkipLink />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label={t("nav.main")} className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn("rounded-md px-3 py-2 font-medium hover:text-foreground", isActive(l.href) ? "text-primary" : "text-muted-foreground")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <LangSwitch />
          <AccountLink />
        </div>
        <button
          type="button"
          className="rounded-md p-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t("common.closeMenu") : t("common.menu")}
          onClick={() => setOpen(!open)}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label={t("nav.mobile")} className="space-y-1 border-t border-border px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.href) ? "page" : undefined}
              className="block rounded-md px-3 py-3 font-medium hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center justify-between gap-3 pt-2">
            <LangSwitch align="start" />
            <AccountLink mobile onNavigate={() => setOpen(false)} />
          </div>
        </nav>
      )}
    </header>
  );
}

// lucide-react v1 no longer ships brand logos.
const brandIcon = (d) =>
  function BrandIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d={d} />
      </svg>
    );
  };
const Facebook = brandIcon("M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8Z");
const Instagram = brandIcon(
  "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9Z",
);
const Youtube = brandIcon(
  "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15V9l5.8 3-5.8 3Z",
);

export function SiteFooter() {
  const { t } = useT();
  const socials = [
    [Facebook, "Facebook"],
    [Instagram, "Instagram"],
    [Youtube, "YouTube"],
  ];
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{t("common.tagline")}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("footer.explore")}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/" className="hover:text-primary">{t("common.home")}</Link></li>
            <li><Link href="/doctors" className="hover:text-primary">{t("nav.findDoctors")}</Link></li>
            <li><Link href="/about" className="hover:text-primary">{t("nav.about")}</Link></li>
            <li><Link href="/contact" className="hover:text-primary">{t("nav.contact")}</Link></li>
            <li><Link href="/login?tab=lab" className="hover:text-primary">{t("footer.quickLab")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("footer.contact")}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="size-4" aria-hidden />{t("footer.hotline")}</li>
            <li className="flex items-center gap-2"><Mail className="size-4" aria-hidden />{t("footer.supportEmail")}</li>
          </ul>
          <div className="mt-3 flex gap-2">
            {socials.map(([I, name]) => (
              <a key={name} href="#" aria-label={t("footer.social", { name })} className="rounded-md border border-border p-2 hover:text-primary">
                <I className="size-4" aria-hidden />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("footer.legal")}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/privacy" className="hover:text-primary">{t("footer.privacy")}</Link></li>
            <li><Link href="/terms" className="hover:text-primary">{t("footer.terms")}</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {t("common.appName")}. {t("footer.rights")}
      </p>
    </footer>
  );
}

export function SiteLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function SignOutButton() {
  const { t } = useT();
  const { user, signOut } = useAuth();
  if (!user)
    return (
      <Link href="/login" className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label={t("common.signIn")}>
        <LogIn className="size-5" aria-hidden />
      </Link>
    );
  return (
    <button type="button" onClick={signOut} className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label={t("common.signOut")} title={t("common.signOut")}>
      <LogOut className="size-5" aria-hidden />
    </button>
  );
}

/** Sidebar layout for the patient, doctor and admin dashboards (from res/layout). */
export function DashboardShell({ title, role, items, active, onSelect, children }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav aria-label={`${role}`} className="space-y-1 p-3">
      {items.map(({ key, label, icon: I }) => (
        <button
          type="button"
          key={key}
          onClick={() => {
            onSelect(key);
            setOpen(false);
          }}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[0.95rem] font-medium",
            active === key ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <I className="size-5" aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  );
  return (
    <div className="flex min-h-screen">
      <SkipLink />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar lg:block">
        <div className="flex h-16 items-center border-b border-border px-4"><Logo /></div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("common.menu")}>
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <button type="button" aria-label={t("common.closeMenu")} onClick={() => setOpen(false)} className="p-2"><X aria-hidden /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
          <button type="button" className="rounded-md p-2 lg:hidden" aria-label={t("common.menu")} onClick={() => setOpen(true)}><Menu aria-hidden /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-bold">{title}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
          <LangSwitch />
          <SignOutButton />
        </header>
        <main id="main" tabIndex={-1} className="flex-1 p-4 outline-none sm:p-6">{children}</main>
      </div>
    </div>
  );
}
