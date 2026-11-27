// lib/chatAssistant.ts – ChronoBot website knowledge base, task walkthrough calculator, and deterministic Q&A

import { z } from "zod";
import { urgency, priorityScore } from "./triage";

export const TaskSummarySchema = z.object({
  title: z.string().max(80),
  course: z.string().max(40).optional().default(""),
  hours: z.number().min(0).max(100),
  days: z.number().int(),
  importance: z.number().int().min(1).max(10),
  score: z.number().min(0).max(200).optional(),
  category: z.enum(["must", "later", "skip"]),
  reason: z.string().max(300),
});

export const ChatContextSchema = z.object({
  weekHours: z.number().min(0).max(200),
  capacity: z.number().min(1).max(168),
  counts: z.object({
    must: z.number().int().min(0),
    later: z.number().int().min(0),
    skip: z.number().int().min(0),
  }),
  tasks: z.array(TaskSummarySchema).max(15).optional().default([]),
});

export type ChatContext = z.infer<typeof ChatContextSchema>;

export const WEBSITE_KNOWLEDGE_BASE = `WEBSITE PAGES & FEATURES:
- Dashboard (/app): Personalized greeting, "Email me today's plan", "Play today's briefing" voice player, 3 category count cards (Must Do, Schedule Later, Safe to Skip), Weekly Load Meter (green <70%, amber 70–100%, red >100%), "Start here next" spotlight, filter tabs, task cards with Change label / Done / Edit / Rephrase, and skip suggestions.
- Calendar (/app/calendar): Month and week view with arrow-key navigation; days exceeding daily study hours tint amber or red; click any day to view tasks or add a task pre-filled for that date.
- Tasks (/app/tasks): Full list with 5 filters (search title, status, category, course, sort by due date/importance/score), inline label override, restore, and delete.
- Forecast (/app/forecast): 4-week workload bar chart against weekly capacity line, accessible table, crunch-week warnings (>100% capacity), and start-early suggestions.
- Settings (/app/settings): Weekly capacity hours (default 20 h), daily study hours (default 3 h), reminder email, voice briefing toggle, theme (Light, Dark, System), Load demo data, Export JSON backup, and Reset all data.
- About (/about): Full scoring formula, urgency table, category rules, 3 team roles, tools used, privacy note, and limitations.
- Add Task modal: Quick study presets (Assignment, Exam/Quiz, Lab Report, Reading, Club/Extra), quick course pills, due date shortcuts, effort pills, importance 1–10, and prerequisites ("Depends on").
- Reminders & Extras: Zapier Catch Hook -> Gmail sends today's plan on button click; ElevenLabs speaks today's briefing; Gemini optionally rephrases explanations; tasks stay privately in browser localStorage (chronotriage:v1) with zero trackers.`;

const CATEGORY_NAME: Record<"must" | "later" | "skip", string> = {
  must: "Must Do",
  later: "Schedule Later",
  skip: "Safe to Skip",
};

interface TopicRule {
  keywords: string[];
  answer: (ctx?: ChatContext) => string;
}

const TOPIC_RULES: TopicRule[] = [
  {
    keywords: ["stress", "overwhelm", "anxious", "burnout", "panic", "too much"],
    answer: (ctx) => {
      const first = ctx?.tasks.find((t) => t.category === "must");
      const step = first
        ? `Start with one small step on "${first.title}" (~${first.hours} h).`
        : "Take a short break and pick just one small step next.";
      return `Take a slow breath — overlapping deadlines feel heavy, and breaking them into small steps helps. ${step} If things feel overwhelming, consider talking to a friend, family member, or college counsellor.`;
    },
  },
  {
    keywords: ["graded", "grade", "exam weight", "syllabus", "professor", "teacher"],
    answer: () =>
      "ChronoTriage gives advice from a simple rule and never promises grades or knows your syllabus. For graded work, always check with your teacher before dropping or delaying anything.",
  },
  {
    keywords: ["what can this", "what does this", "what is chronotriage", "about this website", "this website", "this site", "feature", "pages", "overview", "help", "how to use"],
    answer: () =>
      "ChronoTriage turns deadlines into a calm plan: Must Do, Schedule Later, or Safe to Skip. Explore Dashboard (/app), Calendar (/app/calendar), Tasks (/app/tasks), 4-week Forecast (/app/forecast), Settings (/app/settings), and About (/about).",
  },
  {
    keywords: ["calendar", "month", "week view", "day panel", "grid"],
    answer: () =>
      "Calendar (/app/calendar) shows your deadlines in Month or Week view with arrow-key navigation. Heavy days tint amber or red, and clicking any day shows its tasks or lets you add a new one for that date.",
  },
  {
    keywords: ["forecast", "crunch", "4 week", "four week", "start early", "begin by", "chart"],
    answer: () =>
      "Forecast (/app/forecast) compares the next 4 weeks of planned hours against your weekly capacity line, flags crunch weeks over 100%, and suggests start-early dates for big tasks.",
  },
  {
    keywords: ["tasks page", "filter", "search", "sort", "table"],
    answer: () =>
      "Tasks (/app/tasks) lets you search by title and filter by status, category, course, or sort by due date, importance, or score. You can edit, mark done, override labels, restore, or delete there.",
  },
  {
    keywords: ["setting", "capacity", "daily study", "export", "backup", "json", "reset", "demo"],
    answer: () =>
      "Settings (/app/settings) lets you set weekly capacity (default 20 h), daily study hours, reminder email, voice briefing toggle, and theme (Light/Dark/System), plus Load demo data, Export JSON backup, or Reset all data.",
  },
  {
    keywords: ["depend", "prerequisite", "blocked"],
    answer: () =>
      "In the Add/Edit Task modal, you can mark tasks under 'Depends on'. Any task that another open task depends on is never marked Safe to Skip.",
  },
  {
    keywords: ["theme", "dark", "light", "mode", "color", "colour"],
    answer: () =>
      "Click the Sun/Moon icon in the top bar anytime to toggle Light mode and Dark mode, or pick System in Settings (/app/settings).",
  },
  {
    keywords: ["add task", "preset", "create task", "new task", "hours", "importance"],
    answer: () =>
      "Click '+ Add task' to add a deadline with due date, hours (0.5–40 h), and importance (1–10), or tap quick presets like Assignment, Exam/Quiz, or Lab Report.",
  },
  {
    keywords: ["voice", "briefing", "audio", "elevenlabs", "speak", "play"],
    answer: () =>
      "Click 'Play today's briefing' on the Dashboard to hear a spoken summary (via ElevenLabs when configured, with a readable transcript always shown). Toggle it in Settings.",
  },
  {
    keywords: ["rephrase", "gemini", "ai explain"],
    answer: () =>
      "Each task card has a 'Rephrase' button that asks Gemini to reword its reason calmly without changing the deterministic label.",
  },
  {
    keywords: ["botpress", "chatbot", "chronobot"],
    answer: () =>
      "I'm ChronoBot! I help explain your deadlines, labels, and every page on ChronoTriage. You can also connect a Botpress Webchat bot in Settings/env vars.",
  },
  {
    keywords: ["email", "remind", "zapier", "gmail", "webhook"],
    answer: () =>
      "Save your reminder email in Settings (/app/settings), then click 'Email me today's plan' on the Dashboard to send your Must Do and Skip list via Zapier.",
  },
  {
    keywords: ["first", "now", "next", "priority", "today", "start", "should i do", "focus"],
    answer: (ctx) => {
      if (!ctx || ctx.tasks.length === 0) {
        return "You have no open tasks yet. Click '+ Add task' or 'Load demo data' on the Dashboard, and I can walk you through what to do first.";
      }
      const mustTasks = ctx.tasks.filter((t) => t.category === "must");
      if (mustTasks.length > 0) {
        const list = mustTasks
          .slice(0, 2)
          .map((t) => `"${t.title}" (~${t.hours} h)`)
          .join(" and ");
        return `Start with ${list}. ${mustTasks[0].reason} ChronoTriage gives advice, and you always decide.`;
      }
      const next = ctx.tasks[0];
      return `You have 0 Must Do tasks right now. Next up is "${next.title}" (~${next.hours} h). Work ahead calmly at your own pace.`;
    },
  },
  {
    keywords: ["week", "load", "busy", "capacity", "bar", "hour"],
    answer: (ctx) => {
      if (!ctx) {
        return "The load meter compares this week's hours to your weekly capacity (default 20 h): green under 70%, amber 70–100%, red over 100%.";
      }
      const pct = Math.round((ctx.weekHours / ctx.capacity) * 100);
      const stateWord =
        pct > 100 ? "over capacity" : pct >= 70 ? "getting full" : "room to breathe";
      return `This week has ${Math.round(ctx.weekHours * 10) / 10} of ${ctx.capacity} h planned (${pct}% — ${stateWord}): ${ctx.counts.must} Must Do, ${ctx.counts.later} Schedule Later, ${ctx.counts.skip} Safe to Skip.`;
    },
  },
  {
    keywords: ["skip", "drop"],
    answer: (ctx) => {
      const base =
        "It means a task is low impact (importance 3 or lower, score below 8), nothing depends on it, and your week is already over capacity, so dropping it frees time. It's only a suggestion, you decide, and you can undo it.";
      const skip = ctx?.tasks.find((t) => t.category === "skip");
      return skip ? `${base} Right now "${skip.title}" is flagged as Safe to Skip.` : base;
    },
  },
  {
    keywords: ["score", "scoring", "formula", "triage", "rule", "calculat", "urgency", "hard rule", "must do", "schedule later"],
    answer: () =>
      "Score = (urgency × importance) / (1 + hours / 4). Urgency: ≤1 day (or overdue) = 10, 2–3 d = 8, 4–7 d = 6, 8–14 d = 4, 15+ d = 2. Must Do if score ≥ 20 or (≤1 day & importance ≥ 5). Safe to Skip needs score < 8, importance ≤ 3, no dependents, and week over capacity. Everything else is Schedule Later.",
  },
  {
    keywords: ["change", "override", "label", "undo", "wrong"],
    answer: () =>
      "You stay in control: click 'Change label' on any task to override it to Must Do, Schedule Later, or Safe to Skip. You can clear overrides or undo skips anytime.",
  },
  {
    keywords: ["privat", "data", "account", "login", "sign up", "store", "localstorage", "team", "built", "who made"],
    answer: () =>
      "No account is needed and there are zero trackers. Your tasks stay privately in your browser's localStorage (chronotriage:v1), and you can Export JSON in Settings anytime.",
  },
];

const UNRELATED_TOPICS = [
  "weather",
  "forecast weather",
  "temperature",
  "rain",
  "news",
  "stock",
  "bitcoin",
  "crypto",
  "recipe",
  "cook",
  "movie",
  "sport",
  "football",
  "cricket",
  "solve my homework",
  "write my essay",
  "joke",
];

function findMatchingTask(q: string, ctx?: ChatContext) {
  if (!ctx?.tasks.length) return undefined;
  return ctx.tasks.find((t) => {
    const title = t.title.toLowerCase();
    const course = t.course.toLowerCase();
    if (q.includes(title)) return true;
    const words = title.split(/\s+/).filter((w) => w.length >= 4);
    const matchesWords = words.filter((w) => q.includes(w)).length;
    if (matchesWords >= 2 || (words.length === 1 && matchesWords === 1)) return true;
    if (course.length >= 3 && q.includes(course)) return true;
    return false;
  });
}

interface ParsedScenarioTask {
  label: string;
  days: number | null;
  hours: number | null;
  importance: number | null;
}

function parseSingleScenarioClause(clause: string): ParsedScenarioTask | null {
  const lower = clause.toLowerCase();
  const hasDueCue =
    /\b(today|tomorrow|overdue)\b/.test(lower) || /\b(?:in\s+)?(\d+)\s*days?\b/.test(lower);
  const hasHoursCue = /(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)\b/.test(lower);
  const hasImpCue = /\bimportance\s*(?:of\s*|is\s*)?(\d+)/.test(lower) || /\b(\d+)\s*\/\s*10\b/.test(lower);

  if (!hasDueCue && !hasHoursCue && !hasImpCue) return null;

  let days: number | null = null;
  if (/\btoday\b|\boverdue\b/.test(lower)) days = 0;
  else if (/\btomorrow\b/.test(lower)) days = 1;
  else {
    const dm = lower.match(/\b(?:in\s+)?(\d+)\s*days?\b/);
    if (dm) days = parseInt(dm[1], 10);
  }

  let hours: number | null = null;
  const hm = lower.match(/(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)\b/);
  if (hm) hours = parseFloat(hm[1]);

  let importance: number | null = null;
  const im1 = lower.match(/\bimportance\s*(?:of\s*|is\s*)?(\d+)/);
  const im2 = lower.match(/\b(\d+)\s*\/\s*10\b/);
  if (im1) importance = Math.min(10, Math.max(1, parseInt(im1[1], 10)));
  else if (im2) importance = Math.min(10, Math.max(1, parseInt(im2[1], 10)));

  const rawLabel = clause
    .replace(/\(.*?\)/g, "")
    .replace(/\b(i have|a |an |the |due|today|tomorrow|in \d+ days?|importance \d+|\d+\/10|\d+(?:\.\d+)?\s*(?:h|hrs?|hours?))\b/gi, " ")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const label = rawLabel ? rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) : "Task";
  return { label, days, hours, importance };
}

function tryHandleDescribedTasks(rawMessage: string): string | null {
  const clauses = rawMessage
    .split(/\band\b|[,;]/i)
    .map((c) => c.trim())
    .filter(Boolean);

  // Also try full string as 1 task if splitting broke up "(1 hour, importance 4)"
  const parenSafeClauses = rawMessage
    .split(/\band\b(?![^()]*\))/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const candidates = (parenSafeClauses.length >= 1 ? parenSafeClauses : clauses)
    .map(parseSingleScenarioClause)
    .filter((t): t is ParsedScenarioTask => t !== null);

  if (candidates.length === 0) return null;

  // Ask 1 question at a time for any missing detail
  const incomplete = candidates.find(
    (t) => t.days === null || t.hours === null || t.importance === null
  );
  if (incomplete) {
    if (incomplete.days === null) {
      return `For "${incomplete.label}", when is it due (for example, today, tomorrow, or in 5 days)?`;
    }
    if (incomplete.hours === null) {
      return `About how many hours do you think "${incomplete.label}" will take?`;
    }
    return `On a scale from 1 to 10, how important is "${incomplete.label}"?`;
  }

  const evaluated = candidates.map((t) => {
    const u = urgency(t.days!);
    const score = priorityScore(u, t.importance!, t.hours!);
    const hardMust = t.days! <= 1 && t.importance! >= 5;
    const isMust = hardMust || score >= 20;
    const label = isMust ? "Must Do" : "Schedule Later";
    const denom = Math.round((1 + t.hours! / 4) * 100) / 100;
    const roundedScore = Math.round(score);
    return {
      ...t,
      u,
      score,
      label,
      line: `${t.label}: urgency ${u} × ${t.importance} / ${denom} = score ${roundedScore}, so ${label}.`,
    };
  });

  evaluated.sort((a, b) => {
    if (a.label !== b.label) return a.label === "Must Do" ? -1 : 1;
    return b.score - a.score;
  });

  const lines = evaluated.map((e) => e.line).join(" ");
  const orderText =
    evaluated.length > 1
      ? ` Do ${evaluated[0].label.toLowerCase()} first, then ${evaluated
          .slice(1)
          .map((e) => e.label.toLowerCase())
          .join(", ")}.`
      : "";

  return `${lines}${orderText} The real planner gives the exact result for your whole week.`;
}

/** Answers questions about ChronoTriage AI pages, rules, described tasks, or the user's live board. */
export function buildSiteReply(rawMessage: string, context?: ChatContext): string {
  const q = rawMessage.trim().toLowerCase();

  // 1. Check if the user described hypothetical task(s) to triage
  const scenarioReply = tryHandleDescribedTasks(rawMessage);
  if (scenarioReply) return scenarioReply;

  // 2. Check if the user asked about a specific task or course on their live board
  const matchedTask = findMatchingTask(q, context);
  if (matchedTask) {
    const scorePart =
      matchedTask.score !== undefined ? ` (score ${matchedTask.score.toFixed(1)})` : "";
    const timing =
      matchedTask.days < 0
        ? `${Math.abs(matchedTask.days)} day(s) overdue`
        : matchedTask.days === 0
        ? "due today"
        : matchedTask.days === 1
        ? "due tomorrow"
        : `due in ${matchedTask.days} days`;
    return `"${matchedTask.title}" is ${CATEGORY_NAME[matchedTask.category]}${scorePart} — ${timing}, ~${matchedTask.hours} h, importance ${matchedTask.importance}/10. ${matchedTask.reason}`;
  }

  // 3. Score topic rules
  const scored = TOPIC_RULES.map((rule) => ({
    rule,
    hits: rule.keywords.reduce((acc, kw) => acc + (q.includes(kw) ? 1 : 0), 0),
  }))
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  if (scored.length > 0) {
    return scored[0].rule.answer(context);
  }

  // 4. Decline unrelated off-topic questions politely
  if (UNRELATED_TOPICS.some((t) => q.includes(t))) {
    return "I'm best at helping with deadlines and ChronoTriage. Want me to explain how it works?";
  }

  // 5. Friendly greeting or general guide
  if (/^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening))\b/.test(q)) {
    const summary = context
      ? ` You have ${context.counts.must} Must Do, ${context.counts.later} Schedule Later, and ${context.counts.skip} Safe to Skip tasks.`
      : "";
    return `Hi! I'm ChronoBot.${summary} Ask me about Must Do, Schedule Later, Safe to Skip, the priority score, or any feature like Calendar, Forecast, reminders, or Settings.`;
  }

  return "I'm best at helping with deadlines and ChronoTriage. Ask me about the three labels, scoring rules, Calendar, Forecast, reminders, Settings, or describe your tasks and I'll walk you through them!";
}
