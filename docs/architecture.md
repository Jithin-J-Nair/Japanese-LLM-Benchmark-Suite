# アーキテクチャ — LLM-JP-Bench

## 設計思想

20年分の評価基盤開発で学んだ原則を凝縮している:

1. **宣言と実行の分離** — モデル・タスク・データセットは純粋な宣言（レジストリ）。実行ロジック（エンジン）はそれらに一切依存しない。
2. **損失なしの永続化** — 集計値をDBに保存せず、サンプル単位の生結果のみ保存。集計は読み出し時に計算するため、粒度を失わず再分析可能。
3. **決定性** — 乱数はすべて `seed` 由来のPRNG。再現できないベンチマークはベンチマークではない。
4. **透明な評価** — スコアは「隠れたLLMジャッジ」ではなく説明可能なルールで算出し、サブスコアと根拠メモを必ず併記する。

## システム構成図

```
┌──────────────────────────── Next.js App Router ───────────────────────────┐
│                                                                          │
│  ┌─ Pages (RSC) ─────────────┐   ┌─ Route Handlers (/api) ────────────┐  │
│  │ /            dashboard     │   │ POST /api/runs          run+store   │  │
│  │ /benchmarks/new  config    │   │ GET  /api/runs          history     │  │
│  │ /runs/[id]       report    │   │ GET  /api/runs/[id]     full run    │  │
│  │ /models          registry  │   │ GET  ../[id]/export     csv/json/md │  │
│  │ /datasets        assets    │   │ POST /api/models/health healthcheck │  │
│  │ /docs/[slug]     docs hub  │   │ GET  /api/{models,tasks,datasets}  │  │
│  └────────┬───────────────────┘   └──────────────┬────────────────────┘  │
│           │                                      │                        │
│           └──────────────► src/lib/server/queries.ts ◄────────────────   │
│                                     │ (Drizzle ORM)                       │
│                                     ▼                                    │
│                     ┌─────── Evaluation Core (pure) ────────┐             │
│                     │  types.ts      ドメイン型             │             │
│                     │  models.ts     モデルレジストリ        │             │
│                     │  tasks.ts      タスク＋ルーブリック    │             │
│                     │  datasets.ts   注釈付きデータセット    │             │
│                     │  simulator.ts  決定的生成器            │             │
│                     │  scoring.ts    ヒューリスティクス評価  │             │
│                     │  engine.ts     model×task×sample 実行  │             │
│                     │  aggregate.ts  集計＋所見生成          │             │
│                     │  export.ts     CSV/JSON/Markdown      │             │
│                     └───────────────────────────────────────┘             │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       ▼
                          PostgreSQL (runs / run_results)
```

## 層別の責務

### 1. Evaluation Core（`src/lib/bench/`）
副作用のない純粋モジュール群。Node以外（CIスクリプト、将来のワーカー）からも再利用可能。

- **`types.ts`** — `ModelProfile` / `TaskDefinition` / `Dataset` / `SampleResult` など全ドメイン型。
- **`random.ts`** — FNV-1aハッシュ + mulberry32 PRNG、トークン推定、バイグラム類似度、文分割。
- **`models.ts`** — モデルレジストリ。`skills: Record<TaskId, 0..1>` は社内評価ノートから採録した素養パラメータ。
- **`tasks.ts`** — タスク宣言とルーブリック（重みは合計1.0）。
- **`datasets.ts`** — キーポイント・参照文・方向メタデータ付きの日本語サンプル。
- **`simulator.ts`** — サンドボックス生成器。スキル確率でルール発火を制御し、強いモデルほど正確な敬語変換/翻訳/清書を行う。
- **`scoring.ts`** — タスク別スコアラー。`{ score, subscores[], notes[] }` を返す共通シグネチャ。
- **`engine.ts`** — 直積（model × task × sample）を走査し `SampleResult[]` を生成。`validateConfig` で設定を正規化。
- **`aggregate.ts` / `export.ts`** — 読み出し側の集計・所見生成・レポート構築。

### 2. 永続化（`src/db/` + `src/lib/server/queries.ts`）

```sql
runs           (id uuid PK, name, status, config jsonb, created_at)
run_results    (id uuid PK, run_id FK -> runs ON DELETE CASCADE,
                model_id, model_name, task_id, sample_id,
                input_text, output_text, score real,
                subscores jsonb, notes jsonb,
                latency_ms, input_tokens, output_tokens, cost_usd, vram_gb,
                created_at)
models_dynamic (id uuid PK, hf_id UNIQUE, name, author, description,
                tags jsonb, downloads, likes, license, quantization,
                params real, endpoint, skills jsonb, japanese int,
                last_refresh, created_at, updated_at)
```

`config jsonb` に `{modelIds, taskIds, datasetIds, seed, mode}` を保持するため、過去の任何の実行も完全に再現できる。`modelIds` には動的モデルID（`hf:org:name` 形式）も入り得る。

### 2b. HF自動検出（`src/lib/hf/discovery.ts` + `models_dynamic`）

```	RefreshModelsButton ──POST /api/models/refresh──► discoverModels()
                                                         │ search plan (7 queries, timeout+retry)
                                                         ▼ normalize / parseParams / parseQuantization
                                              Capability Estimator (推定スキル行列)
                                                         ▼
                                               upsertDiscovered() ──► models_dynamic (hf_id で冪等)
                                                         │
              ┌──────────────────────────────────────────┼───────────────────────────┐
              ▼                                          ▼                           ▼
     /models レジストリ (stat+動的統合・絞り込み)   /benchmarks/new セレクタ   /models/[id] インスペクタ
                                                         │
                                                         ▼
                                   engine extraModels 解決（sandbox で即評価可能）
```

### 3. API層（Route Handlers）

| Endpoint | Method | 役割 |
| --- | --- | --- |
| `/api/runs` | GET | 実行履歴（件数付き） |
| `/api/runs` | POST | ベンチマーク実行→永続化→ID返却 |
| `/api/runs/[id]` | GET | フル詳細（生結果含む） |
| `/api/runs/[id]/export?format=` | GET | csv / json / md をダウンロード応答 |
| `/api/models`, `/api/tasks`, `/api/datasets` | GET | レジストリ公開 |
| `/api/models/health` | POST | エンドポイント生存確認（2.5sタイムアウト） |
| `/api/health` | GET | DB疎通確認 |

### 4. UI層（RSC + Client Islands）

- ページはサーバーコンポーネントでデータ取得（API経由ではなく `queries.ts` 直参照→二重フェッチなし）。
- チャート・フォーム・サンプル検査のみ `"use client"` の島として分離。
- Recharts（Radar / Bar / Scatter）は事前集計済みデータを受け取る純粋ビュー。

## データフロー（実行〜保存〜表示）

```
User config ──POST /api/runs──► validateConfig ──► runBenchmark()
                                                       │ per sample
                                                  simulateOutput()
                                                  evaluateOutput()
                                                       ▼
                                              SampleResult[] ──► db.insert(run_results)
                                                       │
Report page ◄── aggregateOverall(keyFindings) ◄── getRun(id)
                                                       │
                                            ┌──────────┴──────────┐
                                       ScoreMatrix            SampleExplorer
                                       Charts (Radar/Bar/Scatter)
```

## 拡張ポイント

- **実モデル接続**: `ModelProfile.endpoint` + `adapters`（OpenAI互換/`Ollama`）を追加し、engine の `mode` を `endpoint` に切替。プロンプトテンプレートはタスク定義から生成する方針。
- **メタ評価（LLMジャッジ）**: `scoring.ts` の `evaluateOutput` 呼び出し位置で二次評価を合成（docs/evaluation.md 参照）。
- **カスタムデータセット**: `/api/runs` の `config.datasetIds` でタスク単位に差替。形式は docs/tasks.md。
