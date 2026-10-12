/**
 * Benchmark orchestrator (pure, no I/O).
 *
 * Given a RunConfig it walks the cartesian product model x task x sample,
 * generates outputs (sandbox generator or endpoint adapter by config.mode),
 * evaluates each output with the task scorer, and returns flat SampleResult
 * rows ready for persistence.
 */
import type { ModelProfile, RunConfig, SampleResult } from "./types";
import { getModel } from "./models";
import { getTask } from "./tasks";
import { datasetForTask } from "./datasets";
import { simulateOutput } from "./simulator";
import { evaluateOutput } from "./scoring";

/** Resolve a model id against the static registry plus any extra profiles
 * (e.g. HuggingFace-discovered rows mapped upstream). */
function resolveModel(modelId: string, extra: ModelProfile[]): ModelProfile {
  const model = getModel(modelId) ?? extra.find((m) => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);
  return model;
}

export function runBenchmark(config: RunConfig, extraModels: ModelProfile[] = []): SampleResult[] {
  const results: SampleResult[] = [];
  for (const taskId of config.taskIds) {
    const task = getTask(taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    const dataset = datasetForTask(taskId, config.datasetIds[taskId]);
    for (const sample of dataset.samples) {
      for (const modelId of config.modelIds) {
        const model = resolveModel(modelId, extraModels);
        const gen = simulateOutput(model, task, sample, config.seed);
        const evaln = evaluateOutput(task.id, sample, gen.output);
        results.push({
          modelId: model.id,
          modelName: model.name,
          taskId: task.id,
          sampleId: sample.id,
          input: sample.input,
          output: gen.output,
          score: evaln.score,
          subscores: evaln.subscores,
          notes: evaln.notes,
          latencyMs: gen.latencyMs,
          inputTokens: gen.inputTokens,
          outputTokens: gen.outputTokens,
          costUsd: gen.costUsd,
          vramGB: gen.vramGB,
        });
      }
    }
  }
  return results;
}

export function validateConfig(
  config: Partial<RunConfig>,
  extraModels: ModelProfile[] = [],
): RunConfig {
  if (!config.modelIds?.length) throw new Error("モデルが選択されていません");
  if (!config.taskIds?.length) throw new Error("タスクが選択されていません");
  for (const id of config.modelIds) {
    resolveModel(id, extraModels);
  }
  for (const id of config.taskIds) {
    if (!getTask(id)) throw new Error(`Unknown task: ${id}`);
  }
  const datasetIds: Record<string, string> = { ...(config.datasetIds ?? {}) };
  for (const taskId of config.taskIds) {
    datasetIds[taskId] = datasetForTask(taskId, datasetIds[taskId]).id;
  }
  return {
    modelIds: config.modelIds,
    taskIds: config.taskIds,
    datasetIds,
    seed: config.seed ?? "jp-bench-v1",
    mode: "sandbox",
  };
}
