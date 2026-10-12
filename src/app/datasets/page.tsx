import { TASKS, DATASETS } from "@/lib/server/queries";
import { Badge, Card, PageHeader } from "@/components/ui";
import {
  DatasetDescription,
  DatasetName,
  RubricLabel,
  T,
  TaskDescription,
  TaskName,
} from "@/components/localized";
import { RubricLabelDescription } from "@/components/rubric-desc";

export const dynamic = "force-dynamic";

export default async function DatasetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        en="Tasks & Datasets"
        title={<T k="datasets_title" />}
        description={<T k="datasets_desc" />}
      />

      {/* tasks rubric */}
      <div className="grid gap-4 lg:grid-cols-2">
        {TASKS.map((task) => {
          const ds = DATASETS.find((d) => d.taskId === task.id);
          return (
            <Card key={task.id} className="p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <TaskName task={task} className="text-[13.5px] font-black text-ink" />
                  <div className="font-mono text-[10px] text-faint">{task.name}</div>
                </div>
                <Badge tone="accent">
                  <T k="datasets_samples_badge" vars={{ n: ds?.samples.length ?? 0 }} />
                </Badge>
              </div>
              <TaskDescription task={task} className="mt-2 block text-[11.5px] leading-relaxed text-ink2" />
              <div className="mt-3 space-y-1">
                {task.rubric.map((r) => (
                  <div key={r.metric} className="flex items-start gap-2 rounded-md border border-line/70 px-2.5 py-1.5 text-[10.5px]">
                    <span className="num w-10 shrink-0 text-right font-black text-accent">
                      {Math.round(r.weight * 100)}%
                    </span>
                    <RubricLabel metric={r.metric} className="w-28 shrink-0 font-bold text-ink" />
                    <RubricLabelDescription metric={r.metric} ja={r.descriptionJa} en={r.description} />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* dataset samples */}
      <div className="space-y-4">
        {DATASETS.map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <DatasetName dataset={d} className="text-[13px] font-black text-ink" />
                <span className="ml-2 font-mono text-[10px] text-faint">{d.name}</span>
                <DatasetDescription dataset={d} className="mt-0.5 block text-[11px] text-mute" />
              </div>
              <Badge tone="navy">
                <T k="datasets_samples_badge" vars={{ n: d.samples.length }} />
              </Badge>
            </div>
            <div className="mt-3 divide-y divide-line/60 rounded-lg border border-line">
              {d.samples.map((s, i) => (
                <details key={s.id} className="group px-4 py-2.5 open:bg-washi/50">
                  <summary className="flex cursor-pointer list-none items-center gap-3 text-[11.5px]">
                    <span className="num w-6 shrink-0 font-bold text-faint">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink2">{s.input.slice(0, 64)}{s.input.length > 64 ? "…" : ""}</span>
                    {s.keyPoints?.length ? (
                      <span className="hidden shrink-0 gap-1 sm:flex">
                        {s.keyPoints.slice(0, 3).map((kp) => (
                          <Badge key={kp} tone="neutral">{kp}</Badge>
                        ))}
                      </span>
                    ) : null}
                  </summary>
                  <div className="mt-2 grid gap-3 pb-1 pl-9 sm:grid-cols-2">
                    <div>
                      <div className="text-[9.5px] font-bold tracking-wider text-mute uppercase">
                        <T k="common_input" />
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink">{s.input}</p>
                    </div>
                    <div className="space-y-2">
                      {s.reference ? (
                        <div>
                          <div className="text-[9.5px] font-bold tracking-wider text-mute uppercase">
                            <T k="common_reference" />
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink2">{s.reference}</p>
                        </div>
                      ) : null}
                      {s.keyPoints?.length ? (
                        <div>
                          <div className="text-[9.5px] font-bold tracking-wider text-mute uppercase">
                            <T k="common_keypoints" />
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.keyPoints.map((kp) => <Badge key={kp} tone="forest">{kp}</Badge>)}
                          </div>
                        </div>
                      ) : null}
                      {s.meta ? (
                        <div className="text-[10px] text-faint">
                          {Object.entries(s.meta).map(([k, v]) => (
                            <div key={k}><span className="font-bold">{k}</span>: {v}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
