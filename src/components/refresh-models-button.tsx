"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";

interface RefreshSummary {
  ok: boolean;
  status?: string;
  added?: number;
  updated?: number;
  total?: number;
  durationMs?: number;
  error?: string;
}

/** "Refresh Models" — triggers HuggingFace discovery and re-renders the
 *  server page once the registry has been upserted. */
export function RefreshModelsButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RefreshSummary | null>(null);

  async function refresh() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/models/refresh", { method: "POST" });
      const json = (await res.json()) as RefreshSummary;
      setResult(json);
      if (json.ok) router.refresh();
    } catch (e) {
      setResult({ ok: false, error: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors",
          busy ? "bg-faint" : "bg-ink hover:bg-accent",
        )}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {busy ? t("refresh_scanning") : t("refresh_button")}
      </button>
      {result ? (
        <span
          className={cn(
            "num max-w-sm text-right text-[10.5px] font-bold leading-snug",
            result.ok ? "text-forest" : "text-accent-deep",
          )}
        >
          {result.ok
            ? t("refresh_result", {
                added: result.added ?? 0,
                updated: result.updated ?? 0,
                total: result.total ?? 0,
                sec: Math.round((result.durationMs ?? 0) / 100) / 10,
              })
            : t("refresh_error", { error: result.error ?? t("error_generic") })}
        </span>
      ) : null}
    </span>
  );
}
