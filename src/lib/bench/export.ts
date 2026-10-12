/**
 * Export builders: CSV (per-sample scores), JSON (full run), Markdown report
 * (config + aggregate tables + auto-generated findings).
 */
import type { BenchmarkRun, TaskId } from "./types";
import { aggregateByModelTask, aggregateOverall, keyFindings } from "./aggregate";
import { MODELS } from "./models";
import { TASKS } from "./tasks";
import { translate, taskName, taskShort, type Language } from "@/i18n";

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(run: BenchmarkRun, lang: Language = "ja"): string {
  const header = [
    "model_id", "model_name", "task_id", "task_name", "sample_id",
    "score", "latency_ms", "input_tokens", "output_tokens", "cost_usd", "vram_gb",
  ];
  const rows = run.results.map((r) =>
    [
      r.modelId, r.modelName, r.taskId, taskName(lang, r.taskId), r.sampleId,
      r.score, r.latencyMs, r.inputTokens, r.outputTokens,
      r.costUsd.toFixed(6), r.vramGB ?? "",
    ].map(csvEscape).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function toJson(run: BenchmarkRun): string {
  return JSON.stringify(
    {
      ...run,
      aggregates: {
        byModelTask: aggregateByModelTask(run.results),
        overall: aggregateOverall(run.results, MODELS),
      },
    },
    null,
    2,
  );
}

function mdTable(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => "| " + cells.join(" | ") + " |";
  return [
    line(headers),
    line(headers.map(() => "---")),
    ...rows.map(line),
  ].join("\n");
}

export function toMarkdown(run: BenchmarkRun, lang: Language = "ja"): string {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(lang, key, vars);
  const overall = aggregateOverall(run.results, MODELS);
  const byTask = aggregateByModelTask(run.results);
  const taskNameMap = Object.fromEntries(
    TASKS.map((x) => [x.id, taskName(lang, x.id)]),
  ) as Record<TaskId, string>;
  const findings = keyFindings(overall, taskNameMap, lang);
  const date = new Date(run.createdAt).toLocaleString(lang === "ja" ? "ja-JP" : "en-US", {
    timeZone: "Asia/Tokyo",
  });
  const activeTasks = TASKS.filter((x) => run.config.taskIds.includes(x.id));

  const scoreRows: (string | number)[][] = overall.map((o) => [
    o.modelName,
    o.avgScore,
    ...activeTasks.map((x) => {
      const v = o.taskScores[x.id];
      return v === null ? "-" : v;
    }),
  ]);

  const perfRows = overall.map((o) => [
    o.modelName,
    o.modelType === "api" ? t("common_api") : t("common_local"),
    `${o.avgLatencyMs} ms`,
    o.totalTokens.toLocaleString("en-US"),
    o.modelType === "api" ? `$${o.totalCostUsd.toFixed(4)}` : "—",
    o.peakVramGB !== null ? `${o.peakVramGB} GB` : "—",
  ]);

  const taskSections = activeTasks
    .map((x) => {
      const rows = byTask
        .filter((a) => a.taskId === x.id)
        .sort((a, b) => b.avgScore - a.avgScore)
        .map((a, i) => [i + 1, a.modelName, a.avgScore, `${a.avgLatencyMs} ms`, a.sampleCount]);
      return `### ${taskName(lang, x)} (${x.name})\n\n${mdTable([t("md_th_rank"), t("md_th_model"), t("md_th_avg"), t("md_th_latency"), t("md_th_count")], rows)}`;
    })
    .join("\n\n");

  const rubricLines = activeTasks
    .map(
      (x) =>
        `- **${taskName(lang, x)}**: ` +
        x.rubric
          .map((r) => `${translate(lang, `rubric_${r.metric}` as never)} ${Math.round(r.weight * 100)}%`)
          .join(" / "),
    )
    .join("\n");

  return `# ${t("md_title")}

- **${t("md_run_name")}**: ${run.name}
- **${t("md_date")}**: ${date}
- **${t("md_mode")}**: ${run.config.mode === "sandbox" ? t("mode_sandbox") : t("mode_endpoint")}
- **${t("md_seed")}**: \`${run.config.seed}\`
- **${t("md_counts", { models: run.config.modelIds.length, tasks: run.config.taskIds.length, results: run.results.length })}**

## ${t("md_findings")}

${findings.map((f) => `- ${f}`).join("\n")}

## ${t("md_overall")}

${mdTable([t("md_th_model"), t("common_total"), ...activeTasks.map((x) => taskShort(lang, x))], scoreRows)}

## ${t("md_perf")}

${mdTable([t("md_th_model"), t("md_th_type"), t("md_th_latency"), t("md_th_tokens"), t("md_th_cost"), t("md_th_vram")], perfRows)}

## ${t("md_task_rankings")}

${taskSections}

## ${t("md_rubric")}

${rubricLines}

---
*${t("md_footer")}*
`;
}
