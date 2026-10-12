/**
 * Model Capability Estimator.
 *
 * For HuggingFace-discovered models there is no curated skill matrix, so we
 * infer one deterministically from the model id, tags, description and
 * parameter count. Pure rules, no randomness — the same metadata always
 * yields the same estimate, keeping sandbox runs reproducible. Estimates are
 * conservative (0.30–0.92) and should be re-calibrated with a real
 * endpoint-mode benchmark once the model is deployed.
 */
import type { TaskId } from "./types";
import { TASK_IDS } from "./types";
import { clamp, round } from "./random";

export interface CapabilityInput {
  hfId: string;
  tags: string[];
  description: string;
  params: number | null;
}

const JP_FAMILIES = [
  "llm-jp", "llmjp", "elyza", "swallow", "rinna", "stockmark", "karakuri",
  "nekomata", "shisa", "youri", "tanuki", "cyberagent", "plamo", "fuwari",
  "rakuten", "kotoba", "abeja", "umievo", "nico",
];

export function isJapaneseModel(input: { hfId: string; tags: string[]; description: string }): boolean {
  const hay = `${input.hfId} ${input.tags.join(" ")} ${input.description}`.toLowerCase();
  if (JP_FAMILIES.some((f) => hay.includes(f))) return true;
  return /\bjapanese\b|\bjpn?\b|nihongo|日本語|\bja\b/.test(hay);
}

export function estimateSkills(input: CapabilityInput): Record<TaskId, number> {
  const hay = `${input.hfId} ${input.tags.join(" ")} ${input.description}`.toLowerCase();

  // Baselines: a generic instruct LLM is mediocre at Japanese tasks.
  const skills: Record<TaskId, number> = {
    keigo_rewrite: 0.5,
    email_correction: 0.5,
    summarization: 0.55,
    translation: 0.55,
    ocr_cleanup: 0.45,
  };

  const japanese = isJapaneseModel(input);
  if (japanese) {
    skills.keigo_rewrite += 0.14;
    skills.email_correction += 0.12;
    skills.summarization += 0.08;
    skills.translation += 0.04;
    skills.ocr_cleanup += 0.06;
  }
  if (JP_FAMILIES.some((f) => hay.includes(f))) {
    skills.keigo_rewrite += 0.06;
    skills.email_correction += 0.06;
  }
  if (/\bqwen\b/.test(hay)) {
    skills.translation += 0.1;
    skills.summarization += 0.05;
  }
  if (/\bgemma|llama|mistral|phi\b/.test(hay) && !japanese) {
    skills.keigo_rewrite -= 0.08;
    skills.ocr_cleanup -= 0.04;
  }
  if (/instruct|chat|-it\b/.test(hay)) {
    skills.summarization += 0.05;
    skills.email_correction += 0.04;
    skills.keigo_rewrite += 0.02;
  }
  if (/translation|nllb|mbart|translate/.test(hay)) skills.translation += 0.08;

  // Scale prior: larger models reason better over long context.
  const p = input.params;
  if (p !== null) {
    if (p >= 20) {
      skills.translation += 0.08;
      skills.summarization += 0.07;
      skills.keigo_rewrite += 0.05;
      skills.email_correction += 0.05;
    } else if (p >= 10) {
      skills.summarization += 0.04;
      skills.translation += 0.04;
      skills.keigo_rewrite += 0.02;
    } else if (p < 4) {
      for (const t of TASK_IDS) skills[t] -= 0.08;
    }
  }

  for (const t of TASK_IDS) skills[t] = round(clamp(skills[t], 0.3, 0.92), 2);
  return skills;
}

/** Map quantization label to bits-per-weight for VRAM estimation. */
export function quantizationBpp(quantization: string | null): number {
  const q = (quantization ?? "").toLowerCase();
  if (q.includes("q4")) return 4.8;
  if (q.includes("q5")) return 5.8;
  if (q.includes("q6")) return 6.8;
  if (q.includes("q8")) return 8.5;
  if (q.includes("fp16") || q.includes("bf16") || q.includes("f16")) return 16;
  if (q.includes("int8")) return 8.5;
  return 8.5;
}

export function estimateVramGB(params: number | null, quantization: string | null): number | null {
  if (params === null) return null;
  // weights + ~28% KV/activation overhead
  return Math.round(((params * quantizationBpp(quantization)) / 8) * 1.28 * 10) / 10;
}

/** Deterministic UI color per model family. */
export function colorForModel(hfId: string): string {
  const hay = hfId.toLowerCase();
  const table: [RegExp, string][] = [
    [/qwen/, "#2f5b8f"],
    [/llama/, "#6b7280"],
    [/gemma/, "#8f6f2f"],
    [/mistral|mixtral/, "#4f6f8f"],
    [/elyza/, "#7a4f8f"],
    [/rinna/, "#b0506e"],
    [/swallow|llm-jp|llmjp/, "#c73e1d"],
    [/stockmark|karakuri|cyberagent|nekomata|shisa|tanuki|plamo/, "#3f7a5c"],
  ];
  for (const [re, color] of table) if (re.test(hay)) return color;
  return "#4b5563";
}
