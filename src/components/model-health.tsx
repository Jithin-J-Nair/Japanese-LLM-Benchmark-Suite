"use client";

import { useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type Health = "idle" | "loading" | "ok" | "sandbox" | "missing_key" | "unreachable" | "error";

export function HealthCheckButton({ modelId }: { modelId: string }) {
  const { t, language } = useLanguage();
  const [state, setState] = useState<Health>("idle");
  const [detail, setDetail] = useState<string>("");

  async function check() {
    setState("loading");
    setDetail("");
    try {
      const res = await fetch("/api/models/health", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ modelId }),
      });
      const json = (await res.json()) as {
        status?: Health;
        detail?: string;
        detailEn?: string;
        error?: string;
      };
      if (!res.ok) {
        setState("error");
        setDetail(json.error ?? t("health_error"));
      } else {
        setState(json.status ?? "error");
        setDetail(language === "en" ? (json.detailEn ?? json.detail ?? "") : (json.detail ?? ""));
      }
    } catch (e) {
      setState("error");
      setDetail(String(e));
    }
  }

  const color: Record<Health, string> = {
    idle: "border-line text-ink2",
    loading: "border-line text-mute",
    ok: "border-forest text-forest",
    sandbox: "border-navy text-navy",
    missing_key: "border-gold text-gold",
    unreachable: "border-accent-deep text-accent-deep",
    error: "border-accent-deep text-accent-deep",
  };
  const label: Record<Health, string> = {
    idle: t("health_check"),
    loading: t("health_checking"),
    ok: t("health_ok"),
    sandbox: t("health_sandbox"),
    missing_key: t("health_missing_key"),
    unreachable: t("health_unreachable"),
    error: t("health_error"),
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={check}
        disabled={state === "loading"}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10.5px] font-bold transition-colors hover:bg-washi ${color[state]}`}
      >
        {state === "loading" ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Activity size={11} />
        )}
        {label[state]}
      </button>
      {detail ? <span className="max-w-56 text-right text-[9.5px] leading-snug text-faint">{detail}</span> : null}
    </span>
  );
}
