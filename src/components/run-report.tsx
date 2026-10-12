"use client";

import { useMemo } from "react";
import { Lightbulb, Timer, Wallet } from "lucide-react";
import type { BenchmarkRun, ModelOverall, TaskDefinition, TaskId } from "@/lib/bench/types";
import { TASK_IDS } from "@/lib/bench/types";
import { Badge, Card, fmtInt, PageHeader, ScoreBar, scoreColor } from "@/components/ui";
import { ExportButtons } from "@/components/export-buttons";
import { useLanguage } from "@/context/LanguageContext";
import { taskName, taskShort } from "@/i18n";
import { keyFindings } from "@/lib/bench/aggregate";
import {
  ModelRadar,
  QualityLatencyScatter,
  TaskBars,
  type RadarDatum,
  type ScatterDatum,
  type TaskBarDatum,
} from "@/components/charts";
import { SampleExplorer } from "@/components/sample-explorer";

export function RunReport({
  run,
  overall,
  tasks,
}: {
  run: BenchmarkRun;
  overall: ModelOverall[];
  tasks: TaskDefinition[];
}) {
  const { t, language } = useLanguage();
  const activeTasks = tasks.filter((x) => run.config.taskIds.includes(x.id));
  // Findings are computed from the live language so they switch instantly.
  const findings = useMemo(() => {
    const names = Object.fromEntries(
      TASK_IDS.map((id) => [id, taskName(language, id)]),
    ) as Record<TaskId, string>;
    return keyFindings(overall, names, language);
  }, [overall, language]);

  const radarData: RadarDatum[] = activeTasks.map((task) => {
    const row: RadarDatum = { taskJa: taskShort(language, task) };
    for (const m of overall.slice(0, 4)) row[m.modelName] = m.taskScores[task.id] ?? 0;
    return row;
  });
  const barData: TaskBarDatum[] = activeTasks.map((task) => {
    const row: TaskBarDatum = { taskJa: taskShort(language, task) };
    for (const m of overall.slice(0, 6)) row[m.modelName] = m.taskScores[task.id] ?? 0;
    return row;
  });
  const scatterData: ScatterDatum[] = overall.map((m) => ({
    name: m.modelName,
    latencyMs: m.avgLatencyMs,
    score: m.avgScore,
    cost: m.totalCostUsd,
    color: m.color,
    type: m.modelType === "api" ? t("common_api") : t("common_local"),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        en={t("report_kicker")}
        title={run.name}
        description={t("report_desc", {
          date: new Date(run.createdAt).toLocaleString(
            language === "ja" ? "ja-JP" : "en-US",
            { timeZone: "Asia/Tokyo" },
          ),
          seed: run.config.seed,
          models: run.config.modelIds.length,
          tasks: run.config.taskIds.length,
          results: fmtInt(run.results.length),
        })}
        actions={<ExportButtons runId={run.id} />}
      />

      {/* findings */}
      <Card className="border-l-[3px] border-l-accent p-5">
        <div className="flex items-center gap-2 text-[12px] font-black text-ink">
          <Lightbulb size={14} className="text-accent" /> {t("findings_title")}
        </div>
        <ul className="mt-2 grid gap-x-8 gap-y-1 text-[12px] leading-relaxed text-ink2 sm:grid-cols-2">
          {findings.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1 w-1.5 shrink-0 rounded-full bg-accent" />
              {f}
            </li>
          ))}
        </ul>
      </Card>

      {/* score matrix */}
      <Card className="p-5">
        <div className="mb-4 flex items-baseline gap-3">
          <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("matrix_kicker")}</span>
          <h2 className="text-sm font-bold text-ink">{t("matrix_title")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[12px]">
            <thead>
              <tr className="text-left text-[10.5px] font-bold tracking-wider text-mute uppercase">
                <th className="border-b border-line pb-2.5 pr-3">{t("th_model")}</th>
                {activeTasks.map((task) => (
                  <th key={task.id} className="border-b border-line px-2 pb-2.5">{taskShort(language, task)}</th>
                ))}
                <th className="border-b border-line px-2 pb-2.5">{t("common_total")}</th>
                <th className="border-b border-line pl-2 pb-2.5 text-right">{t("th_latency")}</th>
              </tr>
            </thead>
            <tbody>
              {overall.map((m, rank) => (
                <tr key={m.modelId} className="border-b border-line/60 last:border-0 hover:bg-washi/60">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: m.color }} />
                      <span className="font-bold text-ink">{m.modelName}</span>
                      {rank === 0 ? <Badge tone="accent">{t("matrix_top")}</Badge> : null}
                    </div>
                  </td>
                  {activeTasks.map((t) => {
                    const v = m.taskScores[t.id];
                    return (
                      <td key={t.id} className="px-2 py-2.5">
                        {v === null ? (
                          <span className="text-faint">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <ScoreBar value={v} color={scoreColor(v)} width={44} />
                            <span className="num font-black" style={{ color: scoreColor(v) }}>{v}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2.5">
                    <span
                      className="num inline-block rounded-md px-1.5 py-0.5 text-[12.5px] font-black text-white"
                      style={{ background: scoreColor(m.avgScore) }}
                    >
                      {m.avgScore}
                    </span>
                  </td>
                  <td className="num py-2.5 pl-2 text-right text-ink2">{fmtInt(m.avgLatencyMs)} {t("common_ms")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[10.5px] text-mute">
          <span className="inline-flex items-center gap-1"><Timer size={10} />{t("matrix_latency_note")}</span>
          <span className="inline-flex items-center gap-1"><Wallet size={10} />{t("matrix_cost_note")}</span>
        </div>
      </Card>

      {/* charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("dashboard_radar_kicker")}</span>
            <h2 className="text-sm font-bold text-ink">{t("report_radar_title")}</h2>
          </div>
          <ModelRadar data={radarData} series={overall.slice(0, 4).map((m) => ({ key: m.modelName, color: m.color }))} height={290} lang={language} />
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("report_scatter_kicker")}</span>
            <h2 className="text-sm font-bold text-ink">{t("report_scatter_title")}</h2>
          </div>
          <QualityLatencyScatter data={scatterData} height={290} lang={language} />
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-2 flex items-baseline gap-3">
          <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">{t("report_bars_kicker")}</span>
          <h2 className="text-sm font-bold text-ink">{t("report_bars_title")}</h2>
        </div>
        <TaskBars data={barData} series={overall.slice(0, 6).map((m) => ({ key: m.modelName, color: m.color }))} height={300} lang={language} />
      </Card>

      {/* sample explorer */}
      <SampleExplorer run={run} tasks={activeTasks} overall={overall} />
    </div>
  );
}
