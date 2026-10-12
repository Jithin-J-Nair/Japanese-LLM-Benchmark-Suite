import { getModel } from "@/lib/bench/models";
import { getModelAnywhere } from "@/lib/server/dynamic-models";
import { rngFor } from "@/lib/bench/random";

/**
 * Model health check.
 * - API models: verifies the API key env var is present; if an endpoint is
 *   configured it is pinged with a 2.5s timeout.
 * - Local models with an endpoint: pings GET {endpoint}/.
 * - Local models without an endpoint: sandbox profile check (registry only).
 */
export const dynamic = "force-dynamic";

async function ping(url: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { modelId } = (await req.json()) as { modelId: string };
    // Static registry first, then HuggingFace-discovered rows.
    const model = getModel(modelId) ?? (await getModelAnywhere(modelId));
    if (!model) return Response.json({ error: "unknown model" }, { status: 404 });

    if (model.type === "api") {
      const hasKey = model.apiKeyEnv ? Boolean(process.env[model.apiKeyEnv]) : false;
      if (!hasKey) {
        return Response.json({
          modelId,
          status: "missing_key",
          detail: `${model.apiKeyEnv} が未設定です。サンドボックスモードで評価可能。`,
          detailEn: `${model.apiKeyEnv} is not set. Sandbox-mode evaluation is available.`,
        });
      }
      const reachable = model.endpoint ? await ping(model.endpoint) : false;
      return Response.json({ modelId, status: reachable ? "ok" : "unreachable" });
    }

    if (model.endpoint) {
      const reachable = await ping(model.endpoint);
      return Response.json({ modelId, status: reachable ? "ok" : "unreachable" });
    }

    // Sandbox profile: deterministic pseudo-latency for the smoke prompt.
    const latency = 120 + Math.round(rngFor("health", modelId)() * 90);
    return Response.json({
      modelId,
      status: "sandbox",
      detail: `ローカルプロファイル登録済み・推論レイテンシ見積 ${latency}ms (smoke: 「おはよう」→「おはようございます。」)`,
      detailEn: `Local profile registered · estimated inference latency ${latency}ms (smoke: 「おはよう」→「おはようございます。」)`,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
