// app/api/explain/route.ts – Optional Gemini rewrite of deterministic reason sentence (stretch)
// Never changes the deterministic category. Falls back silently to the template reason.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited, isCsrfBlocked } from "@/lib/rateLimit";

const Body = z.object({
  title: z.string().max(80),
  course: z.string().max(40).optional().default(""),
  estimatedHours: z.number().min(0.5).max(40),
  importance: z.number().int().min(1).max(10),
  category: z.enum(["must", "later", "skip"]),
  score: z.number().min(0).max(200),
  days: z.number().int().min(-365).max(3650),
  fallbackReason: z.string().max(400),
});

const SYSTEM_PROMPT = `You rewrite one short explanation for a student's task triage label.
Rules: one sentence, maximum 30 words, calm and supportive tone, mention the due timing and the reason for the label. Do not change or question the label. Do not invent facts, grades, or deadlines. Never tell the user a task is risk-free to skip.`;

const CATEGORY_NAMES = {
  must: "Must Do",
  later: "Schedule Later",
  skip: "Safe to Skip",
} as const;

export async function POST(req: Request) {
  if (isCsrfBlocked(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { fallbackReason, category, title, estimatedHours, importance, score, days } =
    parsed.data;

  // Never fail visibly: if rate-limited or no key, silently return template reason
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey || isRateLimited(getClientIp(req))) {
    return NextResponse.json({ reason: fallbackReason });
  }

  const userPrompt = `Task: "${title}"
Label (fixed, do not change): ${CATEGORY_NAMES[category]}
Days until due: ${days} (negative means overdue)
Estimated hours: ${estimatedHours}
Importance: ${importance}/10
Score: ${score}
Baseline template: ${fallbackReason}
Rewrite this into one calm, natural sentence under 30 words.`;

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
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 80,
          },
        }),
        signal: AbortSignal.timeout(4000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ reason: fallbackReason });
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rewritten = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rewritten || rewritten.length > 300) {
      return NextResponse.json({ reason: fallbackReason });
    }

    return NextResponse.json({ reason: rewritten });
  } catch {
    return NextResponse.json({ reason: fallbackReason });
  }
}
