// lib/triage.ts – Deterministic triage scoring engine. Pure functions, no I/O.
// Pass today as a parameter so tests are repeatable.

import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import type { Category, Settings, Task, TriageResult } from "./types";
import { buildReason } from "./reasons";

export const T = {
  mustScore: 20,
  skipScore: 8,
  skipMaxImportance: 3,
  hardDays: 1,
  hardImportance: 5,
} as const;

export const isOpen = (t: Task) =>
  t.status === "todo" || t.status === "in_progress";

export function urgency(days: number): number {
  if (days <= 1) return 10;
  if (days <= 3) return 8;
  if (days <= 7) return 6;
  if (days <= 14) return 4;
  return 2;
}

export const priorityScore = (
  u: number,
  importance: number,
  hours: number
): number => (u * importance) / (1 + hours / 4);

export const weekKeyOf = (iso: string): string =>
  format(startOfISOWeek(parseISO(iso)), "yyyy-MM-dd");

export function currentWeekHours(
  tasks: Task[],
  today: Date = new Date()
): number {
  const thisWeekKey = format(startOfISOWeek(today), "yyyy-MM-dd");
  return tasks
    .filter((t) => isOpen(t) && weekKeyOf(t.dueDate) === thisWeekKey)
    .reduce((sum, t) => sum + t.estimatedHours, 0);
}

export function triage(
  tasks: Task[],
  settings: Settings,
  today: Date = new Date()
): Map<string, TriageResult> {
  const open = tasks.filter(isOpen);

  // Build week hour totals and dependedOn set from open tasks
  const hoursByWeek = new Map<string, number>();
  const dependedOn = new Set<string>();
  for (const t of open) {
    const k = weekKeyOf(t.dueDate);
    hoursByWeek.set(k, (hoursByWeek.get(k) ?? 0) + t.estimatedHours);
    t.dependsOn.forEach((id) => dependedOn.add(id));
  }

  const out = new Map<string, TriageResult>();

  for (const t of open) {
    const days = differenceInCalendarDays(parseISO(t.dueDate), today);
    const u = urgency(days);
    const score = priorityScore(u, t.importance, t.estimatedHours);
    const weekHours = hoursByWeek.get(weekKeyOf(t.dueDate)) ?? 0;
    const overloaded = weekHours > settings.weeklyCapacityHours;
    const hasDependents = dependedOn.has(t.id);

    let suggested: Category = "later";
    if (days <= T.hardDays && t.importance >= T.hardImportance) {
      suggested = "must";
    } else if (score >= T.mustScore) {
      suggested = "must";
    } else if (
      score < T.skipScore &&
      t.importance <= T.skipMaxImportance &&
      !hasDependents &&
      overloaded
    ) {
      suggested = "skip";
    }

    const category = t.userOverride ?? suggested;

    out.set(t.id, {
      taskId: t.id,
      days,
      urgency: u,
      score: Math.round(score * 10) / 10,
      suggested,
      category,
      overridden: t.userOverride !== null,
      weekOverloaded: overloaded,
      hasDependents,
      reason: buildReason({
        task: t,
        days,
        category,
        suggested,
        overloaded,
        hasDependents,
      }),
    });
  }

  return out;
}
