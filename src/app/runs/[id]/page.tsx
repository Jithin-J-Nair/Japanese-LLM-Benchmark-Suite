import { notFound } from "next/navigation";
import { getRun, MODELS, TASKS, resolveProfilesForResults } from "@/lib/server/queries";
import { BackButton } from "@/components/back-button";
import { aggregateOverall } from "@/lib/bench/aggregate";
import { RunReport } from "@/components/run-report";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();

  // Profiles include dynamic models so colors/names resolve for hf: runs too.
  const profiles = await resolveProfilesForResults(run.results);
  const overall = aggregateOverall(run.results, profiles);

  return (
    <div>
      <BackButton labelKey="report_back" fallbackHref="/runs" />
      <RunReport run={run} overall={overall} tasks={TASKS} />
    </div>
  );
}
