import { discoverModels } from "@/lib/hf/discovery";
import { upsertDiscovered, countDynamicModels } from "@/lib/server/dynamic-models";
import { logger } from "@/lib/server/logger";

/**
 * POST (GET for convenience) — HuggingFace auto-discovery refresh.
 * Idempotent: upserts on hf_id and reports added/updated/total.
 * Degrades gracefully to a structured error when the Hub is unreachable.
 */
export const dynamic = "force-dynamic";

async function handle() {
  const scope = "models/refresh";
  logger.info(scope, "HuggingFace discovery started");
  try {
    const discovery = await discoverModels();
    if (!discovery.ok) {
      logger.error(scope, "discovery failed (all queries)", discovery.error);
      return Response.json(
        {
          ok: false,
          status: "hf_unreachable",
          error: discovery.error,
          warnings: discovery.warnings,
          total: await countDynamicModels().catch(() => 0),
        },
        { status: 502 },
      );
    }

    let summary: Awaited<ReturnType<typeof upsertDiscovered>>;
    try {
      summary = await upsertDiscovered(discovery.models);
    } catch (e) {
      logger.error(scope, "database write failed", e);
      return Response.json(
        {
          ok: false,
          status: "db_error",
          error: `DB書き込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
          total: await countDynamicModels().catch(() => 0),
        },
        { status: 500 },
      );
    }

    logger.info(
      scope,
      `done: added=${summary.added} updated=${summary.updated} total=${summary.total} in ${discovery.durationMs}ms`,
    );
    return Response.json({
      ok: true,
      status: "done",
      added: summary.added,
      updated: summary.updated,
      total: summary.total,
      fetched: discovery.fetched,
      unique: discovery.unique,
      queries: discovery.queries,
      durationMs: discovery.durationMs,
      warnings: discovery.warnings,
      finishedAt: new Date().toISOString(),
    });
  } catch (e) {
    logger.error(scope, "unhandled error", e);
    return Response.json(
      { ok: false, status: "error", error: String(e) },
      { status: 500 },
    );
  }
}

export async function POST() {
  return handle();
}

export async function GET() {
  return handle();
}
