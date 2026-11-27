// lib/chatAssistant.test.ts – Unit tests for ChronoBot Q&A, task walkthroughs, and boundaries

import { describe, it, expect } from "vitest";
import { buildSiteReply, type ChatContext } from "./chatAssistant";

const sampleContext: ChatContext = {
  weekHours: 4.5,
  capacity: 20,
  counts: { must: 2, later: 6, skip: 0 },
  tasks: [
    {
      title: "Maths assignment 4",
      course: "Maths",
      hours: 4,
      days: 2,
      importance: 9,
      score: 36,
      category: "must",
      reason: "Due in 2 days, worth 9/10, about 4 h of work. Do this first.",
    },
    {
      title: "Club poster design",
      course: "Club",
      hours: 3,
      days: 10,
      importance: 2,
      score: 6.9,
      category: "later",
      reason: "Low impact, 10 days away.",
    },
  ],
};

describe("buildSiteReply", () => {
  it("answers questions about specific tasks on the student board", () => {
    const reply = buildSiteReply("Why is Maths assignment 4 marked Must Do?", sampleContext);
    expect(reply).toContain("Maths assignment 4");
    expect(reply).toContain("Must Do");
    expect(reply).toContain("36.0");
  });

  it("walks through hypothetical tasks described by the student", () => {
    const reply = buildSiteReply(
      "Quiz tomorrow (1 hour, importance 4) and a project in 12 days (10 hours, importance 9)."
    );
    expect(reply).toContain("score 32, so Must Do");
    expect(reply).toContain("score 10, so Schedule Later");
    expect(reply).toContain("The real planner gives the exact result for your whole week.");
  });

  it("asks one question at a time when task details are missing", () => {
    const reply = buildSiteReply("I have a chemistry quiz tomorrow taking 2 hours");
    expect(reply).toContain("1 to 10");
  });

  it("explains all major website pages and features", () => {
    expect(buildSiteReply("What does this website do?")).toContain("/app/forecast");
    expect(buildSiteReply("How does the Calendar work?")).toContain("arrow-key navigation");
    expect(buildSiteReply("How does Forecast work?")).toContain("crunch weeks");
    expect(buildSiteReply("How do I export my data in Settings?")).toContain("Export JSON");
    expect(buildSiteReply("How do email reminders work?")).toContain("Zapier");
    expect(buildSiteReply("How do task dependencies work?")).toContain("Safe to Skip");
  });

  it("answers scoring, privacy, and off-topic boundaries accurately", () => {
    expect(buildSiteReply("How does scoring work?")).toContain("(urgency × importance)");
    expect(buildSiteReply("Is my data private?")).toContain("chronotriage:v1");
    expect(buildSiteReply("What is the weather in Tokyo?")).toBe(
      "I'm best at helping with deadlines and ChronoTriage. Want me to explain how it works?"
    );
  });
});
