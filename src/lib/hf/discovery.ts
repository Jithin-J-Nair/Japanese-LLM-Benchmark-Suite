/**
 * HuggingFace model discovery client.
 *
 * Queries the public HF Hub API across a set of Japanese-LLM-relevant
 * searches, normalizes raw entries into `models_dynamic` rows, and reports
 * per-query diagnostics. Every request has an 8s timeout and up to 2 retries
 * with exponential backoff; a full HF outage degrades gracefully to an error
 * summary instead of throwing, so the UI can render a fallback banner.
 */
import { estimateSkills, isJapaneseModel } from "@/lib/bench/capability";
import type { TaskId } from "@/lib/bench/types";

const HF_API = "https://huggingface.co/api/models";

interface RawModel {
  id?: string;
  author?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  pipeline_tag?: string;
  cardData?: {
    license?: string | string[];
    license_name?: string;
    description?: string;
    summary?: string;
    language?: string | string[];
  };
}

export interface DiscoveredModel {
  hfId: string;
  name: string;
  author: string | null;
  description: string;
  tags: string[];
  downloads: number;
  likes: number;
  license: string | null;
  quantization: string | null;
  params: number | null;
  endpoint: string | null;
  skills: Record<TaskId, number>;
  japanese: number;
}

export interface DiscoveryResult {
  ok: boolean;
  fetched: number;
  unique: number;
  models: DiscoveredModel[];
  warnings: string[];
  queries: number;
  durationMs: number;
  error?: string;
}

/** Search plan: Japanese-tuned families first, then GGUF-filtered broad hits. */
const SEARCH_PLAN: { search: string; filter?: string; limit?: number }[] = [
  { search: "japanese-llm", limit: 25 },
  { search: "llm-jp", limit: 15 },
  { search: "elyza", limit: 15 },
  { search: "swallow-llm", limit: 15 },
  { search: "rinna", limit: 15 },
  { search: "japanese", filter: "gguf", limit: 25 },
  { search: "stockmark", limit: 10 },
];

const TAG_ALLOWLIST = [
  "text-generation", "conversational",
];

async function fetchWithRetry(url: string, attempts = 3): Promise<RawModel[] | { error: string }> {
  let lastError = "unknown";
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if (res.status === 429 || res.status >= 500) {
          await sleep(400 * 2 ** i);
          continue;
        }
        return { error: lastError };
      }
      const json = (await res.json()) as RawModel[];
      return json;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      await sleep(400 * 2 ** i);
    }
  }
  return { error: lastError };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** "Qwen2.5-14B-Instruct" -> 14, "4x7B" MoE -> 28, "0.5B" -> 0.5 */
export function parseParams(id: string): number | null {
  const moe = /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b/i.exec(id);
  if (moe) return Number(moe[1]) * Number(moe[2]);
  const m = /(?<![\d.])(\d+(?:\.\d+)?)\s*b(?![a-z])/i.exec(id.replaceAll("-", " "));
  return m ? Number(m[1]) : null;
}

export function parseQuantization(id: string, tags: string[] = []): string | null {
  const m = /(q4_k_m|q4_k_s|q4_0|q5_k_m|q5_k_s|q5_0|q6_k|q8_0|iq4_xs|fp16|bf16|f16|int8|gptq|awq)/i.exec(id);
  if (m) return m[1].toUpperCase();
  // Repo-level GGUF collections ship multiple quantizations as files.
  if (id.toLowerCase().includes("gguf") || tags.some((t) => t.toLowerCase() === "gguf")) return "GGUF";
  return null;
}

function extractLicense(raw: RawModel): string | null {
  const fromTag = raw.tags?.find((t) => t.startsWith("license:"));
  if (fromTag) return fromTag.slice("license:".length);
  const lic = raw.cardData?.license;
  if (Array.isArray(lic)) return lic.join(", ") || null;
  return lic ?? raw.cardData?.license_name ?? null;
}

function buildDescription(raw: RawModel): string {
  const card = raw.cardData?.description ?? raw.cardData?.summary;
  if (card) return card.replace(/\s+/g, " ").slice(0, 200);
  const bits = [raw.pipeline_tag, raw.author ? `by ${raw.author}` : null]
    .filter(Boolean)
    .join(" · ");
  return bits || "HuggingFace Hub 検出モデル";
}

function normalize(raw: RawModel): DiscoveredModel | null {
  const hfId = raw.id;
  if (!hfId || !hfId.includes("/")) return null;
  const tags = (raw.tags ?? []).filter((t) => !t.startsWith("region:"));
  // Low-signal filters: dataset repos, adapters, non-generative artifacts.
  if (tags.some((t) => t.startsWith("dataset") || t === "adapter" || t === "peft")) return null;
  if (raw.pipeline_tag && !TAG_ALLOWLIST.includes(raw.pipeline_tag) && !tags.includes("text-generation")) {
    return null;
  }
  const name = hfId.split("/").pop() ?? hfId;
  const params = parseParams(hfId);
  const quantization = parseQuantization(hfId, tags);
  const description = buildDescription(raw);
  const skills = estimateSkills({ hfId, tags, description, params });
  return {
    hfId,
    name,
    author: raw.author ?? hfId.split("/")[0],
    description,
    tags: tags.slice(0, 24),
    downloads: raw.downloads ?? 0,
    likes: raw.likes ?? 0,
    license: extractLicense(raw),
    quantization,
    params,
    endpoint: null,
    skills,
    japanese: isJapaneseModel({ hfId, tags, description }) ? 1 : 0,
  };
}

export async function discoverModels(): Promise<DiscoveryResult> {
  const started = Date.now();
  const warnings: string[] = [];
  const seen = new Map<string, DiscoveredModel>();
  let fetched = 0;
  let queries = 0;
  let hardFailures = 0;

  for (const plan of SEARCH_PLAN) {
    queries += 1;
    const params = new URLSearchParams({
      search: plan.search,
      sort: "downloads",
      direction: "-1",
      limit: String(plan.limit ?? 20),
      full: "true",
    });
    if (plan.filter) params.set("filter", plan.filter);
    const result = await fetchWithRetry(`${HF_API}?${params.toString()}`);
    if ("error" in result) {
      warnings.push(`query "${plan.search}" failed: ${result.error}`);
      hardFailures += 1;
      continue;
    }
    fetched += result.length;
    for (const raw of result) {
      const model = normalize(raw);
      if (!model || seen.has(model.hfId)) continue;
      // Ignore near-zero traction adapters of adapters; keeps registry tidy.
      if (model.downloads < 20 && model.likes < 2) continue;
      seen.set(model.hfId, model);
    }
  }

  const models = [...seen.values()].sort((a, b) => b.downloads - a.downloads);
  const ok = hardFailures < SEARCH_PLAN.length; // allow partial success
  return {
    ok,
    fetched,
    unique: models.length,
    models: ok ? models : [],
    warnings,
    queries,
    durationMs: Date.now() - started,
    error: ok ? undefined : "HuggingFace API に到達できません（全クエリ失敗）",
  };
}
