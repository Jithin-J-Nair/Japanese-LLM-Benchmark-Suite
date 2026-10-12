/**
 * Central i18n module — dictionaries, interpolation, and typed lookup
 * helpers for domain entities (tasks, datasets, rubric metrics, models).
 *
 * Pure module: importable from server components, client components, and
 * the evaluation library (e.g. key findings, markdown export).
 */
import { ja, type I18nKey } from "./ja";
import { en } from "./en";
import type { Dataset, ModelProfile, TaskDefinition } from "@/lib/bench/types";

export type Language = "ja" | "en";
export const LANGUAGES: Language[] = ["ja", "en"];
export const DEFAULT_LANGUAGE: Language = "ja";
export const LANG_COOKIE = "jp-bench-lang";
export const LANG_STORAGE = "jp-bench-lang";

export type { I18nKey };

const DICTS: Record<Language, Record<I18nKey, string>> = { ja, en };

/** Variable interpolation: "…{name}…", t(lang, key, { name: "X" }). */
export function translate(
  lang: Language,
  key: I18nKey,
  vars?: Record<string, string | number>,
): string {
  let s: string = DICTS[lang][key] ?? DICTS[DEFAULT_LANGUAGE][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

/* --------------------------- domain label helpers ------------------------ */

export function taskName(lang: Language, task: TaskDefinition | string): string {
  const id = typeof task === "string" ? task : task.id;
  return translate(lang, `task_${id}_name` as I18nKey);
}

export function taskShort(lang: Language, task: TaskDefinition | string): string {
  const id = typeof task === "string" ? task : task.id;
  return translate(lang, `task_${id}_short` as I18nKey);
}

export function taskDesc(lang: Language, task: TaskDefinition | string): string {
  const id = typeof task === "string" ? task : task.id;
  return translate(lang, `task_${id}_desc` as I18nKey);
}

export function datasetName(lang: Language, dataset: Dataset): string {
  return translate(lang, `dataset_${dataset.id}_name` as I18nKey);
}

export function datasetDesc(lang: Language, dataset: Dataset): string {
  return translate(lang, `dataset_${dataset.id}_desc` as I18nKey);
}

export function rubricLabel(lang: Language, metric: string): string {
  return translate(lang, `rubric_${metric}` as I18nKey);
}

export function modelDesc(lang: Language, model: ModelProfile): string {
  const key = `model_${model.id}_desc` as I18nKey;
  if (key in ja) return translate(lang, key);
  // Dynamic (HF) models: keep HF description with a localized suffix.
  const base = model.descriptionJa.replace(/（.*$/, "");
  return lang === "ja" ? model.descriptionJa : base + translate("en", "model_hf_suffix");
}
