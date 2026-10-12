/**
 * Model registry.
 *
 * Every model is described by a `ModelProfile`. Models with a configured
 * `endpoint` are served by the HTTP adapter in `adapters.ts` (OpenAI-
 * compatible or Ollama); models without one fall back to the deterministic
 * sandbox generator, parameterized by the `skills` matrix recorded from
 * internal evaluation notes. This keeps the harness fully functional offline
 * while staying honest about what is measured vs. simulated.
 */
import type { ModelProfile, TaskId } from "./types";

const skills = (
  keigo: number,
  email: number,
  summary: number,
  translation: number,
  ocr: number,
): Record<TaskId, number> => ({
  keigo_rewrite: keigo,
  email_correction: email,
  summarization: summary,
  translation,
  ocr_cleanup: ocr,
});

export const MODELS: ModelProfile[] = [
  {
    id: "llmjp-3-13b-instruct",
    name: "LLM-jp-3 13B Instruct",
    vendor: "LLM-jp (国立研究開発法人 産総研ほか)",
    type: "local",
    parameterSizeB: 13,
    quantization: "FP16 (vLLM)",
    vramGB: 27.5,
    endpoint: null,
    apiKeyEnv: null,
    costInputPer1M: 0,
    costOutputPer1M: 0,
    baseLatencyMs: 240,
    tokensPerSecond: 21,
    color: "#c73e1d",
    descriptionJa:
      "国産大規模言語モデル。日本語コーパス重視の事前学習により敬語・公用文に強い。敬語リライトのベースライン。",
    skills: skills(0.93, 0.9, 0.82, 0.76, 0.79),
  },
  {
    id: "qwen2.5-14b-instruct-q4",
    name: "Qwen2.5 14B Instruct",
    vendor: "Alibaba Cloud",
    type: "local",
    parameterSizeB: 14,
    quantization: "GGUF Q4_K_M (llama.cpp)",
    vramGB: 9.2,
    endpoint: null,
    apiKeyEnv: null,
    costInputPer1M: 0,
    costOutputPer1M: 0,
    baseLatencyMs: 220,
    tokensPerSecond: 44,
    color: "#2f5b8f",
    descriptionJa:
      "多言語性能が高く、翻訳タスクで安定。量子化によりVRAM 10GB未満で運用可能な実務寄りの選択肢。",
    skills: skills(0.8, 0.78, 0.85, 0.88, 0.75),
  },
  {
    id: "llama-3.1-8b-instruct-q5",
    name: "Llama 3.1 8B Instruct",
    vendor: "Meta",
    type: "local",
    parameterSizeB: 8,
    quantization: "Ollama Q5_K_M",
    vramGB: 6.1,
    endpoint: null,
    apiKeyEnv: null,
    costInputPer1M: 0,
    costOutputPer1M: 0,
    baseLatencyMs: 160,
    tokensPerSecond: 82,
    color: "#6b7280",
    descriptionJa:
      "英語中心の事前学習のため日本語敬語はやや弱い。一方で推論速度が速く、レスポンシブな用途に向く。",
    skills: skills(0.6, 0.58, 0.68, 0.66, 0.54),
  },
  {
    id: "gemma-2-9b-it-q4",
    name: "Gemma 2 9B IT",
    vendor: "Google",
    type: "local",
    parameterSizeB: 9,
    quantization: "GGUF Q4_0 (llama.cpp)",
    vramGB: 6.4,
    endpoint: null,
    apiKeyEnv: null,
    costInputPer1M: 0,
    costOutputPer1M: 0,
    baseLatencyMs: 175,
    tokensPerSecond: 74,
    color: "#8f6f2f",
    descriptionJa:
      "軽量クラスでは堅牢だが日本語の敬語変換は苦手傾向。サマリ・OCR系でスコアのばらつきが出やすい。",
    skills: skills(0.56, 0.6, 0.66, 0.6, 0.51),
  },
  {
    id: "swallow-7b-ms-q8",
    name: "Swallow 7B (JP-tuned)",
    vendor: "東京工業大学 岡崎研究室",
    type: "local",
    parameterSizeB: 7,
    quantization: "GGUF Q8_0",
    vramGB: 8.6,
    endpoint: null,
    apiKeyEnv: null,
    costInputPer1M: 0,
    costOutputPer1M: 0,
    baseLatencyMs: 190,
    tokensPerSecond: 58,
    color: "#3f7a5c",
    descriptionJa:
      "Llama 2 ベースに日本語継続事前学習。敬語の素養は高いが、長文要約の収束性に個体差がある。",
    skills: skills(0.74, 0.71, 0.62, 0.6, 0.64),
  },
  {
    id: "elyza-llama3-8b-q4",
    name: "ELYZA Llama-3 8B (JP)",
    vendor: "ELYZA",
    type: "local",
    parameterSizeB: 8,
    quantization: "GGUF Q4_K_M",
    vramGB: 5.3,
    endpoint: null,
    apiKeyEnv: null,
    costInputPer1M: 0,
    costOutputPer1M: 0,
    baseLatencyMs: 185,
    tokensPerSecond: 86,
    color: "#7a4f8f",
    descriptionJa:
      "日本語チューニング済みのLlama 3系。指示追従が安定しており、メール補正タスクと相性が良い。",
    skills: skills(0.79, 0.77, 0.7, 0.66, 0.6),
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini (API)",
    vendor: "OpenAI",
    type: "api",
    parameterSizeB: null,
    quantization: null,
    vramGB: null,
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    costInputPer1M: 0.15,
    costOutputPer1M: 0.6,
    baseLatencyMs: 480,
    tokensPerSecond: 118,
    color: "#1f8f6f",
    descriptionJa:
      "軽量な商用APIモデル。全タスクで高い安定性。VRAM不要・コスト従量制の比較対象として登録。",
    skills: skills(0.86, 0.88, 0.9, 0.92, 0.87),
  },
];

export function getModel(id: string): ModelProfile | undefined {
  return MODELS.find((m) => m.id === id);
}

export const MODEL_NAME_MAP = Object.fromEntries(MODELS.map((m) => [m.id, m.name]));
