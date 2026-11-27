// lib/forecast.test.ts – Unit tests for the 4-week heuristic forecast engine

import { describe, it, expect } from "vitest";
import { buildForecast } from "./forecast";
import type { Settings, Task } from "./types";

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
  estimatedHours: 2,
  importance: 6,
  status: "todo",
  dependsOn: [],
  notes: "",
  userOverride: null,
  createdAt: "2026-11-01T00:00:00Z",
  ...o,
});

describe("buildForecast", () => {
  it("flags a crunch week when planned hours exceed weekly capacity", () => {
    const tasks = [
      mk({ id: "1", title: "Big report", dueDate: "2026-11-26", estimatedHours: 12 }),
    ];
    const { forecast } = buildForecast(tasks, settings, TODAY);
    expect(forecast).toHaveLength(4);
    expect(forecast[0].crunch).toBe(true);
    expect(forecast[0].loadRatio).toBeCloseTo(1.2, 2);
    expect(forecast[0].reasons[0]).toContain("12 h planned vs 10 h capacity");
  });

  it("flags a crunch week for 3+ important tasks within a 3-day window", () => {
    const tasks = [
      mk({ id: "1", dueDate: "2026-12-01", estimatedHours: 1, importance: 6 }),
      mk({ id: "2", dueDate: "2026-12-02", estimatedHours: 1, importance: 7 }),
      mk({ id: "3", dueDate: "2026-12-03", estimatedHours: 1, importance: 8 }),
    ];
    const { forecast } = buildForecast(tasks, settings, TODAY);
    expect(forecast[1].hours).toBe(3);
    expect(forecast[1].crunch).toBe(true);
    expect(forecast[1].reasons).toContain("Several important deadlines within 3 days");
  });

  it("counts overdue open tasks inside week 1", () => {
    const tasks = [
      mk({ id: "overdue", dueDate: "2026-11-20", estimatedHours: 5 }),
    ];
    const { forecast } = buildForecast(tasks, settings, TODAY);
    expect(forecast[0].hours).toBe(5);
    expect(forecast[0].taskIds).toContain("overdue");
  });

  it("clamps startBy suggestions so they are never earlier than today", () => {
    const tasks = [
      mk({ id: "urgent", title: "Huge essay", dueDate: "2026-11-25", estimatedHours: 15, importance: 9 }),
    ];
    const { suggestions } = buildForecast(tasks, settings, TODAY);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].startBy).toBe("2026-11-23");
  });
});
