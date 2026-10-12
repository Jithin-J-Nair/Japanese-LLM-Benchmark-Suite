import { MODELS } from "@/lib/bench/models";
import { listDynamicProfiles, listDynamicRows } from "@/lib/server/dynamic-models";

export const dynamic = "force-dynamic";

export async function GET() {
  const [rows, profiles] = await Promise.all([listDynamicRows(), listDynamicProfiles()]);
  return Response.json({
    models: MODELS,
    dynamic: rows.map((row, i) => ({
      profile: profiles[i],
      meta: {
        hfId: row.hfId,
        tags: row.tags,
        downloads: row.downloads,
        likes: row.likes,
        license: row.license,
        japanese: row.japanese === 1,
        lastRefresh: row.lastRefresh.toISOString(),
      },
    })),
  });
}
