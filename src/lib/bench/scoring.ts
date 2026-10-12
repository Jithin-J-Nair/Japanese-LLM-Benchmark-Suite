/**
 * Heuristic scoring engine.
 *
 * Every task is scored by an explainable function over the raw output text —
 * no hidden LLM judge in the default pipeline (see docs/evaluation.md for the
 * optional meta-evaluation extension point). Scores are 0-100 and reported
 * with weighted subscores plus Japanese audit notes.
 */
import type { BenchmarkSample, Evaluation, Subscore, TaskId } from "./types";
import { bigramSimilarity, clamp, countMatches, round, splitSentences } from "./random";
import { getTask } from "./tasks";
import { goldTranslation } from "./simulator";

/* ------------------------------ shared regexes ---------------------------- */

const POLITE_END = /(です|ます|でした|ました|ございます|ますでしょうか|ません|でしょう|ください|幸い|いたします|参ります|お願い|存じます|賜り)[。？！]?$/;
const HONORIFIC = /おっしゃ|いらっしゃ|ご覧|お送り|送付|お伺い|伺|申し訳|いただ|いたし|拝見|ご教示|ご確認|ご検討|ご返信|ご連絡|ご相談|ご注文|恐れ入|幸い|何卒|差し上げ|お見積もり|お引き立て|御礼|申し上げ|ご調整|ご変更|ご指示|存じ/g;
const CASUAL = /だよ|だね|じゃん|よね|かな[。？！]?|まだー|あとで|帰るね|ごめん|早く|できた[？?]|してよ|あいてる|なった[？?]|けど[^。]*[じゃ]/g;
const HALFWIDTH_KANA = /[ｦ-ﾝﾞﾟ]/g;

function endingRatio(sentences: string[]): number {
  if (!sentences.length) return 0;
  const polite = sentences.filter((sen) => POLITE_END.test(sen)).length;
  return polite / sentences.length;
}

function honorificDensityScore(text: string): number {
  const sentences = Math.max(1, splitSentences(text).length);
  const hits = countMatches(text, HONORIFIC);
  return clamp((hits / sentences) * 75, 0, 100);
}

function casualPenalty(text: string): number {
  return clamp(100 - countMatches(text, CASUAL) * 28, 0, 100);
}

/** Corridor score: 100 inside [lo, hi], linear decay outside. */
function corridor(ratio: number, lo: number, hi: number, span = 0.9): number {
  if (ratio >= lo && ratio <= hi) return 100;
  const dist = ratio < lo ? lo - ratio : ratio - hi;
  return clamp(100 - (dist / span) * 100, 0, 100);
}

function weighted(subscores: Subscore[], notes: string[]): Evaluation {
  const total = subscores.reduce((s, x) => s + x.score * x.weight, 0);
  return { score: round(clamp(total, 0, 100)), subscores, notes };
}

function sub(task: TaskId, metric: string, score: number): Subscore {
  const item = getTask(task)!.rubric.find((r) => r.metric === metric)!;
  return { metric, metricJa: item.metricJa, weight: item.weight, score: round(clamp(score, 0, 100)) };
}

/* ------------------------------ task scorers ------------------------------ */

function scoreKeigo(input: string, output: string): Evaluation {
  const sentences = splitSentences(output);
  const pol = endingRatio(sentences) * 100;
  const hon = honorificDensityScore(output);
  const cas = casualPenalty(output);
  const con = corridor(output.length / Math.max(1, input.length), 0.9, 2.3, 1.6);
  const notes = [
    `丁寧文末 ${sentences.filter((s) => POLITE_END.test(s)).length}/${sentences.length} 文`,
    `尊敬・謙譲表現 ${countMatches(output, HONORIFIC)} 件検出`,
    countMatches(output, CASUAL) > 0
      ? `砕け表現 ${countMatches(output, CASUAL)} 件残存`
      : "砕け表現の残存なし",
  ];
  return weighted(
    [
      sub("keigo_rewrite", "politeness", pol),
      sub("keigo_rewrite", "honorifics", hon),
      sub("keigo_rewrite", "casualness", cas),
      sub("keigo_rewrite", "conciseness", con),
    ],
    notes,
  );
}

function scoreEmail(output: string): Evaluation {
  const lines = output.split("\n").map((l) => l.trim()).filter(Boolean);
  const hasRecipient = /様|御中|各位/.test(lines[0] ?? "");
  const hasGreeting = /お世話になっております|いつもお世話|ご無沙汰|突然のご連絡/.test(output);
  const hasClosing = /何卒|よろしくお願い|今後とも/.test(output);
  const hasSignature = /──|株式会社|部 |課 |様々/.test(output) || /(営業部|開発部|人事部|経理部|情報システム部)/.test(output);
  const structure =
    ((hasRecipient ? 1 : 0) + (hasGreeting ? 1 : 0) + (hasClosing ? 1 : 0) + (hasSignature ? 1 : 0)) * 25;

  const bodySentences = splitSentences(output.replace(/\n/g, ""));
  const pol = endingRatio(bodySentences) * 100;
  const hon = honorificDensityScore(output);
  const tonality = pol * 0.6 + hon * 0.4;
  const formality = casualPenalty(output);

  const notes = [
    `構造: 宛名${hasRecipient ? "◯" : "×"} / 挨拶${hasGreeting ? "◯" : "×"} / 結び${hasClosing ? "◯" : "×"} / 署名${hasSignature ? "◯" : "×"}`,
    `丁寧文末 ${bodySentences.filter((s) => POLITE_END.test(s)).length}/${bodySentences.length} 文`,
    `敬語表現 ${countMatches(output, HONORIFIC)} 件検出`,
  ];
  return weighted(
    [
      sub("email_correction", "structure", structure),
      sub("email_correction", "tonality", tonality),
      sub("email_correction", "formality", formality),
    ],
    notes,
  );
}

function scoreSummary(sample: BenchmarkSample, output: string): Evaluation {
  const keyPoints = sample.keyPoints ?? [];
  const hit = keyPoints.filter((kp) => output.includes(kp));
  const coverage = keyPoints.length ? (hit.length / keyPoints.length) * 100 : 60;
  const target = 100;
  const lengthControl = clamp(100 - Math.abs(output.length - target) * 1.1, 0, 100);
  const endsClean = /[。！？]$/.test(output.trim());
  const noMerge = !/[、とや]$/.test(output.trim().replace(/[。]$/, ""));
  const sentences = splitSentences(output);
  const unique = new Set(sentences).size === sentences.length;
  const fluency = (endsClean ? 45 : 0) + (noMerge ? 30 : 0) + (unique ? 25 : 0);
  const ratio = output.length / Math.max(1, sample.input.length);
  const compression = ratio < 0.45 ? 100 : ratio < 0.6 ? 75 : ratio < 0.75 ? 45 : 20;

  const notes = [
    `キーポイント網羅 ${hit.length}/${keyPoints.length} (${hit.join("・") || "なし"})`,
    `要約長 ${output.length} 字 (目標 ~${target} 字)`,
    `圧縮率 ${round(ratio * 100)}%`,
  ];
  return weighted(
    [
      sub("summarization", "coverage", coverage),
      sub("summarization", "length_control", lengthControl),
      sub("summarization", "fluency", fluency),
      sub("summarization", "compression", compression),
    ],
    notes,
  );
}

const JP_CHAR = /[ぁ-んァ-ヶ一-龯]/g;

function scoreTranslation(sample: BenchmarkSample, output: string): Evaluation {
  const direction = (sample.meta?.direction ?? "ja2en") as "ja2en" | "en2ja";
  const terms = sample.keyPoints ?? [];
  const normalized = output.toLowerCase();
  const hit = terms.filter((t) => normalized.includes(t.toLowerCase()));
  const terminology = terms.length ? (hit.length / terms.length) * 100 : 70;

  const gold = goldTranslation(sample.input, direction);
  const fidelity = bigramSimilarity(output, gold) * 100;

  const jpCount = countMatches(output, JP_CHAR);
  const enWords = countMatches(output, /[A-Za-z]{2,}/g);
  const totalUnits = Math.max(1, jpCount + enWords);
  const residue = direction === "ja2en" ? jpCount / (totalUnits * 6) : enWords / (totalUnits * 0.2);
  const purity = clamp(100 - residue * 100, 0, 100);

  const register =
    direction === "ja2en"
      ? /please|kindly|appreciate|thank you/i.test(output)
        ? 100
        : 35
      : countMatches(output, HONORIFIC) > 0
        ? clamp(60 + countMatches(output, HONORIFIC) * 12, 0, 100)
        : 30;

  const notes = [
    `用語ヒット ${hit.length}/${terms.length} (${hit.join(", ") || "なし"})`,
    `参照訳類似度 ${round(fidelity)}%`,
    `未翻訳残存: ${direction === "ja2en" ? `和字 ${jpCount} 字` : `欧文単語 ${enWords} 語`}`,
  ];
  return weighted(
    [
      sub("translation", "terminology", terminology),
      sub("translation", "fidelity", fidelity),
      sub("translation", "target_purity", purity),
      sub("translation", "register", register),
    ],
    notes,
  );
}

function scoreOcr(sample: BenchmarkSample, output: string): Evaluation {
  const reference = sample.reference ?? "";
  const similarity = bigramSimilarity(output, reference) * 100;

  const punct = countMatches(output, /[。、]/g);
  const density = punct / Math.max(1, output.length) * 25; // marks per ~25 chars
  const punctuation = corridor(density, 0.6, 2.2, 2.2);

  const irregularSpaces = countMatches(output, /[ぁ-んァ-ヶ一-龯]\s+[ぁ-んァ-ヶ一-龯]/g) +
    countMatches(output, /\d\s+\d/g);
  const spacing = clamp(100 - irregularSpaces * 14, 0, 100);

  const halfLeft = countMatches(output, HALFWIDTH_KANA);
  const scriptNorm = clamp(100 - halfLeft * 12, 0, 100);

  const notes = [
    `参照類似度 ${round(similarity)}% (文字バイグラム)`,
    `句読点 ${punct} 件`,
    irregularSpaces > 0 ? `不規則な空白 ${irregularSpaces} 件残存` : "空白正規化済み",
    halfLeft > 0 ? `半角カナ ${halfLeft} 文字残存` : "半角カナ残存なし",
  ];
  return weighted(
    [
      sub("ocr_cleanup", "similarity", similarity),
      sub("ocr_cleanup", "punctuation", punctuation),
      sub("ocr_cleanup", "spacing", spacing),
      sub("ocr_cleanup", "script_norm", scriptNorm),
    ],
    notes,
  );
}

/* ------------------------------ public entry ------------------------------ */

export function evaluateOutput(
  taskId: TaskId,
  sample: BenchmarkSample,
  output: string,
): Evaluation {
  switch (taskId) {
    case "keigo_rewrite":
      return scoreKeigo(sample.input, output);
    case "email_correction":
      return scoreEmail(output);
    case "summarization":
      return scoreSummary(sample, output);
    case "translation":
      return scoreTranslation(sample, output);
    case "ocr_cleanup":
      return scoreOcr(sample, output);
  }
}
