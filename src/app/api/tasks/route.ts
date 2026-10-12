import { TASKS } from "@/lib/bench/tasks";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ tasks: TASKS });
}
