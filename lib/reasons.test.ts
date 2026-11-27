// lib/reasons.test.ts – Unit tests for dueText and buildReason pluralisation

import { describe, it, expect } from "vitest";
import { buildReason, dueText } from "./reasons";
import type { Task } from "./types";

const baseTask: Task = {
  id: "1",
  title: "Essay",
  course: "English",
  dueDate: "2026-11-23",
  estimatedHours: 2.5,
  importance: 7,
  status: "todo",
  dependsOn: [],
  notes: "",
  userOverride: null,
  createdAt: "2026-11-20T00:00:00Z",
};

describe("reasons", () => {
  it("formats dueText accurately for today, tomorrow, future, and overdue", () => {
    expect(dueText(0)).toBe("today");
    expect(dueText(1)).toBe("tomorrow");
    expect(dueText(2)).toBe("in 2 days");
    expect(dueText(-1)).toBe("1 day ago");
    expect(dueText(-3)).toBe("3 days ago");
  });

  it("includes overdue note when days < 0", () => {
    const r = buildReason({
      task: baseTask,
      days: -1,
      category: "must",
      suggested: "must",
      overloaded: false,
      hasDependents: false,
    });
    expect(r).toContain("1 day ago");
    expect(r).toContain("This is overdue; do it or reset the date.");
  });

  it("rounds hours to one decimal and formats overridden reason", () => {
    const r = buildReason({
      task: { ...baseTask, estimatedHours: 2.34, userOverride: "later" },
      days: 2,
      category: "later",
      suggested: "must",
      overloaded: false,
      hasDependents: false,
    });
    expect(r).toBe("You set this to Schedule Later. The app suggested Must Do.");
  });
});
