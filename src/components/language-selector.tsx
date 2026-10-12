"use client";

/**
 * LanguageSelector — accessible dropdown for switching UI language.
 *
 * - Pure client-side switch: updates context state only (all localized
 *   components re-render instantly). No page reload, no router.refresh(),
 *   no layout re-render, no scroll reset.
 * - Persists via localStorage + cookie (inside setLanguage).
 * - Variants: "dark" for the ink sidebar / mobile top bar, "light" for
 *   content pages such as Settings.
 */
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/components/ui";
import type { Language } from "@/i18n";

const OPTIONS: { value: Language; label: string; short: string }[] = [
  { value: "ja", label: "日本語", short: "JA" },
  { value: "en", label: "English", short: "EN" },
];

export function LanguageSelector({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.value === language) ?? OPTIONS[0];

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("settings_title")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors",
          variant === "dark"
            ? "border-white/15 bg-white/5 text-white/85 hover:bg-white/10 hover:text-white"
            : "border-line bg-card text-ink2 hover:border-accent hover:text-accent",
        )}
      >
        <Globe size={12} className={variant === "dark" ? "text-accent" : "text-accent"} />
        <span>{current.label}</span>
        <ChevronDown
          size={11}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-activedescendant={`lang-${current.value}`}
          className={cn(
            "absolute right-0 z-50 mt-1.5 w-40 overflow-hidden rounded-lg border shadow-lg",
            variant === "dark"
              ? "border-white/10 bg-ink"
              : "border-line bg-card",
          )}
        >
          {OPTIONS.map((opt) => {
            const active = opt.value === language;
            return (
              <li key={opt.value} role="option" id={`lang-${opt.value}`} aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-bold transition-colors",
                    variant === "dark"
                      ? active
                        ? "bg-white/10 text-white"
                        : "text-white/65 hover:bg-white/5 hover:text-white"
                      : active
                        ? "bg-accent-soft text-accent-deep"
                        : "text-ink2 hover:bg-washi hover:text-ink",
                  )}
                >
                  <span className="flex-1">{opt.label}</span>
                  <span
                    className={cn(
                      "font-mono text-[9px] tracking-wider",
                      variant === "dark" ? "text-white/35" : "text-faint",
                    )}
                  >
                    {opt.short}
                  </span>
                  {active ? <Check size={12} className={variant === "dark" ? "text-accent" : "text-accent"} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
