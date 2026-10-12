import { getRun } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const run = await getRun(id);
  if (!run) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ run });
}
