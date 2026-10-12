"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";

type Format = "csv" | "json" | "md";

/**
 * Download triggers for run exports. Uses window.location.href against the
 * attachment-serving route, with per-format busy state and error surfacing.
 */
export function ExportButtons({
  runId,
  compact = false,
}: {
  runId: string;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: Format) {
    setError(null);
    setBusy(format);
    try {
      // Pre-flight so failures surface in the UI instead of a silent tab.
      const probe = await fetch(`/api/runs/${runId}/export?format=${format}`, {
        cache: "no-store",
      }).catch(() => null);
      if (probe && !probe.ok) {
        const body = await probe.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${probe.status}`);
      }
      window.location.href = `/api/runs/${runId}/export?format=${format}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", error && "relative")}>
      {(["csv", "json", "md"] as Format[]).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => download(f)}
          disabled={busy !== null}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border font-bold uppercase transition-colors",
            compact
              ? "border-line bg-card px-2 py-1 text-[10.5px] text-ink2 hover:border-accent hover:text-accent"
              : "border-line bg-card px-3.5 py-2.5 text-[12px] text-ink2 hover:border-accent hover:text-accent",
            busy && "opacity-60",
          )}
        >
          {busy === f ? <Loader2 size={compact ? 10 : 13} className="animate-spin" /> : <Download size={compact ? 10 : 13} />}
          {f === "md" ? t("common_report") : f}
        </button>
      ))}
      {error ? (
        <span className="absolute -bottom-5 right-0 whitespace-nowrap text-[10px] font-bold text-accent-deep">
          {error}
        </span>
      ) : null}
    </span>
  );
}
