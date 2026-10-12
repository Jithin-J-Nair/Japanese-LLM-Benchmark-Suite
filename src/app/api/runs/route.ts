import { createRun, listRuns } from "@/lib/server/queries";
import type { RunConfig } from "@/lib/bench/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ runs: await listRuns() });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; config?: Partial<RunConfig> };
    if (!body.config) {
      return Response.json({ error: "config is required" }, { status: 400 });
    }
    const run = await createRun(body.name ?? "ベンチマーク実行", body.config);
    return Response.json({ run: { id: run.id, name: run.name, resultCount: run.results.length } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}
