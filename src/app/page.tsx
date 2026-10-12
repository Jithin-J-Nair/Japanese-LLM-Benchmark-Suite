import Link from "next/link";
import { ArrowRight, FlaskConical, FileText, Gauge, Layers3, Radar, Rows3, Timer } from "lucide-react";
import { listRuns, getRun, MODELS, TASKS, resolveProfilesForResults } from "@/lib/server/queries";
import { countDynamicModels } from "@/lib/server/dynamic-models";
import { aggregateOverall } from "@/lib/bench/aggregate";
import type { I18nKey } from "@/i18n";
import {
  Badge,
  Card,
  fmtInt,
  PageHeader,
  ScoreBar,
  scoreColor,
} from "@/components/ui";
import { LocalDateTime, T } from "@/components/localized";
import { ModelRadar, TaskBars, type RadarDatum, type TaskBarDatum } from "@/components/charts";

export const dynamic = "force-dynamic";

const STAT_DEFS: { labelKey: I18nKey; unitKey: I18nKey; icon: typeof FlaskConical }[] = [
  { labelKey: "stat_runs", unitKey: "common_runs_unit", icon: FlaskConical },
  { labelKey: "stat_models", unitKey: "common_count_unit", icon: Layers3 },
  { labelKey: "stat_hf", unitKey: "common_count_unit", icon: Radar },
  { labelKey: "stat_tasks", unitKey: "common_count_unit", icon: Rows3 },
  { labelKey: "stat_samples", unitKey: "common_count_unit", icon: Gauge },
];

export default async function DashboardPage() {
  const runList = await listRuns();
  const latest = runList[0] ? await getRun(runList[0].id) : null;
  const profiles = latest ? await resolveProfilesForResults(latest.results) : MODELS;
  const overall = latest ? aggregateOverall(latest.results, profiles) : [];
  const totalEvals = runList.reduce((s, r) => s + r.resultCount, 0);
  const dynamicCount = await countDynamicModels();

  const statValues = [
    fmtInt(runList.length),
    fmtInt(MODELS.length),
    fmtInt(dynamicCount),
    fmtInt(TASKS.length),
    fmtInt(totalEvals),
  ];

  // Chart data keys hold plain values; widget labels are client-localized.
  const topModels = overall.slice(0, 4);
  const radarData: RadarDatum[] = TASKS.map((task) => {
    const row: RadarDatum = { taskJa: task.id };
    for (const m of topModels) row[m.modelName] = m.taskScores[task.id] ?? 0;
    return row;
  });
  const barData: TaskBarDatum[] = TASKS.map((task) => {
    const row: TaskBarDatum = { taskJa: task.id };
    for (const m of overall.slice(0, 6)) row[m.modelName] = m.taskScores[task.id] ?? 0;
    return row;
  });

  return (
    <div>
      <PageHeader
        en="Dashboard"
        title={<T k="dashboard_title" />}
        description={<T k="dashboard_desc" />}
        actions={
          <>
            <Link
              href="/benchmarks/new"
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-accent"
            >
              <FlaskConical size={15} /> <T k="dashboard_cta_new" />
            </Link>
            {latest ? (
              <Link
                href={`/runs/${latest.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-[12.5px] font-bold text-ink2 transition-colors hover:border-accent hover:text-accent"
              >
                <FileText size={15} /> <T k="dashboard_cta_latest" />
              </Link>
            ) : null}
          </>
        }
      />

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_DEFS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={s.labelKey} className="p-4">
              <div className="flex items-center justify-between">
                <T k={s.labelKey} className="text-[11px] font-bold text-mute" />
                <Icon size={15} className="text-faint" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="num text-[26px] font-black tracking-tight text-ink">{statValues[i]}</span>
                <T k={s.unitKey} className="text-[11px] font-bold text-faint" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* leaderboard */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">
                Leaderboard
              </span>
              <h2 className="text-sm font-bold text-ink"><T k="leaderboard_title" /></h2>
            </div>
            {latest ? (
              <Badge tone="accent"><T k="leaderboard_latest_badge" /></Badge>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[10.5px] font-bold tracking-wider text-mute uppercase">
                  <th className="pb-2 pr-3"><T k="th_rank" /></th>
                  <th className="pb-2 pr-3"><T k="th_model" /></th>
                  <th className="pb-2 pr-3"><T k="th_type" /></th>
                  <th className="pb-2 pr-3"><T k="th_score" /></th>
                  <th className="pb-2 pr-3 text-right"><T k="th_latency" /></th>
                  <th className="pb-2 text-right"><T k="th_cost_metric" /></th>
                </tr>
              </thead>
              <tbody>
                {overall.map((m, i) => (
                  <tr key={m.modelId} className="border-b border-line/60 last:border-0 hover:bg-washi/60">
                    <td className="py-2.5 pr-3">
                      <span
                        className={
                          "num inline-grid size-5 place-items-center rounded-md text-[11px] font-black " +
                          (i === 0 ? "bg-accent text-white" : "bg-[#efede8] text-ink2")
                        }
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-ink">
                      <span className="mr-2 inline-block size-2 rounded-full" style={{ background: m.color }} />
                      {m.modelName}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={m.modelType === "api" ? "gold" : "navy"}>
                        <T k={m.modelType === "api" ? "common_api" : "common_local"} />
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <ScoreBar value={m.avgScore} color={scoreColor(m.avgScore)} width={80} />
                        <span className="num font-black" style={{ color: scoreColor(m.avgScore) }}>
                          {m.avgScore}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink2">
                      <span className="num inline-flex items-center gap-1 justify-end">
                        <Timer size={11} className="text-faint" />
                        {fmtInt(m.avgLatencyMs)} <T k="common_ms" />
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-ink2">
                      <span className="num">
                        {m.modelType === "api"
                          ? `$${m.totalCostUsd.toFixed(4)}`
                          : `${m.peakVramGB} GB VRAM`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* radar */}
        <Card className="p-5">
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">Radar</span>
            <h2 className="text-sm font-bold text-ink"><T k="dashboard_radar_title" /></h2>
          </div>
          <ModelRadar
            data={radarData}
            series={topModels.map((m) => ({ key: m.modelName, color: m.color }))}
            height={286}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* per-task bars */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">
              Per-task scores
            </span>
            <h2 className="text-sm font-bold text-ink"><T k="dashboard_bars_title" /></h2>
          </div>
          <TaskBars
            data={barData}
            series={overall.slice(0, 6).map((m) => ({ key: m.modelName, color: m.color }))}
            height={300}
          />
        </Card>

        {/* recent runs */}
        <Card className="flex flex-col p-5">
          <div className="mb-3 flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">History</span>
            <h2 className="text-sm font-bold text-ink"><T k="dashboard_history_title" /></h2>
          </div>
          <ul className="flex-1 divide-y divide-line/70">
            {runList.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Link href={`/runs/${r.id}`} className="group flex items-center gap-3 py-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#efede8] text-ink2 transition-colors group-hover:bg-accent group-hover:text-white">
                    <FlaskConical size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-ink group-hover:text-accent">
                      {r.name}
                    </span>
                    <span className="num block text-[10.5px] text-mute">
                      <LocalDateTime iso={r.createdAt} dateOnly />{" · "}
                      {r.config.modelIds.length} <T k="common_models_unit" /> × {r.config.taskIds.length} <T k="common_tasks_unit" />{" · "}
                      {fmtInt(r.resultCount)} <T k="common_samples_unit" />
                    </span>
                  </span>
                  <ArrowRight size={13} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/runs"
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[11.5px] font-bold text-ink2 transition-colors hover:border-accent hover:text-accent"
          >
            <T k="dashboard_history_all" /> <ArrowRight size={12} />
          </Link>
        </Card>
      </div>
    </div>
  );
}
