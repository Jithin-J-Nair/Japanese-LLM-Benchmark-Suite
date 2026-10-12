import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { listRuns } from "@/lib/server/queries";
import { Badge, Card, fmtInt, PageHeader } from "@/components/ui";
import { ExportButtons } from "@/components/export-buttons";
import { LocalDateTime, T } from "@/components/localized";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await listRuns();
  return (
    <div>
      <PageHeader
        en="Run History"
        title={<T k="runs_title" />}
        description={<T k="runs_desc" />}
        actions={
          <Link
            href="/benchmarks/new"
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-accent"
          >
            <FlaskConical size={15} /> <T k="runs_cta_new" />
          </Link>
        }
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] font-bold tracking-wider text-mute uppercase">
                <th className="px-5 py-3"><T k="runs_th_name" /></th>
                <th className="px-3 py-3"><T k="runs_th_date" /></th>
                <th className="px-3 py-3"><T k="runs_th_config" /></th>
                <th className="px-3 py-3 text-right"><T k="runs_th_evals" /></th>
                <th className="px-3 py-3"><T k="runs_th_export" /></th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0 hover:bg-washi/60">
                  <td className="px-5 py-3.5">
                    <Link href={`/runs/${r.id}`} className="font-bold text-ink hover:text-accent">
                      {r.name}
                    </Link>
                    <div className="mt-0.5 text-[10px] text-faint">
                      <T k="common_seed" />: <span className="font-mono">{r.config.seed}</span> ·{" "}
                      <T k={r.config.mode === "sandbox" ? "mode_sandbox" : "mode_endpoint"} />
                    </div>
                  </td>
                  <td className="num px-3 py-3.5 text-ink2">
                    <LocalDateTime iso={r.createdAt} />
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge tone="navy">{r.config.modelIds.length} <T k="common_models_unit" /></Badge>{" "}
                    <Badge tone="forest">{r.config.taskIds.length} <T k="common_tasks_unit" /></Badge>
                  </td>
                  <td className="num px-3 py-3.5 text-right font-bold text-ink">
                    {fmtInt(r.resultCount)}
                  </td>
                  <td className="px-3 py-3.5">
                    <ExportButtons runId={r.id} compact />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/runs/${r.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                    >
                      <T k="common_report" /> <ArrowRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
