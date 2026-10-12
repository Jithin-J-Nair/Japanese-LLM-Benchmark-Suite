/**
 * Server-only persistence helpers over Drizzle.
 * Shared by the API routes and the server components.
 */
import { asc, count as countSql, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { runResults, runs } from "@/db/schema";
import type { BenchmarkRun, RunConfig, SampleResult, TaskId } from "@/lib/bench/types";
import { runBenchmark, validateConfig } from "@/lib/bench/engine";
import { MODELS } from "@/lib/bench/models";
import { TASKS } from "@/lib/bench/tasks";
import { DATASETS } from "@/lib/bench/datasets";
import { listDynamicProfiles } from "./dynamic-models";

/** Model list where a SampleResult.modelId may be a dynamic (hf:) id;
 *  report aggregation needs names/colors for both static and dynamic. */
export async function resolveProfilesForResults(results: SampleResult[]) {
  const dynamic = await listDynamicProfiles();
  const merged = [...MODELS];
  for (const d of dynamic) if (!merged.some((m) => m.id === d.id)) merged.push(d);
  const used = new Set(results.map((r) => r.modelId));
  return merged.filter((m) => used.has(m.id));
}

/* ------------------------------- mapping ---------------------------------- */

type RunRow = typeof runs.$inferSelect;
type ResultRow = typeof runResults.$inferSelect;

function toSampleResult(row: ResultRow): SampleResult {
  return {
    modelId: row.modelId,
    modelName: row.modelName,
    taskId: row.taskId as TaskId,
    sampleId: row.sampleId,
    input: row.inputText,
    output: row.outputText,
    score: row.score,
    subscores: row.subscores as SampleResult["subscores"],
    notes: row.notes as string[],
    latencyMs: row.latencyMs,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costUsd: row.costUsd,
    vramGB: row.vramGb,
  };
}

function toBenchmarkRun(run: RunRow, resultRows: ResultRow[]): BenchmarkRun {
  return {
    id: run.id,
    name: run.name,
    status: run.status as BenchmarkRun["status"],
    config: run.config as RunConfig,
    createdAt: run.createdAt.toISOString(),
    results: resultRows.map(toSampleResult),
  };
}

/* ------------------------------- mutations -------------------------------- */

export async function createRun(
  name: string,
  rawConfig: Partial<RunConfig>,
): Promise<BenchmarkRun> {
  // Dynamic (HuggingFace-discovered) models participate transparently.
  const extraModels = await listDynamicProfiles();
  const config = validateConfig(rawConfig, extraModels);
  const results = runBenchmark(config, extraModels);

  const [runRow] = await db
    .insert(runs)
    .values({ name, status: "completed", config })
    .returning();
  await db.insert(runResults).values(
    results.map((r) => ({
      runId: runRow.id,
      modelId: r.modelId,
      modelName: r.modelName,
      taskId: r.taskId,
      sampleId: r.sampleId,
      inputText: r.input,
      outputText: r.output,
      score: r.score,
      subscores: r.subscores,
      notes: r.notes,
      latencyMs: r.latencyMs,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      costUsd: r.costUsd,
      vramGb: r.vramGB,
    })),
  );
  return toBenchmarkRun(runRow, await db.select().from(runResults).where(eq(runResults.runId, runRow.id)));
}

/** Idempotent bootstrap: seed one full benchmark if the DB is empty. */
export async function ensureSeeded(): Promise<void> {
  const [{ value }] = await db.select({ value: countSql() }).from(runs);
  if (Number(value) > 0) return;
  await createRun("初期ベンチマーク — 全モデル×全タスク", {
    modelIds: MODELS.map((m) => m.id),
    taskIds: TASKS.map((t) => t.id),
    datasetIds: Object.fromEntries(TO_MAP_DATASET_DEFAULTS()),
    seed: "jp-bench-v1",
  });
}
function TO_MAP_DATASET_DEFAULTS(): [string, string][] {
  return TASKS.map((t) => [t.id, t.defaultDatasetId]);
}

/* -------------------------------- reads ----------------------------------- */

export async function listRuns(): Promise<
  { id: string; name: string; status: string; createdAt: string; config: RunConfig; resultCount: number }[]
> {
  await ensureSeeded();
  const allRuns = await db.select().from(runs).orderBy(desc(runs.createdAt));
  const allResults = await db
    .select({ runId: runResults.runId, value: countSql() })
    .from(runResults)
    .groupBy(runResults.runId);
  const counts = new Map(allResults.map((r) => [r.runId, Number(r.value)]));
  return allRuns.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    config: r.config as RunConfig,
    resultCount: counts.get(r.id) ?? 0,
  }));
}

export async function getRun(id: string): Promise<BenchmarkRun | null> {
  const [runRow] = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  if (!runRow) return null;
  const resultRows = await db
    .select()
    .from(runResults)
    .where(eq(runResults.runId, id))
    .orderBy(asc(runResults.taskId), asc(runResults.sampleId), asc(runResults.modelId));
  return toBenchmarkRun(runRow, resultRows);
}

export { MODELS, TASKS, DATASETS };
