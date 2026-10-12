"use client";

/**
 * Localized text primitives for server-rendered pages.
 *
 * Every one of these subscribes to LanguageContext, so text inserted via
 * these components switches instantly on language change — without router
 * refreshes or re-mounts. Because client components still render once on
 * the server (with the cookie-seeded initial language), the SSR output and
 * the first client render always agree: no hydration mismatch.
 */
import { useLanguage } from "@/context/LanguageContext";
import {
  datasetDesc,
  datasetName,
  modelDesc,
  rubricLabel,
  taskDesc,
  taskName,
  taskShort,
  type I18nKey,
} from "@/i18n";
import type { Dataset, ModelProfile, TaskDefinition } from "@/lib/bench/types";

type Vars = Record<string, string | number>;

/** Generic translation node: <T k="dashboard_title" vars={{n: 3}} /> */
export function T({
  k,
  vars,
  className,
}: {
  k: I18nKey;
  vars?: Vars;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!className) return <>{t(k, vars)}</>;
  return <span className={className}>{t(k, vars)}</span>;
}

export function TaskName({ task, className }: { task: TaskDefinition | string; className?: string }) {
  const { language } = useLanguage();
  return <span className={className}>{taskName(language, task)}</span>;
}

export function TaskShort({ task, className }: { task: TaskDefinition | string; className?: string }) {
  const { language } = useLanguage();
  return <span className={className}>{taskShort(language, task)}</span>;
}

export function TaskDescription({ task, className }: { task: TaskDefinition | string; className?: string }) {
  const { language } = useLanguage();
  return <span className={className}>{taskDesc(language, task)}</span>;
}

export function DatasetName({ dataset, className }: { dataset: Dataset; className?: string }) {
  const { language } = useLanguage();
  return <span className={className}>{datasetName(language, dataset)}</span>;
}

export function DatasetDescription({ dataset, className }: { dataset: Dataset; className?: string }) {
  const { language } = useLanguage();
  return <span className={className}>{datasetDesc(language, dataset)}</span>;
}

export function RubricLabel({ metric, className }: { metric: string; className?: string }) {
  const { language } = useLanguage();
  return <span className={className}>{rubricLabel(language, metric)}</span>;
}

export function ModelDescription({
  model,
  className,
}: {
  model: ModelProfile;
  className?: string;
}) {
  const { language } = useLanguage();
  return <span className={className}>{modelDesc(language, model)}</span>;
}

/** Localized date/time (ja-JP vs en-US), recomputed on language change. */
export function LocalDateTime({
  iso,
  className,
  dateOnly = false,
}: {
  iso: string;
  className?: string;
  dateOnly?: boolean;
}) {
  const { language } = useLanguage();
  const d = new Date(iso);
  const s = dateOnly
    ? d.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", { timeZone: "Asia/Tokyo" })
    : d.toLocaleString(language === "ja" ? "ja-JP" : "en-US", { timeZone: "Asia/Tokyo" });
  return <span className={className}>{s}</span>;
}
