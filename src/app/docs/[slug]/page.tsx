import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { marked } from "marked";
import { Card } from "@/components/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILES: Record<string, { file: string; label: string }> = {
  readme: { file: "README.md", label: "Overview (EN)" },
  "readme-ja": { file: "README_ja.md", label: "README（日本語）" },
  architecture: { file: "docs/architecture.md", label: "アーキテクチャ" },
  evaluation: { file: "docs/evaluation.md", label: "評価手法" },
  models: { file: "docs/models.md", label: "モデルガイド" },
  tasks: { file: "docs/tasks.md", label: "タスク定義" },
  i18n: { file: "docs/i18n.md", label: "i18n / 言語設定" },
};

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = FILES[slug];
  if (!entry) notFound();

  let content: string;
  try {
    content = await fs.readFile(path.join(process.cwd(), entry.file), "utf-8");
  } catch {
    notFound();
  }
  const html = marked.parse(content) as string;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/docs"
        className="mb-4 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-mute hover:text-accent"
      >
        <ArrowLeft size={12} /> ドキュメント一覧
      </Link>
      <Card className="p-7 sm:p-10">
        <article className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
      </Card>
    </div>
  );
}
