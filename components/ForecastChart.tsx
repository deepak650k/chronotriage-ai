// components/ForecastChart.tsx – CSS/SVG 4-week bar chart vs dashed capacity line + accessible table

import { AlertTriangle } from "lucide-react";
import type { WeekForecast } from "@/lib/forecast";
import { formatDate } from "@/lib/utils";

interface Props {
  weeks: WeekForecast[];
}

export default function ForecastChart({ weeks }: Props) {
  const capacity = weeks[0]?.capacity ?? 20;
  const maxHours = Math.max(capacity * 1.4, ...weeks.map((w) => w.hours), 10);
  const capacityLinePct = Math.min((capacity / maxHours) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Visual CSS Bar Chart */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Planned hours per week</span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 border-t-2 border-dashed border-[var(--text)]" />
            Weekly capacity ({capacity} h)
          </span>
        </div>

        <div
          className="relative h-56 flex items-end justify-around gap-3 pt-6 pb-2 border-b border-[var(--border)]"
          role="img"
          aria-label="4-week workload bar chart comparing planned hours to weekly capacity"
        >
          {/* Dashed capacity reference line */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-[var(--text)]/50 pointer-events-none z-10"
            style={{ bottom: `calc(${capacityLinePct}% * 0.85 + 8px)` }}
          >
            <span className="text-[10px] font-medium bg-[var(--surface)] px-1 text-[var(--muted)] -top-4 relative">
              {capacity}h cap
            </span>
          </div>

          {weeks.map((w, idx) => {
            const heightPct = Math.min((w.hours / maxHours) * 100, 100);
            return (
              <div
                key={w.weekStart}
                className="flex-1 flex flex-col items-center justify-end h-full gap-1.5"
              >
                <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text)]">
                  {w.crunch && (
                    <AlertTriangle
                      size={13}
                      className="text-[var(--must)] shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span>{w.hours}h</span>
                </div>
                <div className="w-full max-w-[64px] flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      w.crunch ? "bg-[var(--must)]" : "bg-[var(--primary)]"
                    }`}
                    style={{ height: `${Math.max(heightPct * 0.85, w.hours > 0 ? 6 : 2)}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--muted)] text-center">
                  W{idx + 1} · {formatDate(w.weekStart).slice(0, 6)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accessible table alternative */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <caption className="sr-only">
            4-week workload forecast table
          </caption>
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
              <th className="p-3 font-semibold">Week starting</th>
              <th className="p-3 font-semibold">Planned hours</th>
              <th className="p-3 font-semibold">Capacity</th>
              <th className="p-3 font-semibold">Load</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {weeks.map((w, idx) => (
              <tr key={w.weekStart}>
                <td className="p-3 font-medium text-[var(--text)]">
                  Week {idx + 1} ({formatDate(w.weekStart)})
                </td>
                <td className="p-3 text-[var(--muted)]">{w.hours} h</td>
                <td className="p-3 text-[var(--muted)]">{w.capacity} h</td>
                <td className="p-3 text-[var(--muted)]">
                  {Math.round(w.loadRatio * 100)}%
                </td>
                <td className="p-3">
                  {w.crunch ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--must)]">
                      <AlertTriangle size={13} aria-hidden="true" />
                      Crunch week
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[var(--skip)]">
                      Manageable
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
