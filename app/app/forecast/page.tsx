// app/app/forecast/page.tsx – 4-week heuristic workload forecast (/app/forecast)

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { useApp } from "@/lib/context";
import { buildForecast } from "@/lib/forecast";
import { formatDate } from "@/lib/utils";
import ForecastChart from "@/components/ForecastChart";

export default function ForecastPage() {
  const { state, isLoaded, today } = useApp();

  const { forecast, suggestions } = useMemo(() => {
    if (!today) return { forecast: [], suggestions: [] };
    return buildForecast(state.tasks, state.settings, today, 4);
  }, [state.tasks, state.settings, today]);

  if (!isLoaded || !today) {
    return (
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-4">
        <div className="h-8 w-44 rounded bg-[var(--border)] animate-pulse" />
        <div className="h-64 rounded-xl bg-[var(--border)] animate-pulse" />
      </div>
    );
  }

  const crunchWeeks = forecast.filter((w) => w.crunch);

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 sm:pb-10">
      <div className="space-y-1">
        <h1 className="text-[28px] leading-[34px] font-bold text-[var(--text)]">
          Workload Forecast
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Estimated from your deadlines. Adjust your weekly capacity in{" "}
          <Link href="/app/settings" className="text-[var(--primary)] hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>

      <ForecastChart weeks={forecast} />

      <section aria-labelledby="crunch-heading" className="space-y-3">
        <h2 id="crunch-heading" className="text-xl font-semibold text-[var(--text)]">
          Crunch warnings &amp; start-early suggestions
        </h2>

        {crunchWeeks.length === 0 ? (
          <div className="card p-6 flex items-center gap-3 border-l-4 border-l-[var(--skip)]">
            <CheckCircle2 size={20} className="text-[var(--skip)] shrink-0" aria-hidden="true" />
            <p className="text-sm text-[var(--text)]">No crunch weeks ahead. Nice.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {crunchWeeks.map((week) => {
              const weekSuggestions = suggestions.filter((s) =>
                week.taskIds.includes(s.taskId)
              );
              return (
                <article
                  key={week.weekStart}
                  className="card p-5 border-l-4 border-l-[var(--must)] space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-[var(--must)]" aria-hidden="true" />
                    <h3 className="font-semibold text-[var(--text)]">
                      Week of {formatDate(week.weekStart)} ({week.hours} h / {week.capacity} h)
                    </h3>
                  </div>

                  <ul className="list-disc pl-5 text-sm text-[var(--muted)] space-y-1">
                    {week.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>

                  {weekSuggestions.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] flex items-center gap-1.5">
                        <CalendarClock size={14} aria-hidden="true" />
                        Suggested start dates
                      </p>
                      <ul className="space-y-1 text-sm text-[var(--text)]">
                        {weekSuggestions.map((s) => (
                          <li key={s.taskId}>
                            Start <strong>{s.title}</strong> by{" "}
                            <span className="text-[var(--primary)] font-medium">
                              {formatDate(s.startBy)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
