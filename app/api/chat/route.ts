// app/api/chat/route.ts – ChronoBot conversational assistant endpoint.
// Uses Gemini 2.5 Flash when LLM_API_KEY is configured, and falls back to
// a deterministic task-aware assistant grounded in ChronoTriage rules.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

const TaskSummary = z.object({
  title: z.string().max(80),
  course: z.string().max(40).optional().default(""),
  hours: z.number().min(0).max(100),
  days: z.number().int(),
  importance: z.number().int().min(1).max(10),
  category: z.enum(["must", "later", "skip"]),
  reason: z.string().max(300),
});

const HistoryTurn = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(1000),
});

const Body = z.object({
  message: z.string().min(1).max(600),
  history: z.array(HistoryTurn).max(10).optional().default([]),
  context: z
    .object({
      weekHours: z.number().min(0).max(200),
      capacity: z.number().min(1).max(168),
      counts: z.object({
        must: z.number().int().min(0),
        later: z.number().int().min(0),
        skip: z.number().int().min(0),
      }),
      tasks: z.array(TaskSummary).max(15).optional().default([]),
    })
    .optional(),
});

const SYSTEM_PROMPT = `You are ChronoBot, the friendly study assistant inside ChronoTriage AI.
ChronoTriage helps students decide what to do now (Must Do), what can wait (Schedule Later), and what is safe to skip (Safe to Skip).
Rules:
- Warm, calm, supportive student tone. Under 90 words unless asked for more. Plain English, no jargon.
- Base task answers ONLY on the provided task summary. Never invent tasks, deadlines, or grades.
- Never change a task's triage category or claim skipping is risk-free; remind students that ChronoTriage gives advice and they decide.
- Scoring rule: score = (Urgency * Importance) / (1 + estimatedHours / 4). Urgency: <=1d (or overdue)=10, 2-3d=8, 4-7d=6, 8-14d=4, 15+d=2. Must Do: score >= 20 OR (<=1d & importance >= 5). Safe to Skip requires ALL 4: score < 8, importance <= 3, no dependents, and week over capacity.
- If the user sounds very stressed or overwhelmed, respond kindly, suggest focusing on one task at a time, and mention talking to a friend, family member, or college counsellor.`;

function buildLocalReply(
  rawMessage: string,
  context?: z.infer<typeof Body>["context"]
): string {
  const q = rawMessage.toLowerCase();
  const tasks = context?.tasks ?? [];
  const mustTasks = tasks.filter((t) => t.category === "must");
  const skipTasks = tasks.filter((t) => t.category === "skip");

  if (
    q.includes("stress") ||
    q.includes("overwhelm") ||
    q.includes("anxious") ||
    q.includes("burnout") ||
    q.includes("panic")
  ) {
    const first = mustTasks[0];
    const step = first
      ? `Right now, just focus on one thing: "${first.title}" (~${first.hours} h). Everything else can wait until that's moving.`
      : "Right now you have no Must Do fires — take a short break and pick just one small task next.";
    return `Take a slow breath — overlapping deadlines feel heavy, and it helps to break them down one step at a time. ${step} If things keep feeling overwhelming, consider talking to a friend, family member, or college counsellor.`;
  }

  if (
    q.includes("first") ||
    q.includes("now") ||
    q.includes("next") ||
    q.includes("priority") ||
    q.includes("today") ||
    q.includes("start")
  ) {
    if (!context || tasks.length === 0) {
      return "You don't have any open tasks yet! Click '+ Add task' (or load demo data on the Dashboard) and I'll walk you through what to tackle first.";
    }
    if (mustTasks.length > 0) {
      const top = mustTasks
        .slice(0, 2)
        .map((t) => `"${t.title}" (~${t.hours} h)`)
        .join(" and ");
      return `Start with ${top}. ${mustTasks[0].reason} Focus on your top Must Do first — ChronoTriage gives advice, and you're always in control.`;
    }
    const nextLater = tasks[0];
    return `You have 0 Must Do tasks right now! Your next upcoming task is "${nextLater.title}" (~${nextLater.hours} h). Work ahead calmly at your own pace.`;
  }

  if (
    q.includes("week") ||
    q.includes("load") ||
    q.includes("busy") ||
    q.includes("capacity") ||
    q.includes("hour") ||
    q.includes("crunch")
  ) {
    if (!context) {
      return "Your default weekly study capacity is 20 hours (changeable in Settings). The load bar turns green under 70%, amber between 70–100%, and red above 100%.";
    }
    const pct = Math.round((context.weekHours / context.capacity) * 100);
    const status =
      pct > 100
        ? "over capacity (crunch week)"
        : pct >= 70
        ? "getting busy"
        : "room to breathe";
    return `This week has ${Math.round(context.weekHours * 10) / 10} of ${context.capacity} h planned (${pct}% — ${status}). You have ${context.counts.must} Must Do, ${context.counts.later} Schedule Later, and ${context.counts.skip} Safe to Skip open tasks.`;
  }

  if (q.includes("skip") || q.includes("drop")) {
    const base =
      "Safe to Skip only triggers when ALL four hold: score below 8, importance 3 or lower, nothing depends on it, and that week exceeds your weekly capacity. Nothing is ever dropped unless you click Skip, and you can always undo it.";
    if (skipTasks.length > 0) {
      return `${base} Right now, "${skipTasks[0].title}" (~${skipTasks[0].hours} h) is flagged as optional if you need breathing room.`;
    }
    return base;
  }

  if (
    q.includes("score") ||
    q.includes("formula") ||
    q.includes("triage") ||
    q.includes("rule") ||
    q.includes("calculat") ||
    q.includes("how does")
  ) {
    return "ChronoTriage uses a deterministic formula: score = (Urgency × Importance) / (1 + hours / 4). Urgency is 10 if due in ≤1 day, 8 for 2–3 days, 6 for 4–7, 4 for 8–14, and 2 for 15+. Score ≥ 20 (or ≤1 day with importance ≥ 5) is Must Do. Check the About page for the full breakdown!";
  }

  if (
    q.includes("change") ||
    q.includes("override") ||
    q.includes("label") ||
    q.includes("wrong")
  ) {
    return "You stay in control at all times! Click 'Change label' on any task card to override its label to Must Do, Schedule Later, or Safe to Skip — your choice always wins.";
  }

  if (
    q.includes("privat") ||
    q.includes("data") ||
    q.includes("email") ||
    q.includes("remind") ||
    q.includes("save")
  ) {
    return "Your tasks stay privately in your own browser's storage (no tracking). You can also add your email in Settings and click 'Email me today's plan' on the Dashboard to receive your daily summary.";
  }

  if (context && tasks.length > 0) {
    return `You currently have ${context.counts.must} Must Do, ${context.counts.later} Schedule Later, and ${context.counts.skip} Safe to Skip tasks (${Math.round(context.weekHours * 10) / 10}/${context.capacity} h this week). Ask me "What should I do first?", "How is my week looking?", or "How does scoring work?".`;
  }

  return "I'm ChronoBot! Ask me how triage scoring works, what Safe to Skip means, or add a few deadlines and ask what you should work on first.";
}

export async function POST(req: Request) {
  if (isRateLimited(getClientIp(req))) {
    return NextResponse.json(
      { error: "Slow down a little and try again." },
      { status: 429 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message, history, context } = parsed.data;
  const fallback = buildLocalReply(message, context);
  const apiKey = process.env.LLM_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ reply: fallback, mode: "local" });
  }

  const summaryText = context
    ? `Student's current board:
- Week load: ${Math.round(context.weekHours * 10) / 10}/${context.capacity} h
- Counts: ${context.counts.must} Must Do, ${context.counts.later} Schedule Later, ${context.counts.skip} Safe to Skip
- Top tasks:\n${context.tasks
        .map(
          (t) =>
            `  * "${t.title}" (${t.course || "no course"}, ${t.category.toUpperCase()}, due in ${t.days}d, ${t.hours}h, imp ${t.importance}/10) — ${t.reason}`
        )
        .join("\n")}`
    : "No task context provided yet.";

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    })),
    {
      role: "user",
      parts: [{ text: `${summaryText}\n\nStudent question: ${message}` }],
    },
  ];

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 180,
          },
        }),
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ reply: fallback, mode: "local" });
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) {
      return NextResponse.json({ reply: fallback, mode: "local" });
    }

    return NextResponse.json({ reply, mode: "gemini" });
  } catch {
    return NextResponse.json({ reply: fallback, mode: "local" });
  }
}
