/**
 * Task registry.
 *
 * A task is pure declaration: identity, description, default dataset and the
 * scoring rubric. The executable evaluation logic lives in `scoring.ts`,
 * keyed by task id. To add a task: extend TaskId, add a definition here,
 * a dataset, and a scorer — nothing else in the system needs to change.
 */
import type { TaskDefinition, TaskId } from "./types";

export const TASKS: TaskDefinition[] = [
  {
    id: "keigo_rewrite",
    name: "keigo_rewrite",
    nameJa: "敬語リライト",
    shortJa: "敬語",
    description: "Rewrite casual Japanese into proper business keigo.",
    descriptionJa:
      "砕けた日本語を、ビジネスで通用する適切な敬語へ書き換えるタスク。尊敬語・謙譲語・丁寧語の正確さと簡潔さを評価する。",
    icon: "message-square-quote",
    defaultDatasetId: "keigo_business_v1",
    targetLength: null,
    rubric: [
      {
        metric: "politeness",
        metricJa: "丁寧性",
        weight: 0.3,
        description: "Ratio of desu/masu polite sentence endings.",
        descriptionJa: "「です・ます・ございます」調の文末比率。",
      },
      {
        metric: "honorifics",
        metricJa: "尊敬・謙譲語",
        weight: 0.35,
        description: "Density of sonkeigo/kenjougo patterns (お/ご〜, いただく, 伺う…).",
        descriptionJa: "「お/ご〜・いただく・伺う」等の尊敬語・謙譲語の出現密度。",
      },
      {
        metric: "casualness",
        metricJa: "砕け表現の除去",
        weight: 0.2,
        description: "Penalty for residual casual markers (だよ/じゃん/〜だね…).",
        descriptionJa: "「だよ・じゃん・〜だね」等の残存カジュアル表現へのペナルティ。",
      },
      {
        metric: "conciseness",
        metricJa: "簡潔さ",
        weight: 0.15,
        description: "Output length ratio vs. input within a sane corridor.",
        descriptionJa: "入力に対する出力長の比率が妥当な範囲に収まるか。",
      },
    ],
  },
  {
    id: "email_correction",
    name: "email_correction",
    nameJa: "ビジネスメール補正",
    shortJa: "メール",
    description: "Fix tone, politeness and structure in Japanese business emails.",
    descriptionJa:
      "ビジネスメールのトーン・敬語・構造（宛名・挨拶・本文・結び・署名）を補正するタスク。",
    icon: "mails",
    defaultDatasetId: "business_email_v1",
    targetLength: null,
    rubric: [
      {
        metric: "structure",
        metricJa: "構造の完全性",
        weight: 0.4,
        description: "Presence of recipient, greeting, closing phrase and signature.",
        descriptionJa: "宛名・挨拶・結び挨拶・署名の有無。",
      },
      {
        metric: "tonality",
        metricJa: "トーン",
        weight: 0.35,
        description: "Polite endings plus honorific density across the body.",
        descriptionJa: "本文の丁寧文末比率と敬語密度。",
      },
      {
        metric: "formality",
        metricJa: "フォーマル度",
        weight: 0.25,
        description: "Absence of casual/ambiguous phrasing.",
        descriptionJa: "砕け表現・曖昧表現の残存がないこと。",
      },
    ],
  },
  {
    id: "summarization",
    name: "summarization",
    nameJa: "日本語要約",
    shortJa: "要約",
    description: "Summarize Japanese documents to a fixed target length.",
    descriptionJa:
      "ニュース記事等の日本語文書を約100字へ要約。キーポイント網羅率・長さ制御・流暢さを評価する。",
    icon: "scan-text",
    defaultDatasetId: "news_summary_v1",
    targetLength: 100,
    rubric: [
      {
        metric: "coverage",
        metricJa: "要点網羅率",
        weight: 0.5,
        description: "Fraction of annotated key points present in the summary.",
        descriptionJa: "注釈付きキーポイントのうち要約が含む割合。",
      },
      {
        metric: "length_control",
        metricJa: "長さ制御",
        weight: 0.2,
        description: "Distance from the ~100 character target.",
        descriptionJa: "目標100字からの乖離度。",
      },
      {
        metric: "fluency",
        metricJa: "流暢さ",
        weight: 0.2,
        description: "Sentence-terminated, non-truncated, non-redundant output.",
        descriptionJa: "文末が閉じ、途中切断や重複がないこと。",
      },
      {
        metric: "compression",
        metricJa: "圧縮率",
        weight: 0.1,
        description: "Output is meaningfully shorter than the source.",
        descriptionJa: "原文に対して十分に圧縮されていること。",
      },
    ],
  },
  {
    id: "translation",
    name: "translation",
    nameJa: "ビジネス翻訳",
    shortJa: "翻訳",
    description: "JP→EN and EN→JP translation with business tone and glossary consistency.",
    descriptionJa:
      "日英・英日の双方向翻訳。グロッサリ用語の整合性・対象言語純度・丁寧さを評価する。",
    icon: "languages",
    defaultDatasetId: "translation_biz_v1",
    targetLength: null,
    rubric: [
      {
        metric: "terminology",
        metricJa: "用語整合性",
        weight: 0.4,
        description: "Glossary terms translated with the mandated equivalents.",
        descriptionJa: "グロッサリ指定の用語が指定訳語で訳出されているか。",
      },
      {
        metric: "fidelity",
        metricJa: "意味忠実性",
        weight: 0.3,
        description: "Char-bigram similarity against reference translation.",
        descriptionJa: "参照訳との文字バイグラム類似度。",
      },
      {
        metric: "target_purity",
        metricJa: "対象言語純度",
        weight: 0.2,
        description: "No untranslated residue in the source language.",
        descriptionJa: "ソース言語の残存（未翻訳断片）がないこと。",
      },
      {
        metric: "register",
        metricJa: "語調",
        weight: 0.1,
        description: "Business register markers in the target language.",
        descriptionJa: "対象言語でのビジネス語調マーカーの存在。",
      },
    ],
  },
  {
    id: "ocr_cleanup",
    name: "ocr_cleanup",
    nameJa: "OCRクリーンアップ",
    shortJa: "OCR",
    description: "Clean noisy OCR text: punctuation, spacing, halfwidth kana, word splits.",
    descriptionJa:
      "句読点欠落・空白崩壊・半角カナ混在のOCRテキストを清書。参照との類似度と記号正規化を評価する。",
    icon: "wand-sparkles",
    defaultDatasetId: "ocr_noisy_v1",
    targetLength: null,
    rubric: [
      {
        metric: "similarity",
        metricJa: "参照類似度",
        weight: 0.45,
        description: "Char-bigram Dice similarity against the gold transcription.",
        descriptionJa: "正解清書テキストとの文字バイグラム類似度。",
      },
      {
        metric: "punctuation",
        metricJa: "句読点の復元",
        weight: 0.2,
        description: "Sentence-final punctuation restored at a plausible density.",
        descriptionJa: "句読点の密度が妥当な範囲に復元されていること。",
      },
      {
        metric: "spacing",
        metricJa: "空白の正規化",
        weight: 0.2,
        description: "No irregular intra-word spaces; numerals regrouped.",
        descriptionJa: "単語内空白や数字の分断が解消されていること。",
      },
      {
        metric: "script_norm",
        metricJa: "文字種の正規化",
        weight: 0.15,
        description: "Halfwidth kana normalized to fullwidth.",
        descriptionJa: "半角カナが全角へ正規化されていること。",
      },
    ],
  },
];

export function getTask(id: string): TaskDefinition | undefined {
  return TASKS.find((t) => t.id === id);
}

export const TASK_NAME_MAP = Object.fromEntries(
  TASKS.map((t) => [t.id, t.nameJa]),
) as Record<TaskId, string>;
