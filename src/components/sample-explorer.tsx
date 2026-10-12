"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FileText, Star } from "lucide-react";
import type { BenchmarkRun, ModelOverall, SampleResult, TaskDefinition, TaskId } from "@/lib/bench/types";
import { Badge, Card, cn, ScoreBar, scoreColor } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { rubricLabel, taskName } from "@/i18n";

export function SampleExplorer({
  run,
  tasks,
  overall,
}: {
  run: BenchmarkRun;
  tasks: TaskDefinition[];
  overall: ModelOverall[];
}) {
  const { t, language } = useLanguage();
  const defaultTask = tasks[0]?.id as TaskId | undefined;
  const [taskId, setTaskId] = useState<TaskId | undefined>(defaultTask);

  const sampleIds = useMemo(() => {
    const set: string[] = [];
    for (const r of run.results) {
      if (r.taskId === taskId && !set.includes(r.sampleId)) set.push(r.sampleId);
    }
    return set;
  }, [run, taskId]);

  const [sampleId, setSampleId] = useState<string | null>(null);
  const activeSample = sampleId && sampleIds.includes(sampleId) ? sampleId : sampleIds[0];

  const rows: SampleResult[] = useMemo(
    () => run.results.filter((r) => r.taskId === taskId && r.sampleId === activeSample),
    [run, taskId, activeSample],
  );
  const order = new Map(overall.map((m, i) => [m.modelId, i]));
  const sorted = [...rows].sort((a, b) => (order.get(a.modelId) ?? 99) - (order.get(b.modelId) ?? 99));
  const input = sorted[0]?.input ?? "";

  const task = tasks.find((t) => t.id === taskId);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("inspector_kicker")}</span>
        <h2 className="text-sm font-bold text-ink">{t("inspector_title")}</h2>
        <span className="text-[11px] text-mute">{t("inspector_subtitle")}</span>
      </div>

      {/* selectors */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => {
              setTaskId(task.id);
              setSampleId(null);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[11.5px] font-bold transition-colors",
              task.id === taskId
                ? "border-accent bg-accent text-white"
                : "border-line bg-card text-ink2 hover:border-faint",
            )}
          >
            {taskName(language, task)}
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {sampleIds.map((sid, i) => (
          <button
            key={sid}
            onClick={() => setSampleId(sid)}
            className={cn(
              "num rounded-md border px-2.5 py-1 text-[10.5px] font-bold transition-colors",
              sid === activeSample
                ? "border-ink bg-ink text-white"
                : "border-line bg-card text-mute hover:border-faint",
            )}
          >
            {String(i + 1).padStart(2, "0")} <span className="opacity-60">{sid}</span>
          </button>
        ))}
      </div>

      {task ? (
        <div className="mb-4 rounded-lg border border-line bg-washi p-4">
          <div className="mb-1.5 flex items-center gap-2 text-[10.5px] font-bold tracking-wider text-mute uppercase">
            <FileText size={11} /> {t("inspector_input_label")} — {taskName(language, task)}
          </div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{input}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.rubric.map((r) => (
              <Badge key={r.metric} tone="neutral">
                {rubricLabel(language, r.metric)} {Math.round(r.weight * 100)}%
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {/* per-model output cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((r) => {
          const isBest = r.score === Math.max(...sorted.map((x) => x.score));
          return (
            <div key={r.modelId} className={cn("rounded-lg border p-4", isBest ? "border-forest bg-[#f4f8f6]" : "border-line bg-card")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: scoreColor(r.score) }} />
                  <span className="truncate text-[12px] font-bold text-ink">{r.modelName}</span>
                  {isBest ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-forest">
                      <Star size={10} fill="currentColor" /> {t("common_best")}
                    </span>
                  ) : null}
                </div>
                <div className="num flex items-center gap-2 text-[10.5px] text-mute">
                  <span>{r.latencyMs}{t("common_ms")}</span>
                  <span>{r.inputTokens + r.outputTokens} {t("common_tokens")}</span>
                  {r.costUsd > 0 ? <span>${r.costUsd.toFixed(5)}</span> : null}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <ScoreBar value={r.score} color={scoreColor(r.score)} width={90} />
                <span className="num text-[15px] font-black" style={{ color: scoreColor(r.score) }}>
                  {r.score}
                </span>
              </div>
              <p className="mt-2.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-washi/70 p-3 text-[11.5px] leading-relaxed text-ink2">
                {r.output}
              </p>
              <div className="mt-2.5 space-y-1">
                {r.subscores.map((s) => (
                  <div key={s.metric} className="flex items-center gap-2 text-[10px]">
                    <span className="w-24 shrink-0 text-mute">{rubricLabel(language, s.metric)}</span>
                    <ScoreBar value={s.score} color={scoreColor(s.score)} width={70} />
                    <span className="num w-7 text-right font-bold text-ink2">{s.score}</span>
                  </div>
                ))}
              </div>
              <ul className="mt-2 space-y-0.5">
                {r.notes.map((n, i) => (
                  <li key={i} className="flex items-start gap-1 text-[10px] text-mute">
                    <ChevronRight size={9} className="mt-0.5 shrink-0 text-faint" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
