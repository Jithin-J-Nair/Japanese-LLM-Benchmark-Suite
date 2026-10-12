"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  DollarSign,
  Download as DownloadIcon,
  Heart,
  MemoryStick,
  Search,
  Zap,
} from "lucide-react";
import type { ModelProfile, TaskDefinition, TaskId } from "@/lib/bench/types";
import { Badge, Card, cn, fmtCompact, ScoreBar } from "@/components/ui";
import { HealthCheckButton } from "@/components/model-health";
import { useLanguage } from "@/context/LanguageContext";
import { taskShort } from "@/i18n";
import { ModelDescription } from "@/components/localized";

/** Unified view model for static-registry and HuggingFace-discovered models. */
export interface RegistryEntry {
  id: string;
  source: "static" | "hf";
  name: string;
  vendor: string;
  type: "local" | "api";
  params: number | null;
  quantization: string | null;
  vramGB: number | null;
  tokensPerSecond: number;
  color: string;
  /** Full profile — descriptions render client-side via ModelDescription. */
  profile: ModelProfile;
  tags: string[];
  downloads: number | null;
  likes: number | null;
  license: string | null;
  japanese: boolean;
  skills: Record<TaskId, number>;
}

type SourceFilter = "all" | "japanese" | "gguf" | "local" | "api";
type ParamFilter = "all" | "small" | "mid" | "large" | "unknown";

export function ModelsRegistry({
  entries,
  tasks,
}: {
  entries: RegistryEntry[];
  tasks: TaskDefinition[];
}) {
  const { t, language } = useLanguage();
  const [source, setSource] = useState<SourceFilter>("all");
  const [params, setParams] = useState<ParamFilter>("all");
  const [vendor, setVendor] = useState("all");
  const [query, setQuery] = useState("");

  const vendors = useMemo(
    () => [...new Set(entries.map((e) => e.vendor))].sort(),
    [entries],
  );

  const isGguf = (e: RegistryEntry) =>
    (e.quantization ?? "").toLowerCase().includes("q") ||
    e.tags.some((t) => t.toLowerCase() === "gguf");

  const inParamBucket = (e: RegistryEntry) => {
    switch (params) {
      case "all": return true;
      case "small": return e.params !== null && e.params < 8;
      case "mid": return e.params !== null && e.params >= 8 && e.params < 15;
      case "large": return e.params !== null && e.params >= 15;
      case "unknown": return e.params === null;
    }
  };

  const filtered = entries.filter((e) => {
    if (source === "japanese" && !e.japanese) return false;
    if (source === "gguf" && !isGguf(e)) return false;
    if (source === "local" && e.type !== "local") return false;
    if (source === "api" && e.type !== "api") return false;
    if (!inParamBucket(e)) return false;
    if (vendor !== "all" && e.vendor !== vendor) return false;
    if (query && !`${e.name} ${e.id} ${e.vendor} ${e.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    return true;
  });

  const chips: { key: SourceFilter; label: string }[] = [
    { key: "all", label: t("models_filter_all") },
    { key: "japanese", label: t("models_filter_japanese") },
    { key: "gguf", label: t("models_filter_gguf") },
    { key: "local", label: t("models_filter_local") },
    { key: "api", label: t("models_filter_api") },
  ];
  const paramChips: { key: ParamFilter; label: string }[] = [
    { key: "all", label: t("models_params_all") },
    { key: "small", label: t("models_params_small") },
    { key: "mid", label: t("models_params_mid") },
    { key: "large", label: t("models_params_large") },
    { key: "unknown", label: t("models_params_unknown") },
  ];

  return (
    <div>
      {/* filter bar */}
      <Card className="mb-4 flex flex-wrap items-center gap-2.5 p-3.5">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setSource(c.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors",
              source === c.key
                ? "border-ink bg-ink text-white"
                : "border-line bg-card text-ink2 hover:border-faint",
            )}
          >
            {c.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        {paramChips.map((c) => (
          <button
            key={c.key}
            onClick={() => setParams(c.key)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[10.5px] font-bold transition-colors",
              params === c.key
                ? "border-accent bg-accent text-white"
                : "border-line bg-card text-mute hover:border-faint",
            )}
          >
            {c.label}
          </button>
        ))}
        <select
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] font-bold text-ink2 outline-none focus:border-accent"
        >
          <option value="all">{t("models_vendor_all")}</option>
          {vendors.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <span className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("models_search_placeholder")}
            className="w-44 rounded-lg border border-line bg-card py-1.5 pl-7 pr-2 text-[11.5px] outline-none focus:border-accent"
          />
        </span>
        <span className="num text-[10.5px] font-bold text-mute">
          {t("models_result_count", { n: filtered.length, total: entries.length })}
        </span>
      </Card>

      {/* grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((m) => (
          <Card key={m.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg" style={{ background: `${m.color}1a` }}>
                  <Cpu size={17} style={{ color: m.color }} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-black text-ink">{m.name}</div>
                  <div className="truncate text-[10.5px] text-mute">{m.vendor}</div>
                </div>
              </div>
              <span className="flex shrink-0 gap-1">
                {m.source === "hf" ? <Badge tone="accent">HF</Badge> : null}
                {m.japanese ? <Badge tone="forest">JP</Badge> : null}
                <Badge tone={m.type === "api" ? "gold" : "navy"}>
                  {m.type === "api" ? t("common_api") : t("common_local")}
                </Badge>
              </span>
            </div>

            <ModelDescription model={m.profile} className="mt-3 line-clamp-2 block text-[11.5px] leading-relaxed text-ink2" />

            <div className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-washi p-3 text-[11px] text-ink2 sm:grid-cols-4">
              <span className="inline-flex items-center gap-1">
                <Cpu size={11} className="text-faint" />
                {m.params !== null ? `${m.params}B` : t("models_params_hidden")}
              </span>
              <span className="inline-flex items-center gap-1">
                <MemoryStick size={11} className="text-faint" />
                {m.vramGB !== null ? `${m.vramGB} GB` : "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap size={11} className="text-faint" />
                {m.tokensPerSecond} tok/s
              </span>
              <span className="inline-flex items-center gap-1">
                <DollarSign size={11} className="text-faint" />
                {m.type === "api" ? t("models_cost_metered") : "¥0"}
              </span>
            </div>

            {(m.downloads !== null || m.license || m.tags.length > 0) ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-mute">
                {m.downloads !== null ? (
                  <span className="num inline-flex items-center gap-1">
                    <DownloadIcon size={9.5} className="text-faint" /> {fmtCompact(m.downloads)}
                  </span>
                ) : null}
                {m.likes !== null ? (
                  <span className="num inline-flex items-center gap-1">
                    <Heart size={9.5} className="text-faint" /> {fmtCompact(m.likes)}
                  </span>
                ) : null}
                {m.license ? <span className="font-mono">{m.license}</span> : null}
                {m.tags.slice(0, 4).map((t) => (
                  <span key={t} className="rounded bg-[#efede8] px-1 py-px font-mono text-[9px] text-ink2">{t}</span>
                ))}
              </div>
            ) : null}

            <div className="mt-3 space-y-1.5">
              {tasks.map((task) => {
                const v = Math.round(m.skills[task.id] * 100);
                return (
                  <div key={task.id} className="flex items-center gap-2 text-[10.5px]">
                    <span className="w-20 shrink-0 font-bold text-mute">{taskShort(language, task)}</span>
                    <ScoreBar value={v} color={m.color} width={110} />
                    <span className="num w-8 text-right font-black text-ink2">{v}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
              <Link
                href={`/models/${encodeURIComponent(m.id)}`}
                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-accent hover:underline"
              >
                {t("models_inspector_link")} <ArrowRight size={10} />
              </Link>
              <HealthCheckButton modelId={m.id} />
            </div>
          </Card>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Card className="mt-4 p-10 text-center text-[12px] text-mute">
          {t("models_empty")}
        </Card>
      ) : null}
    </div>
  );
}
