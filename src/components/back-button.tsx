"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { I18nKey } from "@/i18n";

/** Back-navigation control; falls back to `fallbackHref` when there is no
 *  in-app history (e.g. deep link opened in a new tab). */
export function BackButton({
  label,
  labelKey,
  fallbackHref = "/",
}: {
  /** Raw label override (already localized). */
  label?: string;
  /** Translation key variant — re-renders on language switch. */
  labelKey?: I18nKey;
  fallbackHref?: string;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="mb-4 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-mute transition-colors hover:text-accent"
    >
      <ArrowLeft size={12} /> {label ?? t(labelKey ?? "common_back")}
    </button>
  );
}
