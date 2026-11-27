// lib/triage.test.ts – Vitest unit tests for the triage engine

import { describe, it, expect } from "vitest";
import { triage } from "./triage";
import type { Task, Settings } from "./types";

const TODAY = new Date(2026, 10, 23); // Monday 23 Nov 2026

const settings: Settings = {
  weeklyCapacityHours: 10,
  dailyStudyHours: 3,
  reminderEmail: "",
  voiceEnabled: true,
  theme: "system",
};

const mk = (o: Partial<Task>): Task => ({
  id: "x",
  title: "t",
  course: "",
  dueDate: "2026-11-25",
  estimatedHours: 1,
  importance: 5,
  status: "todo",
  dependsOn: [],
  notes: "",
  userOverride: null,
  createdAt: "2026-11-01T00:00:00Z",
  ...o,
});

describe("triage engine", () => {
  // Test case 1–4: four-task worked example (capacity=10 → week overloaded)
  it("labels the four-task worked example correctly", () => {
    const tasks = [
      mk({ id: "m", dueDate: "2026-11-25", estimatedHours: 4, importance: 9 }),
      mk({ id: "p", dueDate: "2026-11-28", estimatedHours: 6, importance: 7 }),
      mk({ id: "q", dueDate: "2026-12-03", estimatedHours: 1, importance: 3 }),
      mk({ id: "c", dueDate: "2026-11-29", estimatedHours: 3, importance: 2 }),
    ];
    const r = triage(tasks, settings, TODAY);
    expect(r.get("m")!.category).toBe("must");   // score 36.0
    expect(r.get("p")!.category).toBe("later");  // score 16.8
    expect(r.get("q")!.category).toBe("later");  // score 9.6 (>=8, so not skip)
    expect(r.get("c")!.category).toBe("skip");   // score 6.9, all skip conditions met
  });

  // Test case 5: same poster but week NOT overloaded (capacity=20)
  it("case 5: poster is Schedule Later when week is not overloaded", () => {
    const relaxed = { ...settings, weeklyCapacityHours: 20 };
    const tasks = [mk({ id: "c", dueDate: "2026-11-29", estimatedHours: 3, importance: 2 })];
    const r = triage(tasks, relaxed, TODAY);
    expect(r.get("c")!.category).toBe("later");
  });

  // Test case 6: poster that another open task depends on → Schedule Later
  it("case 6: poster with a dependent → Schedule Later", () => {
    const tasks = [
      mk({ id: "c", dueDate: "2026-11-29", estimatedHours: 3, importance: 2 }),
      mk({ id: "other", dueDate: "2026-12-01", estimatedHours: 4, importance: 2, dependsOn: ["c"] }),
    ];
    const r = triage(tasks, settings, TODAY);
    expect(r.get("c")!.category).toBe("later");
  });

  // Test case 7: overdue by 1 day, importance 6 → Must Do (hard rule)
  it("case 7: overdue task with importance >= 5 → Must Do (hard rule)", () => {
    const tasks = [mk({ id: "o", dueDate: "2026-11-22", importance: 6 })];
    const r = triage(tasks, settings, TODAY);
    const result = r.get("o")!;
    expect(result.category).toBe("must");
    expect(result.reason).toMatch(/overdue/i);
  });

  // Test case 8: due tomorrow, importance 4, 1 hour → score 32 → Must Do (score rule)
  it("case 8: due tomorrow, importance 4, 1 h → Must Do by score", () => {
    const tasks = [mk({ id: "t8", dueDate: "2026-11-24", importance: 4, estimatedHours: 1 })];
    const r = triage(tasks, settings, TODAY);
    const res = r.get("t8")!;
    expect(res.score).toBeCloseTo(32.0, 1);
    expect(res.category).toBe("must");
  });

  // Test case 9: importance 2, due tomorrow, 0.5 h → score 17.8 → Schedule Later
  it("case 9: importance 2, due tomorrow, 0.5 h → Schedule Later", () => {
    const tasks = [mk({ id: "t9", dueDate: "2026-11-24", importance: 2, estimatedHours: 0.5 })];
    const r = triage(tasks, settings, TODAY);
    const res = r.get("t9")!;
    expect(res.score).toBeCloseTo(17.8, 0);
    expect(res.category).toBe("later");
  });

  // Test case 10: userOverride = must → category must, overridden true
  it("case 10: userOverride = must → Must Do, overridden = true", () => {
    const tasks = [mk({ id: "t10", dueDate: "2026-12-20", importance: 1, userOverride: "must" })];
    const r = triage(tasks, settings, TODAY);
    const res = r.get("t10")!;
    expect(res.category).toBe("must");
    expect(res.overridden).toBe(true);
    expect(res.suggested).not.toBe("must");
  });

  // Test case 11: done or skipped → absent from results
  it("case 11: done and skipped tasks absent from results", () => {
    const tasks = [
      mk({ id: "d", status: "done" }),
      mk({ id: "s", status: "skipped" }),
    ];
    const r = triage(tasks, settings, TODAY);
    expect(r.has("d")).toBe(false);
    expect(r.has("s")).toBe(false);
  });

  // Test case 12: importance 3, due in 3 days, 0.5 h → score 21.3 → Must Do
  it("case 12: cheap urgent low-importance task → Must Do by score", () => {
    const tasks = [mk({ id: "t12", dueDate: "2026-11-26", importance: 3, estimatedHours: 0.5 })];
    const r = triage(tasks, settings, TODAY);
    const res = r.get("t12")!;
    expect(res.score).toBeCloseTo(21.3, 0);
    expect(res.category).toBe("must");
  });
});
