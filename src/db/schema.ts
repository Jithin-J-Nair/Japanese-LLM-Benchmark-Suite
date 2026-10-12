import { integer, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * LLM-JP-Bench persistence layer.
 *
 * `runs` stores benchmark metadata + configuration; `run_results` stores one
 * row per (model, task, sample) evaluation. Aggregates are computed on read
 * so the stored data stays lossless and re-analyzable.
 */
export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("completed"),
  config: jsonb("config").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const runResults = pgTable("run_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),
  modelId: text("model_id").notNull(),
  modelName: text("model_name").notNull(),
  taskId: text("task_id").notNull(),
  sampleId: text("sample_id").notNull(),
  inputText: text("input_text").notNull(),
  outputText: text("output_text").notNull(),
  score: real("score").notNull(),
  subscores: jsonb("subscores").notNull(),
  notes: jsonb("notes").notNull(),
  latencyMs: real("latency_ms").notNull(),
  inputTokens: real("input_tokens").notNull(),
  outputTokens: real("output_tokens").notNull(),
  costUsd: real("cost_usd").notNull().default(0),
  vramGb: real("vram_gb"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * `models_dynamic` — HuggingFace auto-discovered models.
 * Rows are refreshed by POST /api/models/refresh (idempotent upsert on hf_id)
 * and mapped into ModelProfile at runtime so discovery results flow straight
 * into the benchmark engine.
 */
export const modelsDynamic = pgTable("models_dynamic", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Unique "org/name" identifier from HuggingFace. */
  hfId: text("hf_id").notNull().unique(),
  name: text("name").notNull(),
  author: text("author"),
  description: text("description").notNull().default(""),
  tags: jsonb("tags").notNull().default([]),
  downloads: integer("downloads").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  license: text("license"),
  quantization: text("quantization"),
  /** Parameter count in billions (real to support 0.5B, 7.6B, …). */
  params: real("params"),
  endpoint: text("endpoint"),
  /** Estimated per-task capability matrix, produced by capability.ts. */
  skills: jsonb("skills").notNull(),
  /** True when tags/name indicate a Japanese-tuned model. */
  japanese: integer("japanese").notNull().default(0),
  lastRefresh: timestamp("last_refresh", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
