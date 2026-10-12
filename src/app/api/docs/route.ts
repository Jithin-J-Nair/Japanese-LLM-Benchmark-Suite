import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCS: Record<string, { file: string; title: string; titleJa: string }> = {
  readme: { file: "README.md", title: "Overview (English README)", titleJa: "概要 (英語)" },
  "readme-ja": { file: "README_ja.md", title: "README (日本語)", titleJa: "README（日本語）" },
  architecture: { file: "docs/architecture.md", title: "Architecture", titleJa: "アーキテクチャ" },
  evaluation: { file: "docs/evaluation.md", title: "Evaluation Methodology", titleJa: "評価手法" },
  models: { file: "docs/models.md", title: "Model Guide", titleJa: "モデル追加ガイド" },
  tasks: { file: "docs/tasks.md", title: "Task Definitions", titleJa: "タスク定義" },
  i18n: { file: "docs/i18n.md", title: "i18n / Language Settings", titleJa: "i18n / 言語設定" },
};

export function listDocs() {
  return Object.entries(DOCS).map(([slug, d]) => ({ slug, ...d }));
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return Response.json({ docs: listDocs() });
  const entry = DOCS[slug];
  if (!entry) return Response.json({ error: "unknown doc" }, { status: 404 });
  try {
    const filePath = path.join(process.cwd(), entry.file);
    const content = await fs.readFile(filePath, "utf-8");
    return Response.json({ slug, ...entry, content });
  } catch {
    return Response.json({ error: "doc file not found" }, { status: 404 });
  }
}
