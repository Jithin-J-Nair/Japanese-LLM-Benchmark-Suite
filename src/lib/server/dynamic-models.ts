/**
 * Server-side access to HuggingFace-discovered models.
 *
 * Maps `models_dynamic` rows to runtime `ModelProfile`s (with estimated
 * capability matrices), merges them with the static registry, and performs
 * idempotent upserts on refresh.
 */
import { asc, count as countSql, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { modelsDynamic } from "@/db/schema";
import type { ModelProfile, TaskId } from "@/lib/bench/types";
import { MODELS } from "@/lib/bench/models";
import { colorForModel, estimateVramGB } from "@/lib/bench/capability";
import type { DiscoveredModel } from "@/lib/hf/discovery";
import { logger } from "./logger";

type Row = typeof modelsDynamic.$inferSelect;

/** URL-safe id for a dynamic model: "hf:org:name". */
export function dynamicModelId(hfId: string): string {
  return `hf:${hfId.replaceAll("/", ":")}`;
}

/** Reverse of dynamicModelId for the inspector route. */
export function hfIdFromDynamicId(id: string): string {
  return id.replace(/^hf:/, "").replaceAll(":", "/");
}

export function dynamicRowToProfile(row: Row): ModelProfile {
  const params = row.params;
  const tps = params === null ? 40 : params <= 4 ? 80 : params <= 9 ? 58 : params <= 16 ? 38 : 22;
  return {
    id: dynamicModelId(row.hfId),
    name: row.name,
    vendor: row.author ?? row.hfId.split("/")[0],
    type: "local",
    parameterSizeB: params,
    quantization: row.quantization,
    vramGB: estimateVramGB(params, row.quantization),
    endpoint: row.endpoint,
    apiKeyEnv: null,
    costInputPer1M: 0,
    costOutputPer1M: 0,
    baseLatencyMs: 210,
    tokensPerSecond: tps,
    color: colorForModel(row.hfId),
    descriptionJa: row.description
      ? `${row.description.slice(0, 120)}（HF Auto-Discovery・推定スキル）`
      : `HuggingFace 自動検出モデル（${row.hfId}）。スキル行列は推定値。`,
    skills: row.skills as Record<TaskId, number>,
  };
}

export async function listDynamicRows(): Promise<Row[]> {
  return db.select().from(modelsDynamic).orderBy(asc(modelsDynamic.hfId));
}

export async function listDynamicProfiles(): Promise<ModelProfile[]> {
  try {
    const rows = await listDynamicRows();
    return rows.map(dynamicRowToProfile);
  } catch (e) {
    logger.error("dynamic-models", "failed to load dynamic models", e);
    return [];
  }
}

/** Static registry + dynamic discovery, static first. */
export async function listAllProfiles(): Promise<ModelProfile[]> {
  return [...MODELS, ...(await listDynamicProfiles())];
}

/** Resolve any model id — static first, then dynamic. Used by engine & health. */
export async function getModelAnywhere(modelId: string): Promise<ModelProfile | null> {
  const staticHit = MODELS.find((m) => m.id === modelId);
  if (staticHit) return staticHit;
  const profiles = await listDynamicProfiles();
  return profiles.find((m) => m.id === modelId) ?? null;
}

export async function getDynamicRowByHfId(hfId: string): Promise<Row | null> {
  const [row] = await db
    .select()
    .from(modelsDynamic)
    .where(inArray(modelsDynamic.hfId, [hfId]))
    .limit(1);
  return row ?? null;
}

export async function getDynamicRowByDynamicId(id: string): Promise<Row | null> {
  return getDynamicRowByHfId(hfIdFromDynamicId(id));
}

export async function countDynamicModels(): Promise<number> {
  try {
    const [{ value }] = await db.select({ value: countSql() }).from(modelsDynamic);
    return Number(value);
  } catch {
    return 0;
  }
}

export interface UpsertSummary {
  added: number;
  updated: number;
  total: number;
}

export async function upsertDiscovered(models: DiscoveredModel[]): Promise<UpsertSummary> {
  if (!models.length) {
    return { added: 0, updated: 0, total: await countDynamicModels() };
  }
  const existing = await db
    .select({ hfId: modelsDynamic.hfId })
    .from(modelsDynamic)
    .where(
      inArray(
        modelsDynamic.hfId,
        models.map((m) => m.hfId),
      ),
    );
  const existingIds = new Set(existing.map((r) => r.hfId));
  const now = new Date();

  await db
    .insert(modelsDynamic)
    .values(
      models.map((m) => ({
        hfId: m.hfId,
        name: m.name,
        author: m.author,
        description: m.description,
        tags: m.tags,
        downloads: m.downloads,
        likes: m.likes,
        license: m.license,
        quantization: m.quantization,
        params: m.params,
        endpoint: m.endpoint,
        skills: m.skills,
        japanese: m.japanese,
        lastRefresh: now,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: modelsDynamic.hfId,
      set: {
        name: sql`excluded.name`,
        author: sql`excluded.author`,
        description: sql`excluded.description`,
        tags: sql`excluded.tags`,
        downloads: sql`excluded.downloads`,
        likes: sql`excluded.likes`,
        license: sql`excluded.license`,
        quantization: sql`excluded.quantization`,
        params: sql`excluded.params`,
        endpoint: sql`excluded.endpoint`,
        skills: sql`excluded.skills`,
        japanese: sql`excluded.japanese`,
        lastRefresh: now,
        updatedAt: now,
      },
    });

  return {
    added: models.filter((m) => !existingIds.has(m.hfId)).length,
    updated: models.filter((m) => existingIds.has(m.hfId)).length,
    total: await countDynamicModels(),
  };
}
