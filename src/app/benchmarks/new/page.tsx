import { MODELS, TASKS, DATASETS } from "@/lib/server/queries";
import { listDynamicProfiles } from "@/lib/server/dynamic-models";
import { PageHeader } from "@/components/ui";
import { RunConfigForm } from "@/components/run-config-form";
import { T } from "@/components/localized";

export const dynamic = "force-dynamic";

export default async function NewBenchmarkPage() {
  // HuggingFace-discovered models join the selector with estimated skills.
  const dynamicModels = await listDynamicProfiles().catch(() => []);
  return (
    <div>
      <PageHeader
        en="Benchmark Configuration"
        title={<T k="newrun_title" />}
        description={<T k="newrun_desc" />}
      />
      <RunConfigForm models={MODELS} dynamicModels={dynamicModels} tasks={TASKS} datasets={DATASETS} />
    </div>
  );
}
