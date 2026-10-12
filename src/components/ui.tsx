import type { HTMLAttributes, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(24,24,29,0.04)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, en }: { children: ReactNode; en?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="text-[11px] font-bold tracking-[0.18em] text-mute uppercase">
        {en ?? ""}
      </span>
      <h2 className="text-sm font-bold text-ink">{children}</h2>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "forest" | "navy" | "gold" | "white";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[#efede8] text-ink2 border-line",
    accent: "bg-accent-soft text-accent-deep border-[#f0d3c9]",
    forest: "bg-[#e8f2ed] text-forest border-[#cfe3d9]",
    navy: "bg-[#e9edf5] text-navy border-[#d3dbe9]",
    gold: "bg-[#f6efdd] text-gold border-[#e8dbbb]",
    white: "bg-white/10 text-white border-white/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-bold leading-none",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Horizontal score bar with value label, used across tables/cards. */
export function ScoreBar({
  value,
  max = 100,
  color = "#2e6b52",
  width = 72,
}: {
  value: number;
  max?: number;
  color?: string;
  width?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-block h-1.5 overflow-hidden rounded-full bg-[#eceae4]" style={{ width }}>
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </span>
    </span>
  );
}

export function scoreColor(score: number): string {
  if (score >= 85) return "#2e6b52";
  if (score >= 70) return "#20807d";
  if (score >= 55) return "#a07a2e";
  if (score >= 40) return "#c2511e";
  return "#b3261e";
}

export function scoreToneClass(score: number): string {
  if (score >= 85) return "text-forest";
  if (score >= 70) return "text-[#20807d]";
  if (score >= 55) return "text-gold";
  return "text-accent-deep";
}

export function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtJst(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

/** Compact human number: 1,234 -> "1.2k", 3,456,789 -> "3.5M". */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}

export function PageHeader({
  en,
  title,
  description,
  actions,
}: {
  en: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-accent uppercase">
          <span className="inline-block h-1.5 w-5 rounded-full bg-accent" />
          {en}
        </p>
        <h1 className="mt-2 text-[26px] font-black leading-tight tracking-tight text-ink sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-mute">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
