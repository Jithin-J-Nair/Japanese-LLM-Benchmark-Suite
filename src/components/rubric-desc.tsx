"use client";

import { useLanguage } from "@/context/LanguageContext";

/** Rubric description text pairs (domain registry carries both languages;
 *  render side picks the active one instantly). */
export function RubricLabelDescription({
  metric,
  ja,
  en,
  className,
}: {
  metric: string;
  ja: string;
  en: string;
  className?: string;
}) {
  void metric;
  const { language } = useLanguage();
  return <span className={className ?? "text-mute"}>{language === "ja" ? ja : en}</span>;
}
