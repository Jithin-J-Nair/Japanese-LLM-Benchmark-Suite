# モデルガイド — Model Registry

## モデルプロファイル

モデルは `src/lib/bench/models.ts` の `MODELS[]` に `ModelProfile` として宣言する。

```ts
{
  id: "qwen2.5-14b-instruct-q4",     // 一意のID（レポート・DBに記録される）
  name: "Qwen2.5 14B Instruct",      // 表示名
  vendor: "Alibaba Cloud",
  type: "local",                     // "local" | "api"
  parameterSizeB: 14,                // APIで非公開なら null
  quantization: "GGUF Q4_K_M",       // 表示用
  vramGB: 9.2,                       // ピークVRAM見積（APIは null）
  endpoint: null,                    // 実エンドポイント（未設定=サンドボックス）
  apiKeyEnv: null,                   // 環境変数名（APIのみ）
  costInputPer1M: 0,                 // USD / 1M tokens
  costOutputPer1M: 0,
  baseLatencyMs: 220,                // TTFT相当のベース
  tokensPerSecond: 44,               // 生成スループット見積
  color: "#2f5b8f",                  // チャート色
  descriptionJa: "…",                // レジストリ画面の説明
  skills: {                          // タスク別素養 0..1（サンドボックス生成のパラメータ）
    keigo_rewrite: 0.80, email_correction: 0.78, summarization: 0.85,
    translation: 0.88, ocr_cleanup: 0.75,
  },
}
```

## 新規モデルの追加手順

1. `models.ts` に1エントリ追加するだけ。UI・レポート・APIはレジストリを自動反映する。
2. `skills` の初期値は、社内で10サンプル程度のスモーク評価を行い、タスク別の凡評価（1.0=ほぼ完璧 / 0.5=半分崩壊）を記入する。
3. 実モデル計測へ移行したら `endpoint` を設定し、`mode: "endpoint"` で再実行して係数を校正する。

### ローカルモデル（GGUF / vLLM / Ollama）

```ts
{
  id: "my-jp-7b-q5",
  type: "local",
  endpoint: "http://192.168.1.20:8080",   // Ollama または llama.cpp server
  vramGB: 6.0,                            // nvidia-smi 実測 or (params×bits/8)×1.2 の見積
}
```

VRAM見積の目安:

| 量子化 | 7B | 13B |
| --- | --- | --- |
| Q4_K_M | ~4.5 GB | ~8.5 GB |
| Q5_K_M | ~5.3 GB | ~9.8 GB |
| Q8_0 | ~8.0 GB | ~14.5 GB |
| FP16 | ~15 GB | ~27 GB |

### APIモデル

```ts
{
  id: "gpt-4o-mini",
  type: "api",
  endpoint: "https://api.openai.com/v1/chat/completions",
  apiKeyEnv: "OPENAI_API_KEY",      // .env に設定（リポジトリに直書きしない）
  costInputPer1M: 0.15,
  costOutputPer1M: 0.60,
}
```

- APIキーは `process.env[apiKeyEnv]` でのみ参照。クライアントへ露出しない（`NEXT_PUBLIC_` プレフィックスは付けない）。
- ヘルスチェックは「キー有無 → エンドポイント到達（2.5sタイムアウト）」の2段階。

## ヘルスチェックの応答

| status | 意味 |
| --- | --- |
| `ok` | エンドポイント到達可能 |
| `sandbox` | ローカルプロファイル登録済み（シミュレーション評価可能） |
| `missing_key` | `apiKeyEnv` 未設定。サンドボックスでは実行可能 |
| `unreachable` | エンドポイント到達不可。FW/ポート/起動状態を確認 |

## HuggingFace 自動検出（models_dynamic）

`POST /api/models/refresh` が以下の検索プランで Hub API を走査する（各クエリ 8sタイムアウト・指数バックオフ2回リトライ）:

- `japanese-llm`, `llm-jp`, `elyza`, `swallow-llm`, `rinna`, `stockmark`（downloads 降順）
- `japanese` × `filter=gguf`

抽出項目: hf_id / name / author / description / tags / downloads / likes / license / quantization（idまたはggufタグから推定）/ params（`14B`, `4x7B` 等の表記をパース）。PEFTアダプタやデータセットリポジトリ、ほぼ無トラクションの派生物は低シグナルとして除外。

### Capability Estimator（推定スキル行列）

検出モデルにはレジストリ採録のスキルが無いため、`src/lib/bench/capability.ts` が **決定的ルール** で推定する:

- ベース 0.45〜0.55（タスク別）
- 日本語系ファミリ（llm-jp / elyza / swallow / rinna / stockmark / nekomata / shisa / plamo …）→ 敬語・メール +0.14/+0.12
- Qwen → 翻訳 +0.10 / 要約 +0.05、Llama・Gemma・Mistral（非日本語系）→ 敬語 -0.08
- `instruct/chat` → 要約 +0.05
- パラメータ規模: ≥20B で翻訳・要約 +0.08、<4B で全タスク -0.08
- 最終値は 0.30–0.92 にクリップ

乱数は使わず、同じメタデータには常に同じ推定値が付く（再現性維持）。**実運用では endpoint モードで実測し、推定値と突き合わせて校正する** ことを前提とする。

### 永続化とUI連携

- テーブル: `models_dynamic`（`hf_id` UNIQUE でアップサート、`last_refresh` 記録）
- 検出モデルの実行時IDは `hf:{org}:{name}`（URL安全）。レポート・履歴もこのIDで紐づく。
- モデルインスペクタ `/models/[id]`: HFメタデータ・スキル行列・エンドポイント健全性・ベンチマーク履歴・最終スキャン時刻を表示。
- 障害時: 全クエリ失敗なら `502 {status:"hf_unreachable"}`、DB書込失敗なら `500 {status:"db_error"}`。既存データは保持され、UIは再試行を促す。

## エンドポイントモードへの切替（拡張）

`engine.ts` の `RunConfig.mode === "endpoint"` 分岐にアダプタを実装する:

```ts
// OpenAI互換の例
const res = await fetch(`${model.endpoint}`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env[model.apiKeyEnv]}` },
  body: JSON.stringify({
    model: model.id,
    messages: buildPrompt(task, sample),
    temperature: 0,         // 再現性のため固定
    max_tokens: 1024,
  }),
});
```

- `temperature: 0` 固定、逐次実行または `p-limit` でレート制御。
- 応答の `usage` をそのままトークン記録に使用。VRAMはローカル側で `nvidia-smi` から随時サンプル可。
- 失敗時はリトライ（指数バックオフ）→ 2回失敗で `status: failed` とし、部分結果は保存する設計が推奨。
