// app/api/reminders/route.ts – Forwards today's plan to Zapier Catch Hook (verified email only)

import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited, isCsrfBlocked } from "@/lib/rateLimit";
import { verifyEmailToken } from "@/lib/emailVerify";

const Item = z.object({
  title: z.string().max(80),
  dueDate: z.string(),
  reason: z.string().max(300),
});

const Body = z.object({
  email: z.string().email().max(254),
  verifiedToken: z.string().min(10).max(512),
  date: z.string(),
  mustDo: z.array(Item).max(20),
  skipSuggestions: z.array(Item).max(20),
  loadRatio: z.number().min(0).max(10),
});

export async function POST(req: Request) {
  if (isCsrfBlocked(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isRateLimited(getClientIp(req))) {
    return NextResponse.json(
      { error: "Slow down a little and try again." },
      { status: 429 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please verify your email address in Settings first." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const check = verifyEmailToken(email, parsed.data.verifiedToken);
  if (!check.valid) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  const url = process.env.ZAPIER_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json(
      { error: "Reminders are not configured" },
      { status: 503 }
    );
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsed.data, email }),
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: "Reminder service failed" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Reminder service failed" },
      { status: 502 }
    );
  }
}
