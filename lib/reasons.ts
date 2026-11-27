// lib/reasons.ts – Plain-language reason sentence builder

import type { Category, Task } from "./types";

export function dueText(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    return `${abs} day${abs !== 1 ? "s" : ""} ago`;
  }
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

interface ReasonParams {
  task: Task;
  days: number;
  category: Category;
  suggested: Category;
  overloaded: boolean;
  hasDependents: boolean;
}

export function buildReason(p: ReasonParams): string {
  const { task, days, category, suggested } = p;
  const hours = Math.round(task.estimatedHours * 10) / 10;
  const imp = task.importance;
  const dt = dueText(days);
  const overdueSuffix = days < 0 ? " This is overdue; do it or reset the date." : "";

  if (task.userOverride !== null) {
    const labelMap: Record<Category, string> = {
      must: "Must Do",
      later: "Schedule Later",
      skip: "Safe to Skip",
    };
    return `You set this to ${labelMap[category]}. The app suggested ${labelMap[suggested]}.`;
  }

  if (category === "must") {
    if (days <= 1 && imp >= 5) {
      return `Due ${dt} and worth ${imp}/10. Start now.${overdueSuffix}`;
    }
    return `Due ${dt}, worth ${imp}/10, about ${hours} h of work. Do this first.${overdueSuffix}`;
  }

  if (category === "skip") {
    return `Low impact (${imp}/10), nothing depends on it, and that week is already over capacity. Skipping it frees about ${hours} h.${overdueSuffix}`;
  }

  return `Worth ${imp}/10 and due ${dt}. Plan about ${hours} h before then; no need to start today.${overdueSuffix}`;
}
