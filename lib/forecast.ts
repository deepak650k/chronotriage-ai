// lib/forecast.ts – Heuristic 4-week workload forecast (stretch feature)
// Not ML prediction. The UI must label it "Estimated from your deadlines."

import { addDays, format, parseISO, startOfISOWeek } from "date-fns";
import type { Settings, Task } from "./types";
import { isOpen } from "./triage";

export interface WeekForecast {
  weekStart: string;
  hours: number;
  capacity: number;
  loadRatio: number;
  crunch: boolean;
  reasons: string[];
  taskIds: string[];
}

export interface StartSuggestion {
  taskId: string;
  title: string;
  startBy: string;
}

function hasDenseWindow(tasks: Task[]): boolean {
  const important = tasks.filter((t) => t.importance >= 6);
  if (important.length < 3) return false;
  for (let i = 0; i < important.length; i++) {
    for (let j = i + 1; j < important.length; j++) {
      for (let k = j + 1; k < important.length; k++) {
        const a = parseISO(important[i].dueDate).getTime();
        const b = parseISO(important[j].dueDate).getTime();
        const c = parseISO(important[k].dueDate).getTime();
        const spread = Math.max(a, b, c) - Math.min(a, b, c);
        if (spread <= 3 * 24 * 60 * 60 * 1000) return true;
      }
    }
  }
  return false;
}

export function buildForecast(
  tasks: Task[],
  s: Settings,
  today: Date = new Date(),
  weeks = 4
): { forecast: WeekForecast[]; suggestions: StartSuggestion[] } {
  const open = tasks.filter(isOpen);
  const start = startOfISOWeek(today);
  const forecast: WeekForecast[] = [];

  for (let i = 0; i < weeks; i++) {
    const ws = addDays(start, i * 7);
    const we = addDays(ws, 6);
    const inWeek = open.filter((t) => {
      const d = parseISO(t.dueDate);
      return (i === 0 && d < ws) || (d >= ws && d <= we);
    });
    const hours = inWeek.reduce((a, t) => a + t.estimatedHours, 0);
    const ratio = hours / s.weeklyCapacityHours;
    const dense = hasDenseWindow(inWeek);
    const reasons: string[] = [];
    if (ratio > 1)
      reasons.push(`${hours} h planned vs ${s.weeklyCapacityHours} h capacity`);
    if (dense) reasons.push("Several important deadlines within 3 days");
    forecast.push({
      weekStart: format(ws, "yyyy-MM-dd"),
      hours,
      capacity: s.weeklyCapacityHours,
      loadRatio: ratio,
      crunch: ratio > 1 || dense,
      reasons,
      taskIds: inWeek.map((t) => t.id),
    });
  }

  // Start-early suggestions for important tasks in crunch weeks
  const suggestions: StartSuggestion[] = [];
  for (const week of forecast) {
    if (!week.crunch) continue;
    for (const id of week.taskIds) {
      const t = open.find((x) => x.id === id);
      if (!t || t.importance < 6) continue;
      const daysNeeded = Math.ceil(t.estimatedHours / s.dailyStudyHours) + 2;
      const startDate = addDays(parseISO(t.dueDate), -daysNeeded);
      const startBy = startDate < today ? format(today, "yyyy-MM-dd") : format(startDate, "yyyy-MM-dd");
      suggestions.push({ taskId: t.id, title: t.title, startBy });
    }
  }

  return { forecast, suggestions };
}
