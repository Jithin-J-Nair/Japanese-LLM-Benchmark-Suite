import { MODELS, TASKS } from "@/lib/server/queries";
import { listDynamicRows, dynamicRowToProfile } from "@/lib/server/dynamic-models";
import { isJapaneseModel } from "@/lib/bench/capability";
import { PageHeader } from "@/components/ui";
import { ModelsRegistry, type RegistryEntry } from "@/components/models-registry";
import { RefreshModelsButton } from "@/components/refresh-models-button";
import { LocalDateTime, T } from "@/components/localized";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const rows = await listDynamicRows().catch(() => []);

  const staticEntries: RegistryEntry[] = MODELS.map((m) => ({
    id: m.id,
    source: "static",
    name: m.name,
    vendor: m.vendor,
    type: m.type,
    params: m.parameterSizeB,
    quantization: m.quantization,
    vramGB: m.vramGB,
    tokensPerSecond: m.tokensPerSecond,
    color: m.color,
    profile: m,
    tags: m.quantization ? [m.quantization] : [],
    downloads: null,
    likes: null,
    license: null,
    japanese: true,
    skills: m.skills,
  }));

  const dynamicEntries: RegistryEntry[] = rows.map((row) => {
    const p = dynamicRowToProfile(row);
    return {
      id: p.id,
      source: "hf",
      name: p.name,
      vendor: p.vendor,
      type: "local",
      params: p.parameterSizeB,
      quantization: p.quantization,
      vramGB: p.vramGB,
      tokensPerSecond: p.tokensPerSecond,
      color: p.color,
      profile: p,
      tags: row.tags as string[],
      downloads: row.downloads,
      likes: row.likes,
      license: row.license,
      japanese:
        row.japanese === 1 ||
        isJapaneseModel({ hfId: row.hfId, tags: (row.tags as string[]) ?? [], description: row.description }),
      skills: p.skills,
    };
  });

  const entries = [...staticEntries, ...dynamicEntries];
  const lastRefreshIso = rows.length
    ? new Date(Math.max(...rows.map((r) => r.lastRefresh.getTime()))).toISOString()
    : null;

  return (
    <div>
      <PageHeader
        en="Model Registry"
        title={<T k="models_title" />}
        description={
          lastRefreshIso ? (
            <>
              <T
                k="models_desc_with_hf"
                vars={{ static: staticEntries.length, dynamic: dynamicEntries.length, date: "" }}
              />{" "}
              <LocalDateTime iso={lastRefreshIso} />
            </>
          ) : (
            <T k="models_desc_no_hf" vars={{ static: staticEntries.length }} />
          )
        }
        actions={<RefreshModelsButton />}
      />
      <ModelsRegistry entries={entries} tasks={TASKS} />
    </div>
  );
}
