/**
 * Pure aggregation helpers shared by API routes, server components and the
 * export pipeline. No I/O in this module.
 */
import type {
  ModelOverall,
  ModelProfile,
  ModelTaskAggregate,
  SampleResult,
  TaskId,
} from "./types";
import { TASK_IDS } from "./types";
import { round } from "./random";
import { translate, type Language } from "@/i18n";

export function aggregateByModelTask(results: SampleResult[]): ModelTaskAggregate[] {
  const groups = new Map<string, SampleResult[]>();
  for (const r of results) {
    const key = `${r.modelId}::${r.taskId}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  const out: ModelTaskAggregate[] = [];
  for (const arr of groups.values()) {
    const n = arr.length;
    const first = arr[0];
    out.push({
      modelId: first.modelId,
      modelName: first.modelName,
      taskId: first.taskId,
      sampleCount: n,
      avgScore: round(arr.reduce((s, r) => s + r.score, 0) / n),
      avgLatencyMs: round(arr.reduce((s, r) => s + r.latencyMs, 0) / n, 0),
      totalTokens: arr.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0),
      totalCostUsd: round(arr.reduce((s, r) => s + r.costUsd, 0), 5),
    });
  }
  return out;
}

export function aggregateOverall(
  results: SampleResult[],
  profiles: ModelProfile[],
): ModelOverall[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const byModel = new Map<string, SampleResult[]>();
  for (const r of results) {
    const arr = byModel.get(r.modelId) ?? [];
    arr.push(r);
    byModel.set(r.modelId, arr);
  }
  const out: ModelOverall[] = [];
  for (const [modelId, arr] of byModel) {
    const p = profileById.get(modelId);
    const n = arr.length;
    const taskScores = {} as Record<TaskId, number | null>;
    const taskLatencies = {} as Record<TaskId, number | null>;
    for (const t of TASK_IDS) {
      const sub = arr.filter((r) => r.taskId === t);
      if (!sub.length) {
        taskScores[t] = null;
        taskLatencies[t] = null;
      } else {
        taskScores[t] = round(sub.reduce((s, r) => s + r.score, 0) / sub.length);
        taskLatencies[t] = round(
          sub.reduce((s, r) => s + r.latencyMs, 0) / sub.length,
          0,
        );
      }
    }
    out.push({
      modelId,
      modelName: p?.name ?? arr[0].modelName,
      modelType: p?.type ?? "local",
      color: p?.color ?? "#888",
      avgScore: round(arr.reduce((s, r) => s + r.score, 0) / n),
      avgLatencyMs: round(arr.reduce((s, r) => s + r.latencyMs, 0) / n, 0),
      totalTokens: arr.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0),
      totalCostUsd: round(arr.reduce((s, r) => s + r.costUsd, 0), 4),
      peakVramGB: p?.vramGB ?? null,
      taskScores,
      taskLatencies,
    });
  }
  return out.sort((a, b) => b.avgScore - a.avgScore);
}

/** Auto-generated headline findings for the report ("Model X is best at …").
 *  Localized via the central i18n dictionary (default: Japanese). */
export function keyFindings(
  overall: ModelOverall[],
  taskNames: Record<TaskId, string>,
  lang: Language = "ja",
): string[] {
  if (!overall.length) return [];
  const findings: string[] = [];
  const forTask = TASK_IDS.filter((t) => overall.some((o) => o.taskScores[t] !== null));
  for (const t of forTask) {
    const best = [...overall].sort(
      (a, b) => (b.taskScores[t] ?? -1) - (a.taskScores[t] ?? -1),
    )[0];
    findings.push(
      translate(lang, "finding_best", {
        task: taskNames[t],
        name: best.modelName,
        score: best.taskScores[t] ?? 0,
      }),
    );
  }
  const fastest = [...overall].sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)[0];
  findings.push(
    translate(lang, "finding_fastest", {
      name: fastest.modelName,
      ms: fastest.avgLatencyMs,
    }),
  );
  const cheapestOverall = [...overall].sort((a, b) => a.totalCostUsd - b.totalCostUsd)[0];
  findings.push(
    translate(lang, "finding_cheapest", {
      name: cheapestOverall.modelName,
      cost: cheapestOverall.totalCostUsd.toFixed(4),
    }),
  );
  const leader = overall[0];
  findings.push(
    translate(lang, "finding_leader", { name: leader.modelName, score: leader.avgScore }),
  );
  return findings;
}
