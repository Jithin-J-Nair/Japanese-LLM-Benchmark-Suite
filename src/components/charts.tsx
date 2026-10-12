"use client";

/**
 * Recharts wrappers used by the dashboard and the run report page.
 * All data is pre-aggregated server-side; these components are pure view.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { taskShort, translate, type Language } from "@/i18n";
import { useLanguage } from "@/context/LanguageContext";

const AXIS = { fontSize: 11, fill: "#71717c" } as const;

/** Resolve the axis label: datum's `taskJa` may be a task id (keigo_rewrite)
 *  or an already-localized string; ids are localized from context. */
function useAxisLabels<T extends { taskJa: string }>(data: T[], lang: Language): (T & { __label: string })[] {
  return data.map((d) => ({
    ...d,
    __label: d.taskJa.includes("_") ? taskShort(lang, d.taskJa) : d.taskJa,
  }));
}

export interface RadarDatum {
  taskJa: string;
  [modelName: string]: string | number;
}

export function ModelRadar({
  data,
  series,
  height = 300,
  lang,
}: {
  data: RadarDatum[];
  series: { key: string; color: string }[];
  height?: number;
  /** Optional override; defaults to the active context language. */
  lang?: Language;
}) {
  const { language } = useLanguage();
  const active = lang ?? language;
  const points = translate(active, "chart_points_suffix");
  const rows = useAxisLabels(data, active);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={rows} outerRadius="74%">
        <PolarGrid stroke="#e5e3dc" />
        <PolarAngleAxis dataKey="__label" tick={{ fontSize: 11.5, fill: "#3c3c46", fontWeight: 700 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9b9ba4" }} axisLine={false} />
        {series.map((s) => (
          <Radar
            key={s.key}
            name={s.key}
            dataKey={s.key}
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.12}
            strokeWidth={1.8}
            dot={{ r: 2.2, strokeWidth: 0, fill: s.color }}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
        <Tooltip
          formatter={(v) => [`${String(v)}${points}`] as never}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e3dc" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export interface TaskBarDatum {
  taskJa: string;
  [modelName: string]: string | number;
}

export function TaskBars({
  data,
  series,
  height = 280,
  lang,
}: {
  data: TaskBarDatum[];
  series: { key: string; color: string }[];
  height?: number;
  lang?: Language;
}) {
  const { language } = useLanguage();
  const active = lang ?? language;
  const points = translate(active, "chart_points_suffix");
  const rows = useAxisLabels(data, active);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} barCategoryGap="22%" barGap={1.5}>
        <CartesianGrid vertical={false} stroke="#efede8" />
        <XAxis dataKey="__label" tick={{ fontSize: 11.5, fill: "#3c3c46", fontWeight: 700 }} axisLine={{ stroke: "#e5e3dc" }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          formatter={(v) => [`${String(v)}${points}`] as never}
          cursor={{ fill: "rgba(24,24,29,0.04)" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e3dc" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
        {series.map((s) => (
          <Bar key={s.key} name={s.key} dataKey={s.key} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={18} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface ScatterDatum {
  name: string;
  latencyMs: number;
  score: number;
  cost: number;
  color: string;
  type: string;
}

export function QualityLatencyScatter({
  data,
  height = 300,
  lang,
}: {
  data: ScatterDatum[];
  height?: number;
  lang?: Language;
}) {
  const { language } = useLanguage();
  const activeLang = lang ?? language;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 18, bottom: 6, left: -12 }}>
        <CartesianGrid stroke="#efede8" />
        <XAxis
          type="number"
          dataKey="latencyMs"
          name={translate(activeLang, "chart_latency_name")}
          unit="ms"
          tick={AXIS}
          axisLine={{ stroke: "#e5e3dc" }}
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="score"
          name={translate(activeLang, "chart_score_name")}
          domain={[40, 100]}
          tick={AXIS}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as ScatterDatum;
            return (
              <div className="rounded-lg border border-line bg-card px-3 py-2 text-[11.5px] shadow-md">
                <div className="font-bold" style={{ color: d.color }}>{d.name}</div>
                <div className="text-mute">
                  {translate(activeLang, "chart_tooltip", {
                    score: d.score,
                    latency: d.latencyMs,
                    type: d.type,
                    cost: d.cost > 0 ? ` · $${d.cost.toFixed(4)}` : "",
                  })}
                </div>
              </div>
            );
          }}
        />
        <Scatter data={data}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} fillOpacity={0.85} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export interface LatencyLineDatum {
  sample: string;
  [modelName: string]: string | number;
}
