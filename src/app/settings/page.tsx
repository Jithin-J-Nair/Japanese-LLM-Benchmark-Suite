"use client";

import { useState } from "react";
import { Check, Globe, Languages, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSelector } from "@/components/language-selector";
import { Badge, Card, PageHeader } from "@/components/ui";

export default function SettingsPage() {
  const { language, t } = useLanguage();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  return (
    <div className="max-w-3xl">
      <PageHeader
        en={t("settings_kicker")}
        title={t("settings_title")}
        description={t("settings_desc")}
      />

      {/* language selector */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[#efede8] text-ink2">
            <Languages size={16} />
          </span>
          <div>
            <div className="text-[13.5px] font-black text-ink">
              {t("settings_section_language")}
            </div>
            <div className="text-[10.5px] text-mute">{t("settings_lang_label")}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <LanguageSelector variant="light" />
          <button
            type="button"
            onClick={() => setSavedAt(Date.now())}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-accent-deep"
          >
            <Check size={14} /> {t("common_save")}
          </button>
          {savedAt !== null ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-forest">
              <Check size={12} /> {t("settings_saved")}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-washi p-3.5 text-[11.5px] leading-relaxed text-ink2">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-gold" />
          <span>{t("settings_autodetect")}</span>
        </div>

        <p className="num mt-3 text-[11px] text-mute">
          {t("settings_current", {
            lang: language === "ja" ? t("settings_ja") : t("settings_en"),
          })}
        </p>
      </Card>

      {/* live preview */}
      <Card className="mt-4 p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[#efede8] text-ink2">
            <Globe size={16} />
          </span>
          <div className="text-[13.5px] font-black text-ink">{t("settings_preview_title")}</div>
        </div>

        <div className="rounded-lg border border-line bg-washi p-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">
              {t("stat_runs")}
            </span>
            <Badge tone="accent">{t("leaderboard_latest_badge")}</Badge>
          </div>
          <div className="mt-2 text-[14px] font-black text-ink">
            {t("settings_preview_card_title")}
          </div>
          <p className="mt-1 text-[11.5px] text-mute">{t("settings_preview_card_body")}</p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-md bg-ink px-3 py-1.5 text-[11px] font-bold text-white">
              {t("newrun_run_button")}
            </span>
            <span className="rounded-md border border-line bg-card px-3 py-1.5 text-[11px] font-bold text-ink2">
              {t("common_report")}
            </span>
          </div>
        </div>

        <ul className="mt-4 grid gap-1.5 text-[11.5px] text-ink2 sm:grid-cols-2">
          {(
            [
              "nav_dashboard",
              "nav_new_benchmark",
              "nav_runs",
              "nav_models",
              "nav_datasets",
              "nav_docs",
            ] as const
          ).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className="h-1 w-3 rounded-full bg-accent" />
              {t(k)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
