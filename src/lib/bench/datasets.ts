/**
 * Built-in evaluation datasets.
 *
 * Each task ships with a small, hand-crafted Japanese dataset whose samples
 * carry the auxiliary annotations (key points, glossary terms, gold
 * references) that the heuristic scorers need. User datasets uploaded via the
 * API are validated against the same `Dataset` shape.
 */
import type { Dataset } from "./types";

/* ---------------------------------- 敬語 ---------------------------------- */

const keigoBusinessV1: Dataset = {
  id: "keigo_business_v1",
  name: "keigo_business_v1",
  nameJa: "敬語ビジネスセット v1",
  description: "Casual workplace utterances to be rewritten into business keigo.",
  descriptionJa: "職場のカジュアルな発話をビジネス敬語へ書き換えるためのセット。",
  taskId: "keigo_rewrite",
  samples: [
    {
      id: "keigo-01",
      input: "明日の会議、行けないんだよね。資料はあとで送っとくから。",
      keyPoints: ["お伺い", "欠席", "後ほど", "お送り"],
    },
    {
      id: "keigo-02",
      input: "部長が言ってた件、どうなった？早く教えて。",
      keyPoints: ["おっしゃ", "いかが", "ご教示"],
    },
    {
      id: "keigo-03",
      input: "見積もりできた？高すぎたら安くしてよ。",
      keyPoints: ["お見積もり", "ご確認", "ご検討"],
    },
    {
      id: "keigo-04",
      input: "今日はもう帰るね。残りは明日やるからよろしく。",
      keyPoints: ["失礼", "対応いたします", "本日"],
    },
    {
      id: "keigo-05",
      input: "さっきのメール見た？返事まだー？",
      keyPoints: ["ご覧", "ご確認", "ご返信"],
    },
    {
      id: "keigo-06",
      input: "この前のエラー、ごめん。もう直したから確認しといて。",
      keyPoints: ["申し訳", "修正いたしました", "ご確認"],
    },
  ],
};

/* -------------------------------- メール補正 ------------------------------- */

const businessEmailV1: Dataset = {
  id: "business_email_v1",
  name: "business_email_v1",
  nameJa: "ビジネスメール補正セット v1",
  description: "Rough Japanese email drafts to be corrected for tone and structure.",
  descriptionJa: "挨拶・署名が欠けたラフな下書きメールを、構造とトーンを保った正式なメールに補正。",
  taskId: "email_correction",
  samples: [
    {
      id: "email-01",
      input: "田中さん\n見積もり送っといて。あと納期も教えて\n山田",
      keyPoints: ["見積もり", "納期"],
      meta: { recipient: "田中様", sender: "営業部 山田" },
    },
    {
      id: "email-02",
      input: "鈴木さんへ\nこの前の打ち合わせの資料、できたから見て。直すとこあったら言って\n佐藤",
      keyPoints: ["資料", "ご確認", "添付"],
      meta: { recipient: "鈴木様", sender: "開発部 佐藤" },
    },
    {
      id: "email-03",
      input: "高橋さん\n来週のアポ、火曜はダメになった。水曜か木曜でお願い\n伊藤",
      keyPoints: ["日程", "変更"],
      meta: { recipient: "高橋様", sender: "人事部 伊藤" },
    },
    {
      id: "email-04",
      input: "中村さん\n請求書の件、振込先が前の口座のまま。新しいのに変えといて\n加藤",
      keyPoints: ["請求書", "振込先", "変更"],
      meta: { recipient: "中村様", sender: "経理部 加藤" },
    },
    {
      id: "email-05",
      input: "小林さん\n新しいシステムの件で相談したいんだけど、明日の午後あいてる？\n吉田",
      keyPoints: ["ご相談", "日程"],
      meta: { recipient: "小林様", sender: "情報システム部 吉田" },
    },
  ],
};

/* ---------------------------------- 要約 ---------------------------------- */

const newsSummaryV1: Dataset = {
  id: "news_summary_v1",
  name: "news_summary_v1",
  nameJa: "ニュース要約セット v1",
  description: "Short Japanese news articles with annotated key points to summarize (~100 chars).",
  descriptionJa: "100字程度への要約を目的とした短いニュース記事。キーポイント付き。",
  taskId: "summarization",
  samples: [
    {
      id: "news-01",
      input:
        "国内の大手電機メーカー5社が発表した2025年度第3四半期の連結決算は、生成AI向け半導体の需要拡大を背景に、前年同期比で増収となった。特にデータセンター事業は売上高が前年比42%増と大きく伸び、営業利益率も12.8%に改善した。一方で、為替円高の影響や中国市場の減速が懸念材料として挙げられており、各社は通期見通しを慎重に据え置いた。業界団体は「AI投資の持続性が今後の業績を左右する」と分析している。",
      keyPoints: ["増収", "決算", "42%", "円高", "2025"],
    },
    {
      id: "news-02",
      input:
        "JR東日本は7日、東北新幹線の運行本数を来年春のダイヤ改正で平日10本増便すると発表した。テレワーク以降も観光需要が回復し、土休日の提供座席数が前年比15%増となったことを受けた施策で、あわせて全車両へのフリーWi-Fi増強と荷物スペースの拡大も進める。同社担当者は「ビジネス利用の回復も確認できており、利便性をさらに高めたい」とコメント。改正は2026年3月に実施予定。",
      keyPoints: ["新幹線", "増便", "ダイヤ改正", "15%", "2026"],
    },
    {
      id: "news-03",
      input:
        "気象庁は8日、今冬のラニーニャ現象が継続する可能性が70%との見通しを発表した。日本海側では平年を上回る降雪が予想され、交通機関への影響や除雪費用の増加が懸念される。特に北陸地方では12月の積雪が平年の1.4倍となる見込み。同庁は自治体に対し、早期の除雪体制の整備と住民への周知徹底を呼びかけている。過去の同様のケースでは交通マヒによる経済損失が500億円規模に上った例もある。",
      keyPoints: ["ラニーニャ", "70%", "日本海側", "1.4倍", "500億円"],
    },
    {
      id: "news-04",
      input:
        "経済産業省は12日、国内のIT人材が2030年に最大79万人不足するとの試算を公表した。高度デジタル人材の確保に向け、リスキリング支援の補助金を来年度予算に1,200億円計上する方針を示した。また、生成AIスキルを持つエンジニアの平均年収が一般職を180万円上回る実態調査も併せて発表。同省は「企業と人材双方への投資が不可欠」とし、大学との連携カリキュラム開発も進める考えを強調した。",
      keyPoints: ["79万人", "2030", "1,200億円", "180万円", "経済産業省"],
    },
    {
      id: "news-05",
      input:
        "国内クラウド市場の規模は2025年度に前期比24%増の5.8兆円に達する見込みであることが、民間調査会社のレポートで明らかになった。行政クラウドの移行完了と、製造業における生成AI活用の本格化が牽引した。特にSaaS分野は31%増と急拡大している。一方で、国内データセンターの電力消費量は前年比11%増となり、サステナビリティへの対応が業界の次の課題として指摘されている。",
      keyPoints: ["クラウド", "24%", "5.8兆円", "SaaS", "電力"],
    },
  ],
};

/* ---------------------------------- 翻訳 ---------------------------------- */

const translationBizV1: Dataset = {
  id: "translation_biz_v1",
  name: "translation_biz_v1",
  nameJa: "ビジネス翻訳セット v1",
  description: "JP→EN / EN→JP business sentences with glossary annotations.",
  descriptionJa: "日英・英日の双方向ビジネス文書翻訳。用語集（グロッサリ）の整合性を評価する。",
  taskId: "translation",
  samples: [
    {
      id: "trans-01",
      input: "添付の見積もりをご確認いただけますでしょうか。納期は来月末を予定しております。",
      keyPoints: ["quotation", "delivery"],
      meta: { direction: "ja2en", glossary: "見積もり→quotation,納期→delivery" },
    },
    {
      id: "trans-02",
      input: "ご不明な点がございましたら、お気軽にお問い合わせください。お手数をおかけしますが、よろしくお願いいたします。",
      keyPoints: ["contact", "questions"],
      meta: { direction: "ja2en", glossary: "" },
    },
    {
      id: "trans-03",
      input: "請求書を送付いたしますので、ご確認ください。支払期限は請求日より30日以内となります。",
      keyPoints: ["invoice", "payment"],
      meta: { direction: "ja2en", glossary: "請求書→invoice,支払期限→payment due date" },
    },
    {
      id: "trans-04",
      input: "Please find attached the revised contract. We would appreciate your prompt confirmation.",
      keyPoints: ["契約書", "添付", "ご確認"],
      meta: { direction: "en2ja", glossary: "contract→契約書" },
    },
    {
      id: "trans-05",
      input: "Kindly notify us upon completion of the acceptance inspection. The invoice will be issued accordingly.",
      keyPoints: ["検収", "完了", "請求書"],
      meta: { direction: "en2ja", glossary: "acceptance inspection→検収,invoice→請求書" },
    },
    {
      id: "trans-06",
      input: "We kindly ask for your cooperation in scheduling next week's technical review meeting.",
      keyPoints: ["日程", "調整", "ご協力"],
      meta: { direction: "en2ja", glossary: "" },
    },
  ],
};

/* -------------------------------- OCR クリーン ----------------------------- */

const ocrNoisyV1: Dataset = {
  id: "ocr_noisy_v1",
  name: "ocr_noisy_v1",
  nameJa: "OCRノイズクリーンセット v1",
  description: "Noisy OCR text with spacing/punctuation corruption; gold references included.",
  descriptionJa: "空白・句読点・半角カナの崩壊を含むOCR出力を清書する。参照文字列との類似度を評価。",
  taskId: "ocr_cleanup",
  samples: [
    {
      id: "ocr-01",
      input: "株式会社 ｻﾝﾌﾟﾙ 御中 本日は お打合せの お時間を いただき 誠にありが とうご ざいます 引き続き よろしく お願いいた します",
      reference: "株式会社サンプル御中 本日はお打合せのお時間をいただき、誠にありがとうございます。引き続きよろしくお願いいたします。",
      keyPoints: ["誠にありがとうございます", "。"],
    },
    {
      id: "ocr-02",
      input: "稟議書 第 4 2 号 件名 ｸﾗｳﾄﾞ サービス 更新の 件 下記の通り 稟議を 申請 します 記 更新費用 年額 2 4 0 万円 支払時期 翌月末",
      reference: "稟議書 第42号 件名：クラウドサービス更新の件 下記の通り稟議を申請します。記 更新費用：年額240万円 支払時期：翌月末",
      keyPoints: ["稟議書", "。", "240万円"],
    },
    {
      id: "ocr-03",
      input: "議事録 2 0 2 5 年 1 2 月 8 日 出席者 営業部 山田 開 発部 佐藤 議題 新製品の 販売計 画について 次回 は 月曜 10 時 より",
      reference: "議事録 2025年12月8日 出席者：営業部 山田、開発部 佐藤 議題：新製品の販売計画について 次回は月曜10時より",
      keyPoints: ["議事録", "2025年", "。"],
    },
    {
      id: "ocr-04",
      input: "納 品 の ご案 内 平素は 格別 の お引き 立てを 賜り 厚く 御礼 申し上 げます ご注 文の 品は 明日 発送 予定で す 到着は 明後日 の 見込みです",
      reference: "納品のご案内 平素は格別のお引き立てを賜り、厚く御礼申し上げます。ご注文の品は明日発送予定です。到着は明後日の見込みです。",
      keyPoints: ["御礼申し上げます", "。", "予定です"],
    },
    {
      id: "ocr-05",
      input: "ｼｽﾃﾑ ﾒﾝﾃﾅﾝｽ の お知ら せ 下記 の 日時 に おきまして サーバ ﾒﾝﾃﾅﾝｽ を 実施い たします 時間 帯は ｻｰﾋﾞ ｽを 停止 します",
      reference: "システムメンテナンスのお知らせ 下記の日時におきましてサーバメンテナンスを実施いたします。時間帯はサービスを停止します。",
      keyPoints: ["メンテナンス", "。"],
    },
  ],
};

export const DATASETS: Dataset[] = [
  keigoBusinessV1,
  businessEmailV1,
  newsSummaryV1,
  translationBizV1,
  ocrNoisyV1,
];

export function getDataset(id: string): Dataset | undefined {
  return DATASETS.find((d) => d.id === id);
}

export function datasetForTask(taskId: string, requestedId?: string): Dataset {
  if (requestedId) {
    const d = DATASETS.find((x) => x.id === requestedId && x.taskId === taskId);
    if (d) return d;
  }
  const fallback = DATASETS.find((x) => x.taskId === taskId);
  if (!fallback) throw new Error(`No dataset available for task ${taskId}`);
  return fallback;
}
