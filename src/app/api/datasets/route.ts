import { DATASETS } from "@/lib/bench/datasets";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ datasets: DATASETS });
}
