# タスク定義 — Task & Dataset Specifications

## タスクの構造

タスクは「宣言（`tasks.ts`）」＋「データセット（`datasets.ts`）」＋「スコアラー（`scoring.ts`）」の3点セット。

```ts
interface TaskDefinition {
  id: TaskId;                // "keigo_rewrite" 等（DB保存値）
  nameJa / shortJa: string;  // 表示用
  descriptionJa: string;
  defaultDatasetId: string;  // 既定データセット
  targetLength: number|null; // 要約の目標文字列なす
  rubric: RubricItem[];      // 重み合計1.0
}
```

## 組み込みタスク一覧

| id | 名称 | 入力 | 期待出力 | 主メトリクス |
| --- | --- | --- | --- | --- |
| `keigo_rewrite` | 敬語リライト | カジュアルな一文 | ビジネス敬語文 | 尊敬・謙譲語密度 35% |
| `email_correction` | ビジネスメール補正 | ラフなメール下書き | 書式整った正式メール | 構造 40% |
| `summarization` | 日本語要約 | ニュース記事（~200字） | ~100字の要約 | 要点網羅率 50% |
| `translation` | ビジネス翻訳 | JPまたはEN文 | ENまたはJPの訳文 | 用語整合性 40% |
| `ocr_cleanup` | OCRクリーンアップ | ノイズ入りOCR文字列 | 清書テキスト | 参照類似度 45% |

## データセット形式

```ts
interface BenchmarkSample {
  id: string;                    // "news-01"
  input: string;                 // モデル入力
  reference?: string;            // 正解参照（類似度系タスクで使用）
  keyPoints?: string[];          // 網羅すべき要点/用語
  meta?: Record<string,string>;  // 方向(ja2en/en2ja)、宛名・差出人、用語集 等
}

interface Dataset {
  id: string;                    // タスクに紐づく一意ID
  taskId: TaskId;
  samples: BenchmarkSample[];    // 最低5件を推奨（統計信頼のため10件以上が理想）
}
```

### 設計指針

- **keyPoints は「出力に表層出現すべき文字列」で指定**（スコアラーは `includes` で照合）。
- OCRタスクは `reference` を必須化（類似度の分母）。
- 翻訳は `meta.direction` と `meta.glossary`（`見積もり→quotation` 形式）を併記。
- サンプルIDは `task-nn` 形式で順序安定に。

## 新規タスクの追加手順

1. `types.ts` の `TaskId` union を拡張し `TASK_IDS` に追加。
2. `tasks.ts` にルーブリック付きで宣言（重み合計=1.0、UIが自動反映）。
3. `datasets.ts` に注釈付きデータセットを登録。
4. `simulator.ts` に生成関数、`scoring.ts` にスコアラーを追加（`evaluateOutput` の switch に1ケース）。
5. 運用: まずサンドボックスで既知の良/悪出力を喰わせ、スコア順序が直感と一致するか検証してから採用。

## カスタムデータセットの差し替え

`/api/runs` 呼び出し時にタスク単位で指定:

```json
{
  "config": {
    "modelIds": ["llmjp-3-13b-instruct", "gpt-4o-mini"],
    "taskIds": ["summarization"],
    "datasetIds": { "summarization": "news_summary_v1" },
    "seed": "my-experiment-2026q1"
  }
}
```

外部CSV/JSON取込は `Dataset` スキーマへ変換してから登録する方針（変換バリデータは `datasets.ts` と同型のzod/手検証を推奨）。

## 評価メトリクス設計の作法（20年分の教訓）

1. **1メトリクス1責務** — 「丁寧さ」と「構造」を混ぜると原因が追えなくなる。
2. **重みは採用判断と逆算で決める** — 敬語導線では尊敬・謙譲語ミスが最も致命的 → 35%。
3. **ペナルティは件数比例、上限クリップ** — 1件の暴落で全体を歪めない。
4. **監査メモを必ず残す** — 採点根拠を人が読める形で notes に書き出す（UIのサンプル検査に表示）。
