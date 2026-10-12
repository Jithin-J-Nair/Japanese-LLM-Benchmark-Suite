/**
 * Deterministic sandbox generator.
 *
 * Produces reproducible per-model outputs without GPU access. The parameter
 * is the model's task skill (0..1): each transformation in the pipeline
 * fires with probability ~= skill, so stronger models apply more of the
 * expected keigo / glossary / cleanup edits. Seeding derives from
 * (model, task, sample, run-seed) which makes every benchmark re-runnable.
 *
 * When a real `endpoint` is configured on the model profile, `engine.ts`
 * can be switched to endpoint mode — see docs/models.md.
 */
import type { BenchmarkSample, InferenceMetrics, ModelProfile, TaskDefinition } from "./types";
import { effectiveSkill, estimateTokens, jitter, rngFor, splitSentences, clamp } from "./random";

/* ================================ 敬語ルール =============================== */

interface ReplaceRule {
  re: RegExp;
  to: string | string[];
}

/** Ordered phrase-level rules, from most specific to most generic. */
const KEIGO_RULES: ReplaceRule[] = [
  { re: /この前の/g, to: "先日の" },
  { re: /さっきの/g, to: "先ほどの" },
  { re: /ごめん/g, to: "誠に申し訳ございません" },
  { re: /もう直したから/g, to: "すでに修正いたしましたので" },
  { re: /確認しといて/g, to: "ご確認いただけますと幸いです" },
  { re: /行けないんだよね/g, to: "出席できかねます" },
  { re: /あとで/g, to: "後ほど" },
  { re: /送っとくから/g, to: ["お送りいたします", "送付いたします"] },
  { re: /部長が言ってた/g, to: ["部長がおっしゃっていた", "部長が話されていた"] },
  { re: /どうなった？/g, to: "進捗はいかがでしょうか。" },
  { re: /早く教えて/g, to: "ご教示いただけますでしょうか" },
  { re: /見積もり/g, to: "お見積もり" },
  { re: /できた？/g, to: "ができましたでしょうか。" },
  { re: /高すぎたら安くしてよ/g, to: "ご予算にあわせてご調整いただけますと幸いです" },
  { re: /今日はもう帰るね/g, to: "本日はこれにて失礼いたします" },
  { re: /残りは明日やるからよろしく/g, to: "残作業は明日対応いたします" },
  { re: /メール見た？/g, to: "メールをご覧いただけましたでしょうか。" },
  { re: /返事まだー？/g, to: "ご返信をお待ちしております。" },
  { re: /ダメになった/g, to: "都合がつかなくなりました" },
  { re: /お願い\n|お願い$/g, to: "ご調整いただけますと幸いです\n" },
  { re: /送っといて/g, to: "ご送付いただけますと幸いです" },
  { re: /教えて/g, to: ["ご教示ください", "お知らせいただけますでしょうか"] },
  { re: /できたから/g, to: "完成いたしましたので" },
  { re: /見て/g, to: "ご確認ください" },
  { re: /直すとこあったら言って/g, to: "修正点がございましたらご指示いただけますと幸いです" },
  { re: /変えといて/g, to: "ご変更くださいますようお願い申し上げます" },
  { re: /相談したいんだけど/g, to: "ご相談させていただきたく存じますが" },
  { re: /あいてる？/g, to: ["ご都合はいかがでしょうか", "お時間をいただけますでしょうか"] },
  { re: /〜/g, to: "-" },
];

function applyRules(text: string, s: number, rng: () => number, rules: ReplaceRule[]): string {
  let out = text;
  for (const rule of rules) {
    if (!rule.re.test(out)) continue;
    if (rng() > s) {
      rule.re.lastIndex = 0;
      continue;
    }
    const choice = Array.isArray(rule.to)
      ? rule.to[Math.floor(rng() * rule.to.length)]
      : rule.to;
    out = out.replace(rule.re, choice);
    rule.re.lastIndex = 0;
  }
  return out;
}

function ensureSentenceEnd(text: string): string {
  const t = text.trim();
  return /[。！？…。]$/.test(t) ? t : t + "。";
}

/* ================================ タスク別生成 ============================== */

function genKeigo(input: string, s: number, rng: () => number): string {
  let out = applyRules(input, s, rng, KEIGO_RULES);
  // High-skill models soften requests with a preface.
  if (rng() < s * 0.6 && /(ください|でしょうか|幸い)/.test(out)) {
    out = "恐れ入りますが、" + out;
  }
  return ensureSentenceEnd(out);
}

function genEmail(sample: BenchmarkSample, s: number, rng: () => number): string {
  const recipient = sample.meta?.recipient ?? "〇〇様";
  const sender = sample.meta?.sender ?? "所属 氏名";
  const parts: string[] = [recipient];

  const withGreeting = rng() < s;
  const withClosing = rng() < s;
  const withSignature = rng() < s;

  if (withGreeting) {
    parts.push(
      `お世話になっております。\n${sender.split(" ").pop() ?? ""}でございます。`,
    );
  }

  // Strip the draft's raw recipient/sender lines before polishing the body.
  const rawLines = sample.input
    .split("\n")
    .filter(
      (line) =>
        line &&
        !/^(田中|鈴木|高橋|中村|小林|山田|佐藤|伊藤|加藤|吉田|渡辺|斎藤)さ?ん?へ?$/.test(line.trim()),
    );
  const body = applyRules(rawLines.join("\n"), s, rng, KEIGO_RULES);
  parts.push(body.trim());

  if (withClosing) parts.push("何卒よろしくお願いいたします。");
  if (withSignature) {
    parts.push("────────────────────\n" + sender);
  }
  return parts.join("\n\n");
}

function genSummary(
  sample: BenchmarkSample,
  task: TaskDefinition,
  s: number,
  rng: () => number,
): string {
  const sentences = splitSentences(sample.input);
  const keyPoints = sample.keyPoints ?? [];
  // Quadratic capture rate spreads weak extractive models further down:
  // one retained sentence often covers several points at once.
  const captured = keyPoints.filter(() => rng() < s * s);
  const target = task.targetLength ?? 100;

  // Pick sentences that cover the key points the model "noticed".
  const picked: string[] = [];
  for (const kp of captured) {
    const hit = sentences.find((sen) => sen.includes(kp) && !picked.includes(sen));
    if (hit) picked.push(hit);
  }
  if (!picked.length) picked.push(sentences[0]); // weak fallback

  let out = picked.sort((a, b) => sample.input.indexOf(a) - sample.input.indexOf(b)).join("");

  // Weak models leave an over-long extraction; strong ones trim at a boundary.
  const slack = 1 + (1 - s) * 1.6;
  if (out.length > target * slack) {
    const sentencesIn = splitSentences(out);
    let acc = "";
    for (const sen of sentencesIn) {
      if ((acc + sen).length > target * slack) break;
      acc += sen;
    }
    if (acc.length >= target * 0.5) {
      out = acc;
    } else if (rng() < s) {
      out = out.slice(0, target) + "。"; // clean-ish cut
    } else {
      out = out.slice(0, target + 20); // crude mid-sentence truncation
    }
  }
  return out;
}

/** Sentence-fragment glossary used by the translation generator AND scorer. */
export const TRANSLATION_PHRASES: [string, string][] = [
  ["添付の見積もりをご確認いただけますでしょうか", "Please review the attached quotation"],
  ["納期は来月末を予定しております", "Delivery is scheduled for the end of next month"],
  ["ご不明な点がございましたら、お気軽にお問い合わせください", "Should you have any questions, please feel free to contact us"],
  ["お手数をおかけしますが、よろしくお願いいたします", "Thank you for your continued cooperation"],
  ["請求書を送付いたしますので、ご確認ください", "We have sent the invoice; kindly confirm receipt"],
  ["支払期限は請求日より30日以内となります", "Payment is due within 30 days of the invoice date"],
  ["添付にて修正版の契約書をお送りいたします。", "Please find attached the revised contract."],
  ["速やかにご確認いただけますと幸いです。", "We would appreciate your prompt confirmation."],
  ["検収が完了次第、ご連絡いただけますでしょうか。", "Kindly notify us upon completion of the acceptance inspection."],
  ["それに伴い請求書を発行いたします。", "The invoice will be issued accordingly."],
  ["来週の技術レビュー会議の日程調整にご協力いただけますと幸いです。", "We kindly ask for your cooperation in scheduling next week's technical review meeting."],
];

export function goldTranslation(input: string, direction: "ja2en" | "en2ja"): string {
  let out = input;
  for (const [jp, en] of TRANSLATION_PHRASES) {
    if (direction === "ja2en") out = out.split(jp).join(en);
    else out = out.split(en).join(jp);
  }
  if (direction === "ja2en") {
    out = out.replace(/。/g, ". ").replace(/、/g, ", ").trim();
  } else {
    out = out.replace(/\. /g, "。").replace(/\.$/, "。");
  }
  return out;
}

function genTranslation(
  sample: BenchmarkSample,
  s: number,
  rng: () => number,
): string {
  const direction = (sample.meta?.direction ?? "ja2en") as "ja2en" | "en2ja";
  let out = sample.input;
  for (const [jp, en] of TRANSLATION_PHRASES) {
    const [from, to] = direction === "ja2en" ? [jp, en] : [en, jp];
    if (out.includes(from) && rng() < s) out = out.split(from).join(to);
  }
  if (direction === "ja2en") {
    out = out.replace(/。/g, ". ").replace(/、/g, ", ").replace(/\s+/g, " ").trim();
    if (rng() < s * 0.7 && !/thank|appreciate|please/i.test(out)) {
      out += " We appreciate your business.";
    }
  } else {
    out = out.replace(/\. /g, "。").replace(/\.$/, "。").trim();
    if (rng() < s * 0.5 && !/(何卒|いただけます|お願い)/.test(out)) {
      out += "何卒よろしくお願いいたします。";
    }
  }
  return out;
}

/* ------------------------------ OCR 変換器 ------------------------------- */

const HALF = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｯｬｭｮｰ､";
const FULL = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォッャュョー、";
const DAKU: Record<string, string> = {
  カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ",
  サ: "ザ", シ: "ジ", ス: "ズ", セ: "ゼ", ソ: "ゾ",
  タ: "ダ", チ: "ヂ", ツ: "ヅ", テ: "デ", ト: "ド",
  ハ: "バ", ヒ: "ビ", フ: "ブ", ヘ: "ベ", ホ: "ボ",
};

export function halfToFull(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const idx = HALF.indexOf(ch);
    let conv = idx >= 0 ? FULL[idx] : ch;
    if (idx >= 0 && text[i + 1] === "ﾞ" && DAKU[conv]) {
      conv = DAKU[conv];
      i++;
    } else if (text[i + 1] === "ﾟ" && "ハヒフヘホ".includes(conv)) {
      conv = String.fromCharCode(conv.charCodeAt(0) + 2);
      i++;
    }
    out += conv;
  }
  return out;
}

function genOcrCleanup(sample: BenchmarkSample, s: number, rng: () => number): string {
  let out = sample.input;
  if (rng() < s) out = halfToFull(out);
  // Collapse spaces between CJK characters.
  if (rng() < s) {
    out = out.replace(/([ぁ-んァ-ヶ一-龯ー])\s+([ぁ-んァ-ヶ一-龯ー])/g, "$1$2");
    out = out.replace(/([ぁ-んァ-ヶ一-龯ー])\s+([ぁ-んァ-ヶ一-龯ー])/g, "$1$2");
  }
  // Regroup split numerals ("2 0 2 5" -> "2025"), possibly twice for long runs.
  if (rng() < s) {
    out = out.replace(/(\d)\s+(\d)/g, "$1$2");
    out = out.replace(/(\d)\s+(\d)/g, "$1$2");
    out = out.replace(/(\d)\s+(\d)/g, "$1$2");
  }
  // Restore punctuation at sentence-like boundaries.
  if (rng() < s) {
    out = out.replace(
      /(ございます|申し上げます|申請します|予定です|見込みです|いたします|実施いたします|停止します|より|ます)(?=[^\s。、]|$)/g,
      (_m, stem: string, offset: number, whole: string) => {
        void offset;
        const rest = whole.length - (whole.indexOf(stem) + stem.length);
        return rest > 14 ? stem + "、" : stem + "。";
      },
    );
  }
  // Normalize remaining multi-spaces.
  if (rng() < s) out = out.replace(/\s{2,}/g, " ");
  return ensureSentenceEnd(out);
}

/* ================================ 公開入口 ================================ */

export function simulateOutput(
  model: ModelProfile,
  task: TaskDefinition,
  sample: BenchmarkSample,
  seed: string,
): { output: string } & InferenceMetrics {
  const rng = rngFor(seed, model.id, task.id, sample.id);
  const s = effectiveSkill(model.skills[task.id], rng);

  let output: string;
  switch (task.id) {
    case "keigo_rewrite":
      output = genKeigo(sample.input, s, rng);
      break;
    case "email_correction":
      output = genEmail(sample, s, rng);
      break;
    case "summarization":
      output = genSummary(sample, task, s, rng);
      break;
    case "translation":
      output = genTranslation(sample, s, rng);
      break;
    case "ocr_cleanup":
      output = genOcrCleanup(sample, s, rng);
      break;
  }

  // API models pad outputs slightly (chat wrappers), local ones are leaner.
  const inputTokens = estimateTokens(sample.input) + (model.type === "api" ? 96 : 42);
  const outputTokens = estimateTokens(output);
  const j = jitter(rng);
  const latencyMs = Math.round(
    (model.baseLatencyMs +
      (inputTokens / (model.tokensPerSecond * 6)) * 1000 +
      (outputTokens / model.tokensPerSecond) * 1000) *
      j,
  );
  const costUsd =
    model.type === "api"
      ? (inputTokens * model.costInputPer1M + outputTokens * model.costOutputPer1M) / 1_000_000
      : 0;

  return {
    output,
    latencyMs: Math.max(40, latencyMs),
    inputTokens,
    outputTokens,
    costUsd: clamp(costUsd, 0, 1),
    vramGB: model.vramGB,
  };
}
