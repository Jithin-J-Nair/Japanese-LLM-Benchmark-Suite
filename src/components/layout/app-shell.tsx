"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  FlaskConical,
  History,
  Cpu,
  LibraryBig,
  BookOpenText,
  TerminalSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSelector } from "@/components/language-selector";
import type { I18nKey } from "@/i18n";

const NAV: { href: string; labelKey: I18nKey; subKey: I18nKey; icon: typeof LayoutDashboard }[] = [
  { href: "/", labelKey: "nav_dashboard", subKey: "nav_sub_overview", icon: LayoutDashboard },
  { href: "/benchmarks/new", labelKey: "nav_new_benchmark", subKey: "nav_sub_run", icon: FlaskConical },
  { href: "/runs", labelKey: "nav_runs", subKey: "nav_sub_runs", icon: History },
  { href: "/models", labelKey: "nav_models", subKey: "nav_sub_models", icon: Cpu },
  { href: "/datasets", labelKey: "nav_datasets", subKey: "nav_sub_assets", icon: LibraryBig },
  { href: "/docs", labelKey: "nav_docs", subKey: "nav_sub_docs", icon: BookOpenText },
  { href: "/settings", labelKey: "nav_settings", subKey: "nav_sub_settings", icon: Settings },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg bg-accent text-lg font-black text-white shadow-[0_2px_8px_rgba(199,62,29,0.45)]">
        評
      </span>
      <span className="leading-tight">
        <span className="block text-[13.5px] font-black tracking-wide text-white">
          LLM-JP-Bench
        </span>
        <span className="block text-[10px] font-medium tracking-[0.14em] text-white/50 uppercase">
          Japanese LLM Benchmark
        </span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href.split("/").slice(0, 2).join("/")) &&
              (item.href !== "/runs" || pathname.startsWith("/runs"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon
              size={17}
              className={cn("shrink-0", active ? "text-accent" : "text-white/40 group-hover:text-white/70")}
              strokeWidth={2.2}
            />
            <span className="flex-1">{t(item.labelKey)}</span>
            <span
              className={cn(
                "text-[9px] font-semibold tracking-[0.12em] uppercase",
                active ? "text-white/70" : "text-white/25",
              )}
            >
              {t(item.subKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-4 border-r border-white/5 bg-ink px-4 py-6 lg:flex">
        <div className="flex items-center justify-between gap-2">
          <Logo />
          <LanguageSelector />
        </div>
        <div className="mt-4" />
        <NavLinks />
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-[11px] font-bold text-white/80">
            <TerminalSquare size={13} className="text-accent" />
            {t("layout_sandbox_title")}
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-white/45">
            {t("layout_sandbox_desc")}
          </p>
        </div>
        <div className="text-[10px] font-medium tracking-widest text-white/25 uppercase">
          {t("layout_version_label")}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <LanguageSelector />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((item) => (
            <MobileLink key={item.href} href={item.href} labelKey={item.labelKey} />
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}

function MobileLink({ href, labelKey }: { href: string; labelKey: I18nKey }) {
  const { t } = useLanguage();
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11.5px] font-bold text-white/70 hover:bg-white/10 hover:text-white"
    >
      {t(labelKey)}
    </Link>
  );
}
