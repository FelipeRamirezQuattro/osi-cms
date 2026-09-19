"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const GRID_COLOR = "var(--admin-border)";
const AXIS_TICK = { fontSize: 11 };

/** A single time-series line — every "X over Time" report. */
export function LineChartCard({
  data,
  xKey,
  yKey,
  color = "#04243D",
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  color?: string;
}) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} allowDecimals={false} width={32} />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A horizontal ranked bar list — every "Top X" / grouped-count report. */
export function BarChartCard({
  data,
  labelKey,
  valueKey,
  color = "#E2902A",
}: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  const height = Math.max(160, data.length * 32);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
          <YAxis type="category" dataKey={labelKey} tick={AXIS_TICK} width={160} />
          <Tooltip />
          <Bar dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
