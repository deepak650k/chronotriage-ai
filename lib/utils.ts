// lib/utils.ts – Shared utility helpers

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDueText(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const COURSE_PALETTES = [
  "bg-sky-100/80 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-300/70 dark:border-sky-500/25",
  "bg-violet-100/80 dark:bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-300/70 dark:border-violet-500/25",
  "bg-emerald-100/80 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-500/25",
  "bg-amber-100/80 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-300/70 dark:border-amber-500/25",
  "bg-rose-100/80 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300/70 dark:border-rose-500/25",
  "bg-indigo-100/80 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-300/70 dark:border-indigo-500/25",
];

/** Returns a deterministic, accessible pastel pill class for any course name. */
export function coursePillClass(course: string): string {
  let hash = 0;
  for (let i = 0; i < course.length; i++) {
    hash = (hash * 31 + course.charCodeAt(i)) >>> 0;
  }
  return COURSE_PALETTES[hash % COURSE_PALETTES.length];
}

/** Returns a student-friendly label describing an importance rating (1-10). */
export function importanceLabel(imp: number): string {
  if (imp >= 9) return "Exam / Finals / Critical";
  if (imp >= 7) return "Big grade weight";
  if (imp >= 4) return "Regular homework";
  return "Minor / optional";
}
