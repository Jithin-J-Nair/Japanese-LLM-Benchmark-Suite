/**
 * LLM-JP-Bench — domain types.
 *
 * The whole evaluation pipeline (models, tasks, datasets, scoring, runs)
 * is expressed against these interfaces. Everything downstream
 * (DB rows, API payloads, exports) is a serialization of them.
 */

export type TaskId =
  | "keigo_rewrite"
  | "email_correction"
  | "summarization"
  | "translation"
  | "ocr_cleanup";

export const TASK_IDS: TaskId[] = [
  "keigo_rewrite",
  "email_correction",
  "summarization",
  "translation",
  "ocr_cleanup",
];

export type ModelType = "local" | "api";

/* ---------------------------------- Tasks --------------------------------- */

export interface RubricItem {
  metric: string;
  metricJa: string;
  weight: number; // sums to 1 per task
  description: string;
  descriptionJa: string;
}

export interface TaskDefinition {
  id: TaskId;
  name: string;
  nameJa: string;
  shortJa: string;
  description: string;
  descriptionJa: string;
  icon: string; // lucide icon key, resolved in UI layer
  defaultDatasetId: string;
  targetLength: number | null; // chars, where relevant
  rubric: RubricItem[];
}

/* --------------------------------- Datasets ------------------------------- */

export interface BenchmarkSample {
  id: string;
  /** Model input text (Japanese, or EN for EN→JP translation). */
  input: string;
  /** Optional human-written gold output for similarity-based metrics. */
  reference?: string;
  /** Key points / glossary terms a good output must cover. */
  keyPoints?: string[];
  meta?: Record<string, string>;
}

export interface Dataset {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  taskId: TaskId;
  samples: BenchmarkSample[];
}

/* ---------------------------------- Models -------------------------------- */

export interface ModelProfile {
  id: string;
  name: string;
  vendor: string;
  type: ModelType;
  /** Total parameters in billions, null for closed API models. */
  parameterSizeB: number | null;
  quantization: string | null;
  /** Measured peak VRAM during local inference, null for API models. */
  vramGB: number | null;
  /** Configurable HTTP endpoint (OpenAI-compatible or Ollama), null => sandbox simulation. */
  endpoint: string | null;
  /** Environment variable holding the API key, where applicable. */
  apiKeyEnv: string | null;
  costInputPer1M: number; // USD
  costOutputPer1M: number; // USD
  baseLatencyMs: number;
  tokensPerSecond: number;
  color: string; // chart color
  descriptionJa: string;
  /**
   * Intrinsic skill per task (0..1). In sandbox mode this parameterizes the
   * deterministic output generator; with real endpoints it is unused.
   */
  skills: Record<TaskId, number>;
}

/* --------------------------------- Results -------------------------------- */

export interface Subscore {
  metric: string;
  metricJa: string;
  weight: number;
  score: number; // 0..100
}

export interface Evaluation {
  score: number; // 0..100 weighted total
  subscores: Subscore[];
  /** Human-readable, Japanese-first audit notes ("尊敬語を3件検出" etc.). */
  notes: string[];
}

export interface InferenceMetrics {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  vramGB: number | null;
}

export interface SampleResult extends InferenceMetrics {
  modelId: string;
  modelName: string;
  taskId: TaskId;
  sampleId: string;
  input: string;
  output: string;
  score: number;
  subscores: Subscore[];
  notes: string[];
}

/* ----------------------------------- Runs --------------------------------- */

export interface RunConfig {
  modelIds: string[];
  taskIds: TaskId[];
  /** taskId -> datasetId (defaults to the task's built-in dataset). */
  datasetIds: Record<string, string>;
  seed: string;
  mode: "sandbox" | "endpoint";
}

export interface BenchmarkRun {
  id: string;
  name: string;
  status: "completed" | "failed";
  config: RunConfig;
  createdAt: string;
  results: SampleResult[];
}

/* ------------------------------- Aggregations ------------------------------ */

export interface ModelTaskAggregate {
  modelId: string;
  modelName: string;
  taskId: TaskId;
  sampleCount: number;
  avgScore: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface ModelOverall {
  modelId: string;
  modelName: string;
  modelType: ModelType;
  color: string;
  avgScore: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
  peakVramGB: number | null;
  taskScores: Record<TaskId, number | null>;
  taskLatencies: Record<TaskId, number | null>;
}
