import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Cpu,
  DollarSign,
  Download,
  FlaskConical,
  Globe,
  Heart,
  MemoryStick,
  Scale,
  Tag,
  Zap,
} from "lucide-react";
import { avg, count, countDistinct, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { runResults } from "@/db/schema";
import { MODELS, TASKS } from "@/lib/server/queries";
import { getDynamicRowByDynamicId, dynamicRowToProfile } from "@/lib/server/dynamic-models";
import type { ModelProfile, TaskId } from "@/lib/bench/types";
import { Badge, Card, fmtCompact, ScoreBar, scoreColor } from "@/components/ui";
import { BackButton } from "@/components/back-button";
import { HealthCheckButton } from "@/components/model-health";
import type { I18nKey } from "@/i18n";
import { LocalDateTime, ModelDescription, T, TaskName } from "@/components/localized";

export const dynamic = "force-dynamic";

interface HistoryRow {
  taskId: TaskId;
  samples: number;
  avgScore: number | null;
  runs: number;
}

export default async function ModelInspectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  let profile: ModelProfile | null = MODELS.find((m) => m.id === id) ?? null;
  let hfRow: Awaited<ReturnType<typeof getDynamicRowByDynamicId>> = null;
  let source: "static" | "hf" = "static";
  if (!profile && id.startsWith("hf:")) {
    hfRow = await getDynamicRowByDynamicId(id);
    if (hfRow) {
      profile = dynamicRowToProfile(hfRow);
      source = "hf";
    }
  }
  if (!profile) notFound();

  // Benchmark history for this model id.
  const history: HistoryRow[] = (
    await db
      .select({
        taskId: runResults.taskId,
        samples: count(),
        avgScore: avg(runResults.score),
        runs: countDistinct(runResults.runId),
      })
      .from(runResults)
      .where(eq(runResults.modelId, id))
      .groupBy(runResults.taskId)
      .orderBy(runResults.taskId)
  ).map((r) => ({
    taskId: r.taskId as TaskId,
    samples: Number(r.samples),
    avgScore: r.avgScore === null ? null : Math.round(Number(r.avgScore) * 10) / 10,
    runs: Number(r.runs),
  }));
  const [lastRun] = await db
    .select({ at: max(runResults.createdAt) })
    .from(runResults)
    .where(eq(runResults.modelId, id));

  const meta: { icon: typeof Cpu; labelKey: I18nKey; value: React.ReactNode }[] = [
    {
      icon: Cpu,
      labelKey: "insp_meta_params",
      value: profile.parameterSizeB !== null ? `${profile.parameterSizeB}B` : <T k="models_params_hidden" />,
    },
    {
      icon: MemoryStick,
      labelKey: "insp_meta_vram",
      value: profile.vramGB !== null ? `${profile.vramGB} GB` : <T k="common_na" />,
    },
    { icon: Zap, labelKey: "insp_meta_tps", value: `${profile.tokensPerSecond} tok/s` },
    {
      icon: DollarSign,
      labelKey: "insp_meta_cost",
      value: profile.type === "api" ? `$${profile.costInputPer1M}/$${profile.costOutputPer1M} per 1M tok` : <T k="insp_cost_local" />,
    },
    {
      icon: Scale,
      labelKey: "insp_meta_license",
      value: (source === "hf" ? hfRow?.license : null) ?? <T k="common_na" />,
    },
    { icon: Tag, labelKey: "insp_meta_quant", value: profile.quantization ?? <T k="common_na" /> },
  ];

  return (
    <div>
      <BackButton labelKey="insp_back" fallbackHref="/models" />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 place-items-center rounded-xl" style={{ background: `${profile.color}1a` }}>
              <Cpu size={22} style={{ color: profile.color }} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-black tracking-tight text-ink">{profile.name}</h1>
                <Badge tone={source === "hf" ? "accent" : "navy"}>
                  <T k={source === "hf" ? "insp_hf_badge" : "insp_registry_badge"} />
                </Badge>
                <Badge tone={profile.type === "api" ? "gold" : "navy"}>
                  <T k={profile.type === "api" ? "common_api" : "common_local"} />
                </Badge>
              </div>
              <p className="mt-1 text-[11.5px] text-mute">{profile.vendor}</p>
              {source === "hf" && hfRow ? (
                <a
                  href={`https://huggingface.co/${hfRow.hfId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:underline"
                >
                  <Globe size={9} /> {hfRow.hfId}
                </a>
              ) : null}
            </div>
          </div>
          <HealthCheckButton modelId={id} />
        </div>

        <ModelDescription
          model={profile}
          className="mt-4 block max-w-3xl text-[12px] leading-relaxed text-ink2"
        />

        {source === "hf" && hfRow ? (
          <div className="num mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { icon: Download, labelKey: "insp_stat_downloads" as I18nKey, value: fmtCompact(hfRow.downloads) },
              { icon: Heart, labelKey: "insp_stat_likes" as I18nKey, value: fmtCompact(hfRow.likes) },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.labelKey} className="rounded-lg border border-line p-3">
                  <div className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-wider text-mute uppercase">
                    <Icon size={10} /> <T k={s.labelKey} />
                  </div>
                  <div className="num mt-1 text-[15px] font-black text-ink">{s.value}</div>
                </div>
              );
            })}
            <div className="rounded-lg border border-line p-3">
              <div className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-wider text-mute uppercase">
                <Calendar size={10} /> <T k="insp_stat_last_scan" />
              </div>
              <div className="num mt-1 text-[15px] font-black text-ink">
                <LocalDateTime iso={hfRow.lastRefresh.toISOString()} dateOnly />
              </div>
            </div>
            <div className="rounded-lg border border-line p-3">
              <div className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-wider text-mute uppercase">
                <Scale size={10} /> <T k="insp_stat_license" />
              </div>
              <div className="num mt-1 text-[15px] font-black text-ink">
                {hfRow.license ?? <T k="common_not_set" />}
              </div>
            </div>
          </div>
        ) : null}

        {source === "hf" && hfRow && (hfRow.tags as string[]).length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {(hfRow.tags as string[]).map((tg) => (
              <span key={tg} className="rounded bg-[#efede8] px-1.5 py-0.5 font-mono text-[9.5px] text-ink2">{tg}</span>
            ))}
          </div>
        ) : null}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* meta */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink"><T k="insp_meta_title" /></h2>
          <dl className="mt-3 divide-y divide-line/60">
            {meta.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.labelKey} className="flex items-center justify-between py-2.5 text-[12px]">
                  <dt className="inline-flex items-center gap-2 font-bold text-mute">
                    <Icon size={12} className="text-faint" /> <T k={m.labelKey} />
                  </dt>
                  <dd className="num font-bold text-ink">{m.value}</dd>
                </div>
              );
            })}
            <div className="flex items-center justify-between py-2.5 text-[12px]">
              <dt className="inline-flex items-center gap-2 font-bold text-mute">
                <Globe size={12} className="text-faint" /> <T k="insp_meta_endpoint" />
              </dt>
              <dd className="max-w-56 truncate font-mono text-[10.5px] text-ink">
                {profile.endpoint ?? <T k="insp_endpoint_none" />}
              </dd>
            </div>
          </dl>
        </Card>

        {/* skill matrix */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink"><T k="insp_skills_title" /></h2>
            <Badge tone={source === "hf" ? "accent" : "neutral"}>
              <T k={source === "hf" ? "insp_skills_estimated" : "common_registry_value"} />
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {TASKS.map((task) => {
              const v = Math.round(profile!.skills[task.id] * 100);
              return (
                <div key={task.id} className="flex items-center gap-3">
                  <TaskName
                    task={task}
                    className="w-36 shrink-0 text-[11.5px] font-bold text-ink2"
                  />
                  <ScoreBar value={v} color={profile!.color} width={150} />
                  <span className="num w-8 text-right text-[12.5px] font-black" style={{ color: scoreColor(v) }}>
                    {v}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-faint"><T k="insp_skills_note" /></p>
        </Card>
      </div>

      {/* benchmark history */}
      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink"><T k="insp_history_title" /></h2>
          <span className="num text-[10.5px] text-mute">
            {lastRun?.at ? (
              <>
                <T k="insp_last_eval" vars={{ date: "" }} />{" "}
                <LocalDateTime iso={lastRun.at.toISOString()} />
              </>
            ) : (
              <T k="common_never" />
            )}
          </span>
        </div>
        {history.length ? (
          <table className="mt-3 w-full text-[12px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] font-bold tracking-wider text-mute uppercase">
                <th className="pb-2"><T k="insp_th_task" /></th>
                <th className="pb-2"><T k="insp_th_avg" /></th>
                <th className="pb-2 text-right"><T k="insp_th_samples" /></th>
                <th className="pb-2 text-right"><T k="insp_th_runs" /></th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.taskId} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 font-bold text-ink"><TaskName task={h.taskId} /></td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <ScoreBar value={h.avgScore ?? 0} color={scoreColor(h.avgScore ?? 0)} width={70} />
                      <span className="num font-black" style={{ color: scoreColor(h.avgScore ?? 0) }}>
                        {h.avgScore}
                      </span>
                    </span>
                  </td>
                  <td className="num py-2.5 text-right text-ink2">{h.samples}</td>
                  <td className="num py-2.5 text-right text-ink2">{h.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="mt-4 rounded-lg bg-washi p-6 text-center">
            <p className="text-[12px] text-mute"><T k="insp_never" /></p>
            <Link
              href="/benchmarks/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-[11.5px] font-bold text-white hover:bg-accent"
            >
              <FlaskConical size={12} /> <T k="insp_run_cta" />
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
