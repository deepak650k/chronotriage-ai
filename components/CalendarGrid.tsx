// components/CalendarGrid.tsx – Month/week calendar view with keyboard navigation

"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfISOWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { Flame, Clock, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import type { Task, TriageResult, Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_CHIP: Record<Category, string> = {
  must: "bg-[var(--must-bg)] text-[var(--must)] border border-[var(--must)]/30",
  later: "bg-[var(--later-bg)] text-[var(--later)] border border-[var(--later)]/30",
  skip: "bg-[var(--skip-bg)] text-[var(--skip)] border border-[var(--skip)]/30",
};

function CategoryIcon({ cat }: { cat: Category }) {
  if (cat === "must") return <Flame size={11} className="shrink-0" aria-hidden="true" />;
  if (cat === "skip") return <Leaf size={11} className="shrink-0" aria-hidden="true" />;
  return <Clock size={11} className="shrink-0" aria-hidden="true" />;
}

function useIsSmallScreen(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false
  );
}

interface Props {
  tasks: Task[];
  results: Map<string, TriageResult>;
  onDayClick: (date: string) => void;
  onChipClick: (task: Task) => void;
  dailyStudyHours: number;
}

export default function CalendarGrid({
  tasks,
  results,
  onDayClick,
  onChipClick,
  dailyStudyHours,
}: Props) {
  const [current, setCurrent] = useState(new Date());
  const isSmall = useIsSmallScreen();
  const [viewOverride, setViewOverride] = useState<"month" | "week" | null>(null);
  const view = viewOverride ?? (isSmall ? "week" : "month");
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const today = new Date();

  const openTasks = tasks.filter(
    (t) => t.status === "todo" || t.status === "in_progress"
  );

  const tasksByDate: Record<string, Task[]> = {};
  for (const t of openTasks) {
    if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = [];
    tasksByDate[t.dueDate].push(t);
  }

  const hoursByDate: Record<string, number> = {};
  for (const [date, ts] of Object.entries(tasksByDate)) {
    hoursByDate[date] = ts.reduce((s, t) => s + t.estimatedHours, 0);
  }

  function dayTint(hours: number): string {
    if (hours === 0) return "";
    if (hours > dailyStudyHours * 1.5) return "bg-[var(--must-bg)]/50";
    if (hours > dailyStudyHours) return "bg-[var(--later-bg)]/50";
    return "";
  }

  const monthStart = startOfMonth(current);
  const lastDay = endOfMonth(current);
  const gridStart = startOfISOWeek(monthStart);
  const daysInGrid: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    if (i >= 35 && d > lastDay && d.getDay() === 1) break;
    daysInGrid.push(d);
  }

  const prevMonth = () =>
    setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  const goToday = () => setCurrent(new Date());

  const handleCellKeyDown = (e: React.KeyboardEvent, idx: number, iso: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onDayClick(iso);
      return;
    }
    let nextIdx = -1;
    if (e.key === "ArrowRight") nextIdx = idx + 1;
    else if (e.key === "ArrowLeft") nextIdx = idx - 1;
    else if (e.key === "ArrowDown") nextIdx = idx + 7;
    else if (e.key === "ArrowUp") nextIdx = idx - 7;
    if (nextIdx >= 0 && nextIdx < daysInGrid.length) {
      e.preventDefault();
      cellRefs.current[nextIdx]?.focus();
    }
  };

  if (view === "week") {
    const weekStart = startOfISOWeek(current);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-3">
        <Toolbar
          label={`Week of ${format(weekStart, "d MMM yyyy")}`}
          onPrev={() => setCurrent(addDays(current, -7))}
          onNext={() => setCurrent(addDays(current, 7))}
          onToday={goToday}
          view={view}
          onViewChange={setViewOverride}
        />
        <div className="space-y-2">
          {weekDays.map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            const dayTasks = tasksByDate[iso] ?? [];
            const isToday = isSameDay(d, today);
            const hours = hoursByDate[iso] ?? 0;
            return (
              <div
                key={iso}
                className={cn(
                  "card p-3",
                  isToday && "ring-2 ring-[var(--primary)]",
                  dayTint(hours)
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "font-medium text-sm",
                      isToday && "text-[var(--primary)] font-semibold"
                    )}
                  >
                    {format(d, "EEE d MMM")}
                    {isToday ? " (Today)" : ""}
                  </span>
                  {hours > 0 && (
                    <span className="text-xs text-[var(--muted)]">{hours} h</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {dayTasks.map((t) => {
                    const res = results.get(t.id);
                    const cat = res?.category ?? "later";
                    return (
                      <button
                        key={t.id}
                        onClick={() => onChipClick(t)}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs px-2.5 min-h-[36px] rounded-full truncate max-w-[220px] focus-ring font-medium",
                          CATEGORY_CHIP[cat]
                        )}
                        aria-label={`${t.title} - ${cat}`}
                      >
                        <CategoryIcon cat={cat} />
                        <span className="truncate">{t.title}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => onDayClick(iso)}
                    className="text-xs text-[var(--primary)] hover:underline focus-ring px-2 min-h-[36px] rounded"
                    aria-label={`Add task on ${format(d, "d MMM")}`}
                  >
                    + Add task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Toolbar
        label={format(current, "MMMM yyyy")}
        onPrev={prevMonth}
        onNext={nextMonth}
        onToday={goToday}
        view={view}
        onViewChange={setViewOverride}
      />
      <div className="grid grid-cols-7 gap-px text-xs font-medium text-[var(--muted)] text-center pb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-xl overflow-hidden border border-[var(--border)]">
        {daysInGrid.map((d, idx) => {
          const iso = format(d, "yyyy-MM-dd");
          const dayTasks = tasksByDate[iso] ?? [];
          const isToday = isSameDay(d, today);
          const isCurrentMonth = isSameMonth(d, current);
          const hours = hoursByDate[iso] ?? 0;
          const visible = dayTasks.slice(0, 3);
          const overflowDesktop = dayTasks.length - 3;
          const overflowTablet = dayTasks.length - 2;

          return (
            <div
              key={iso}
              ref={(el) => {
                cellRefs.current[idx] = el;
              }}
              className={cn(
                "bg-[var(--surface)] p-1.5 sm:p-2 min-h-[96px] cursor-pointer hover:bg-[var(--bg)] transition-colors focus-ring",
                !isCurrentMonth && "opacity-45",
                isToday && "ring-2 ring-inset ring-[var(--primary)]",
                dayTint(hours)
              )}
              onClick={() => onDayClick(iso)}
              role="button"
              tabIndex={0}
              aria-label={`${format(d, "d MMMM yyyy")}, ${dayTasks.length} task${
                dayTasks.length !== 1 ? "s" : ""
              }, ${hours} hours`}
              onKeyDown={(e) => handleCellKeyDown(e, idx, iso)}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={cn(
                    "text-xs font-medium",
                    isToday
                      ? "bg-[var(--primary)] text-white dark:text-[#0B1020] w-6 h-6 rounded-full flex items-center justify-center font-bold"
                      : "text-[var(--text)]"
                  )}
                >
                  {format(d, "d")}
                </span>
                {hours > 0 && (
                  <span className="text-[11px] text-[var(--muted)] font-medium">
                    {hours}h
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {visible.map((t, cIdx) => {
                  const res = results.get(t.id);
                  const cat = res?.category ?? "later";
                  return (
                    <button
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChipClick(t);
                      }}
                      className={cn(
                        "w-full text-left text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1 focus-ring font-medium",
                        cIdx === 2 && "hidden lg:flex",
                        CATEGORY_CHIP[cat]
                      )}
                      aria-label={`${t.title} (${cat})`}
                    >
                      <CategoryIcon cat={cat} />
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
                {overflowTablet > 0 && (
                  <p className="text-[11px] text-[var(--muted)] lg:hidden">
                    +{overflowTablet} more
                  </p>
                )}
                {overflowDesktop > 0 && (
                  <p className="text-[11px] text-[var(--muted)] hidden lg:block">
                    +{overflowDesktop} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toolbar({
  label,
  onPrev,
  onNext,
  onToday,
  view,
  onViewChange,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: "month" | "week";
  onViewChange: (v: "month" | "week") => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="btn-secondary px-3"
          aria-label="Previous period"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          onClick={onNext}
          className="btn-secondary px-3"
          aria-label="Next period"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button onClick={onToday} className="btn-secondary text-sm px-3">
          Today
        </button>
        <h2 className="font-semibold text-[var(--text)] ml-1">{label}</h2>
      </div>
      <div className="flex gap-1" role="group" aria-label="Calendar view">
        {(["month", "week"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={cn(
              "text-sm min-h-[44px] px-4 rounded-lg capitalize font-medium focus-ring",
              view === v
                ? "bg-[var(--primary)] text-white dark:text-[#0B1020]"
                : "btn-secondary"
            )}
            aria-pressed={view === v}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
