import { getRun } from "@/lib/server/queries";
import { toCsv, toJson, toMarkdown } from "@/lib/bench/export";
import { logger } from "@/lib/server/logger";
import { getServerLang } from "@/lib/server/i18n";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const format = new URL(req.url).searchParams.get("format") ?? "md";
    const lang = await getServerLang();
    const run = await getRun(id);
    if (!run) return Response.json({ error: "not found" }, { status: 404 });
    if (!run.results.length) {
      logger.warn("export", `run ${id} has no results`, { format });
      return Response.json({ error: "run has no results" }, { status: 400 });
    }

    const stamp = run.createdAt.slice(0, 10).replaceAll("-", "");
    const base = { ...NO_STORE, "content-disposition": "" } as Record<string, string>;
    if (format === "csv") {
      // BOM prefix keeps the CSV Excel-friendly while staying UTF-8.
      return new Response("﻿" + toCsv(run, lang), {
        headers: {
          ...base,
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="llm-jp-bench-${stamp}.csv"`,
        },
      });
    }
    if (format === "json") {
      return new Response(toJson(run), {
        headers: {
          ...base,
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="llm-jp-bench-${stamp}.json"`,
        },
      });
    }
    return new Response(toMarkdown(run, lang), {
      headers: {
        ...base,
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="llm-jp-bench-${stamp}.md"`,
      },
    });
  } catch (e) {
    logger.error("export", "export failed", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
