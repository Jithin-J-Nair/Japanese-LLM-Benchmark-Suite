import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { T } from "@/components/localized";
import type { I18nKey } from "@/i18n";

export const dynamic = "force-dynamic";

const DOCS: { slug: string; titleKey: I18nKey; descKey: I18nKey; lang: string }[] = [
  { slug: "readme", titleKey: "docs_readme_title", descKey: "docs_readme_desc", lang: "EN" },
  { slug: "readme-ja", titleKey: "docs_readmeja_title", descKey: "docs_readmeja_desc", lang: "JA" },
  { slug: "architecture", titleKey: "docs_architecture_title", descKey: "docs_architecture_desc", lang: "JA" },
  { slug: "evaluation", titleKey: "docs_evaluation_title", descKey: "docs_evaluation_desc", lang: "JA" },
  { slug: "models", titleKey: "docs_models_title", descKey: "docs_models_desc", lang: "JA" },
  { slug: "tasks", titleKey: "docs_tasks_title", descKey: "docs_tasks_desc", lang: "JA" },
  { slug: "i18n", titleKey: "docs_i18n_title", descKey: "docs_i18n_desc", lang: "JA" },
];

export default function DocsIndexPage() {
  return (
    <div>
      <PageHeader
        en="Documentation"
        title={<T k="docs_title" />}
        description={<T k="docs_desc" />}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOCS.map((d) => (
          <Link key={d.slug} href={`/docs/${d.slug}`}>
            <Card className="group h-full p-5 transition-all hover:border-accent hover:shadow-[0_6px_24px_rgba(24,24,29,0.08)]">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-[#efede8] text-ink2 transition-colors group-hover:bg-accent group-hover:text-white">
                  <BookOpenText size={16} />
                </span>
                <span className="rounded-md bg-washi px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-mute">
                  {d.lang}
                </span>
              </div>
              <div className="mt-3 text-[13px] font-black text-ink group-hover:text-accent">
                <T k={d.titleKey} />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-mute">
                <T k={d.descKey} />
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-accent">
                <T k="common_read" /> <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
