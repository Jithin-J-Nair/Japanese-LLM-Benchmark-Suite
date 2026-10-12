"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Cpu,
  FlaskConical,
  Globe,
  Loader2,
  MemoryStick,
  Zap,
} from "lucide-react";
import type { Dataset, ModelProfile, TaskDefinition, TaskId } from "@/lib/bench/types";
import { Badge, Card, cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { datasetDesc, datasetName, taskDesc, taskName } from "@/i18n";

function Chip({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "grid size-4.5 shrink-0 place-items-center rounded border transition-colors",
        active ? "border-accent bg-accent text-white" : "border-line bg-card text-transparent",
      )}
    >
      <Check size={11} strokeWidth={3.5} />
    </span>
  );
}

export function RunConfigForm({
  models,
  dynamicModels = [],
  tasks,
  datasets,
}: {
  models: ModelProfile[];
  dynamicModels?: ModelProfile[];
  tasks: TaskDefinition[];
  datasets: Dataset[];
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [name, setName] = useState(
    `${t("newrun_default_name")} ${new Date().toLocaleDateString(language === "ja" ? "ja-JP" : "en-US")}`,
  );
  const [modelIds, setModelIds] = useState<Set<string>>(new Set(models.map((m) => m.id)));
  const allModels = useMemo(() => [...models, ...dynamicModels], [models, dynamicModels]);
  const [taskIds, setTaskIds] = useState<Set<TaskId>>(new Set(tasks.map((t) => t.id)));
  const [seed, setSeed] = useState("jp-bench-v1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleModel = (id: string) =>
    setModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleTask = (id: TaskId) =>
    setTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const evalCount = useMemo(() => {
    let n = 0;
    for (const t of tasks) {
      if (!taskIds.has(t.id)) continue;
      const ds = datasets.find((d) => d.taskId === t.id);
      n += (ds?.samples.length ?? 0) * modelIds.size;
    }
    return n;
  }, [taskIds, modelIds, tasks, datasets]);

  function renderModelCard(m: ModelProfile, isDynamic: boolean) {
    const active = modelIds.has(m.id);
    return (
      <button
        key={m.id}
        onClick={() => toggleModel(m.id)}
        className={cn(
          "rounded-lg border p-3.5 text-left transition-all",
          active
            ? "border-accent bg-accent-soft/60 shadow-[inset_0_0_0_1px_var(--color-accent)]"
            : "border-line bg-card hover:border-faint",
        )}
      >
        <div className="flex items-start gap-2.5">
          <Chip active={active} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: m.color }} />
              <span className="truncate text-[12.5px] font-bold text-ink">{m.name}</span>
              {isDynamic ? <Badge tone="accent">HF</Badge> : null}
              <Badge tone={m.type === "api" ? "gold" : "navy"}>
                {m.type === "api" ? t("common_api") : t("common_local")}
              </Badge>
            </div>
            <div className="num mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-mute">
              {m.parameterSizeB !== null && (
                <span className="inline-flex items-center gap-1"><Cpu size={10} />{m.parameterSizeB}B</span>
              )}
              {m.quantization && <span>{m.quantization}</span>}
              {m.vramGB !== null && (
                <span className="inline-flex items-center gap-1"><MemoryStick size={10} />{m.vramGB}GB</span>
              )}
              <span className="inline-flex items-center gap-1"><Zap size={10} />{m.tokensPerSecond} tok/s</span>
              {m.type === "api" && (
                <span className="inline-flex items-center gap-1"><Globe size={10} />${m.costInputPer1M}/1M in</span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name || t("newrun_default_name"),
          config: {
            modelIds: [...modelIds],
            taskIds: [...taskIds],
            seed,
          },
        }),
      });
      const json = (await res.json()) as { run?: { id: string }; error?: string };
      if (!res.ok || !json.run) throw new Error(json.error ?? t("newrun_run_failed"));
      router.push(`/runs/${json.run.id}`);
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      {/* models */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("newrun_step1")}</span>
            <h2 className="text-sm font-bold text-ink">{t("newrun_models_title")}</h2>
            <span className="num text-[11px] text-mute">
              {t("newrun_selected", { n: modelIds.size, total: allModels.length })}
            </span>
          </div>
          <div className="flex gap-2 text-[11px] font-bold">
            <button onClick={() => setModelIds(new Set(models.map((m) => m.id)))} className="text-accent hover:underline">{t("newrun_select_all")}</button>
            <button onClick={() => setModelIds(new Set())} className="text-mute hover:underline">{t("newrun_deselect")}</button>
          </div>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {allModels
            .filter((m) => models.includes(m))
            .map((m) => renderModelCard(m, false))}
        </div>
        {dynamicModels.length > 0 ? (
          <>
            <div className="mt-4 mb-2 flex items-center gap-2 text-[11px] font-bold text-mute">
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-accent-deep">HF</span>
              {t("newrun_hf_section", { n: dynamicModels.length })}
            </div>
            <div className="grid max-h-56 gap-2.5 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
              {dynamicModels.map((m) => renderModelCard(m, true))}
            </div>
          </>
        ) : null}
      </Card>

      {/* tasks */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("newrun_step2")}</span>
            <h2 className="text-sm font-bold text-ink">{t("newrun_tasks_title")}</h2>
            <span className="num text-[11px] text-mute">
              {t("newrun_selected", { n: taskIds.size, total: tasks.length })}
            </span>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          {tasks.map((task) => {
            const active = taskIds.has(task.id);
            const ds = datasets.find((d) => d.taskId === task.id);
            return (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={cn(
                  "rounded-lg border p-3.5 text-left transition-all",
                  active
                    ? "border-accent bg-accent-soft/60 shadow-[inset_0_0_0_1px_var(--color-accent)]"
                    : "border-line bg-card hover:border-faint",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Chip active={active} />
                  <span className="text-[12.5px] font-bold text-ink">{taskName(language, task)}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-[10.5px] leading-relaxed text-mute">
                  {taskDesc(language, task)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{t("newrun_metrics_badge", { n: task.rubric.length })}</Badge>
                  <Badge tone="forest">{t("newrun_samples_badge", { n: ds?.samples.length ?? 0 })}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* datasets + meta */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("newrun_step3")}</span>
            <h2 className="text-sm font-bold text-ink">{t("newrun_datasets_title")}</h2>
          </div>
          <ul className="space-y-2">
            {tasks
              .filter((task) => taskIds.has(task.id))
              .map((task) => {
                const ds = datasets.find((d) => d.taskId === task.id);
                if (!ds) return null;
                return (
                  <li key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5">
                    <div>
                      <div className="text-[12px] font-bold text-ink">
                        {t("newrun_dataset_for", { task: taskName(language, task) })}
                      </div>
                      <div className="text-[10.5px] text-mute">{datasetName(language, ds)} ・ {datasetDesc(language, ds)}</div>
                    </div>
                    <Badge tone="accent">{ds.samples.length} {t("common_count_unit")}</Badge>
                  </li>
                );
              })}
            {taskIds.size === 0 && (
              <li className="py-6 text-center text-[12px] text-mute">{t("newrun_dataset_none")}</li>
            )}
          </ul>
          <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
            <code className="rounded bg-[#efede8] px-1 font-mono text-[10px]">/api/runs</code>{" "}
            <code className="rounded bg-[#efede8] px-1 font-mono text-[10px]">config.datasetIds</code>{" — "}
            {t("newrun_custom_note")}
          </p>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("newrun_step4")}</span>
            <h2 className="text-sm font-bold text-ink">{t("newrun_meta_title")}</h2>
          </div>
          <label className="block text-[11px] font-bold text-mute">{t("newrun_run_name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] font-bold outline-none focus:border-accent"
          />
          <label className="mt-4 block text-[11px] font-bold text-mute">{t("newrun_seed_label")}</label>
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 font-mono text-[12px] outline-none focus:border-accent"
          />
          <div className="mt-4 rounded-lg bg-washi p-3.5 text-[11.5px] leading-relaxed text-ink2">
            {t("newrun_estimate", {
              models: modelIds.size,
              tasks: taskIds.size,
              evals: evalCount.toLocaleString(),
            })}
          </div>
        </Card>
      </div>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/90 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="num text-[11.5px] text-mute">
            <span className="font-black text-ink">{modelIds.size}</span> {t("common_models_unit")} ·{" "}
            <span className="font-black text-ink">{taskIds.size}</span> {t("common_tasks_unit")} ·{" "}
            <span className="font-black text-accent">{evalCount.toLocaleString()}</span> {t("common_samples_unit")}
            {error ? <span className="ml-3 font-bold text-accent-deep">{error}</span> : null}
          </div>
          <button
            onClick={submit}
            disabled={submitting || modelIds.size === 0 || taskIds.size === 0}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-bold text-white transition-all",
              submitting || modelIds.size === 0 || taskIds.size === 0
                ? "cursor-not-allowed bg-faint"
                : "bg-accent hover:bg-accent-deep shadow-[0_4px_14px_rgba(199,62,29,0.35)]",
              submitting && "animate-soft",
            )}
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
            {submitting ? t("newrun_running") : t("newrun_run_button")}
          </button>
        </div>
      </div>
    </div>
  );
}
