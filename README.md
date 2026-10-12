# LLM-JP-Bench — Japanese LLM Benchmark Suite

A reproducible evaluation harness for comparing Large Language Models on **Japanese-specific business tasks**. Built for AI engineers, product teams, and researchers who need to decide — with numbers — which LLM to adopt for Japanese workloads.

> 日本語版は [README_ja.md](./README_ja.md) を参照してください。

---

## Features

- **5 Japanese task suites**
  - 敬語リライト — rewrite casual Japanese into business keigo
  - ビジネスメール補正 — fix tone, politeness, and structure in business emails
  - 日本語要約 — ~100-character key-point summarization of news documents
  - ビジネス翻訳 — JP→EN / EN→JP with glossary-consistency checks
  - OCRクリーンアップ — punctuation restoration, spacing normalization, halfwidth-kana fixes
- **7-model static registry** mixing local quantized models (GGUF / Q4_K_M / Q5 / Q8, vLLM, Ollama) and API models, incl. Japanese-tuned ones (LLM-jp, Swallow, ELYZA).
- **HuggingFace Auto-Discovery** — one click scans the Hub for Japanese-relevant LLMs (llm-jp, elyza, swallow, rinna, qwen/llama/gemma-GGUF, …), extracts downloads/likes/license/quantization/parameter count, and upserts into PostgreSQL (`models_dynamic`).
- **Capability Estimator** — discovered models get a deterministic per-task skill matrix inferred from tags/description/params, so they can be benchmarked immediately in sandbox mode.
- **Model Metadata Inspector** (`/models/[id]`) — HF metadata, tags, license, skill matrix, endpoint health, per-model benchmark history, last refresh time.
- **Registry filtering** — Japanese / GGUF / local / API, parameter buckets, vendor, free-text search.
- **Measured per sample**: quality score (weighted, explainable rubrics), latency, input/output tokens, cost estimation (API), peak VRAM (local).
- **Deterministic pipeline**: a string-seeded PRNG drives all simulation jitter, so identical configs always reproduce identical scores.
- **Dashboard**: model×task score matrix, radar charts, quality-vs-latency scatter, per-task bars, and a side-by-side sample inspector with sub-score breakdowns and audit notes.
- **Exports**: CSV (per-sample), JSON (full run + aggregates), Markdown report with auto-generated findings.
- **Extensible by design**: adding a model = 1 registry entry; adding a task = 1 definition + 1 dataset + 1 scorer.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4, Recharts |
| Backend | Next.js Route Handlers (TypeScript) |
| Persistence | PostgreSQL via Drizzle ORM |
| Evaluation | Rule-based heuristics (transparent, no hidden judge) |
| Model access | Pluggable adapters: OpenAI-compatible HTTP, Ollama, or built-in deterministic sandbox |

## Quick start

```bash
# 1. install dependencies
npm install

# 2. configure PostgreSQL
#    .env must define DATABASE_URL, e.g.:
#    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db

# 3. push the schema
npx drizzle-kit push

# 4. run
npm run dev        # development
npm run build && npm run start   # production
```

Open http://localhost:3000 — the dashboard auto-seeds one full benchmark (7 models × 5 tasks) on first load.

## Repository layout

```
llm-jp-bench/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                    # Dashboard (leaderboard, radar, bars)
│  │  ├─ benchmarks/new/             # Run configuration wizard
│  │  ├─ runs/ , runs/[id]/          # History + full report page
│  │  ├─ models/ , datasets/ , docs/ # Registry, assets, docs hub
│  │  └─ api/
│  │     ├─ runs/ , runs/[id]/export/  # Run execution + CSV/JSON/MD export
│  │     ├─ models/ , models/health/   # Registry + health checks
│  │     ├─ tasks/ , datasets/ , docs/ # Registries + doc serving
│  ├─ components/                    # UI, charts, run config, report, inspector
│  ├─ db/                            # Drizzle schema + client
│  └─ lib/
│     ├─ bench/
│     │  ├─ types.ts       # Domain interfaces (ModelProfile, TaskDefinition, …)
│     │  ├─ models.ts      # Model registry + skill matrices
│     │  ├─ tasks.ts       # Task registry + rubrics
│     │  ├─ datasets.ts    # Built-in annotated Japanese datasets
│     │  ├─ simulator.ts   # Deterministic sandbox output generator
│     │  ├─ scoring.ts     # Heuristic scoring engine (weighted subscores)
│     │  ├─ engine.ts      # model × task × sample orchestrator
│     │  ├─ aggregate.ts   # Score/latency/cost aggregation + findings
│     │  └─ export.ts      # CSV / JSON / Markdown report builders
│     └─ server/queries.ts # Drizzle persistence + auto-seed
├─ docs/                    # architecture / evaluation / models / tasks
├─ README.md / README_ja.md
└─ drizzle.config.json
```

## How a benchmark works

1. Select models, tasks, and (optionally) alternate datasets in the **新規ベンチマーク** screen.
2. The engine iterates `model × task × sample`, generating outputs and evaluating each with the task's rubric.
3. Every sample logs: output text, weighted score + subscores + Japanese audit notes, latency (ms), tokens, cost (USD), VRAM peak.
4. Aggregates drive the report: score matrix, radar, quality/latency scatter, key findings ("Model X is best for keigo, Model Y is fastest").
5. Export as Markdown/CSV/JSON for tickets, wikis, or procurement decks.

### Sandbox vs. endpoint mode

By default the suite runs in **sandbox mode**: a deterministic generator parameterized by each model's recorded skill matrix produces reproducible outputs — ideal for offline demos, CI, and pipeline validation. Point `endpoint`/`apiKeyEnv` at a real service (OpenAI-compatible or Ollama) to measure live models; see [docs/models.md](./docs/models.md).

### HuggingFace auto-discovery

`POST /api/models/refresh` (also available as the **モデルを更新** button on the registry page) scans the Hub with Japanese-LLM-relevant search and tag filters, retries with exponential backoff on failure, and upserts results into `models_dynamic` (idempotent on `hf_id`). The response summarizes `added / updated / total`. Discovered models appear instantly in the registry (with filters), in the benchmark model selector, and in the inspector page — all with simulator-compatible estimated skill matrices.

## Language Settings (i18n)

The entire UI — navigation, buttons, tables, charts, forms, report findings, and Markdown exports — switches between **日本語 and English**:

- Use the **language dropdown** in the sidebar/mobile header, or the **Settings** page (ナビゲーションの「設定 / Settings」).
- **Flicker-free by design**: every localized string renders through client components subscribed to one `LanguageContext`. Switching updates React state only — no page reload, no `router.refresh()`, no layout re-mount, and **no scroll jump**.
- The preference persists in `localStorage` **and** a cookie (`jp-bench-lang`). The cookie seeds the server-rendered HTML so the very first paint already matches the client — zero hydration mismatch.
- First visit auto-detects `navigator.language` (Japanese → ja, otherwise → en); overridable anytime.

**How translations work:** all strings live in `src/i18n/` (`ja.ts` master keys, `en.ts` typed as `Record<I18nKey, string>` — missing keys fail at compile time). Client components call `useLanguage().t(key, vars)`; server-rendered pages insert text via the `<T/>` component family (`T`, `TaskName`, `RubricLabel`, `ModelDescription`, `LocalDateTime`), which subscribes to the same context.

**Adding a language:** implement a new `Record<I18nKey, string>` dictionary, register it in `src/i18n/index.ts`, and extend the selector — see [docs/i18n.md](./docs/i18n.md). Evaluation artifacts (model outputs, stored audit notes) intentionally remain in Japanese for data integrity.

## Documentation

- [docs/architecture.md](./docs/architecture.md) — components, data flow, design decisions
- [docs/evaluation.md](./docs/evaluation.md) — scoring methodology per task, limitations, extensions
- [docs/models.md](./docs/models.md) — adding/configuring models, local vs. API
- [docs/tasks.md](./docs/tasks.md) — task specs, dataset format, adding tasks
- [docs/i18n.md](./docs/i18n.md) — translation architecture, key structure, adding strings/languages
