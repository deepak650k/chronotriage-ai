// app/api/reminders/verify/route.ts – Send & confirm 6-digit email verification OTP via Zapier

import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited, isCsrfBlocked } from "@/lib/rateLimit";
import {
  confirmOtpChallenge,
  createOtpChallenge,
  isEmailAllowlisted,
} from "@/lib/emailVerify";

const SendBody = z.object({
  action: z.literal("send"),
  email: z.string().email().max(254),
});

const ConfirmBody = z.object({
  action: z.literal("confirm"),
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  challengeToken: z.string().min(10).max(512),
});

const Body = z.discriminatedUnion("action", [SendBody, ConfirmBody]);

export async function POST(req: Request) {
  if (isCsrfBlocked(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const data = parsed.data;
  const email = data.email.trim().toLowerCase();

  if (!isEmailAllowlisted(email)) {
    return NextResponse.json(
      { error: "Reminders are restricted to approved email addresses." },
      { status: 403 }
    );
  }

  if (data.action === "send") {
    // Strict limit: max 3 OTP emails per 10 minutes per IP
    if (isRateLimited(`otp-send:${ip}`, Date.now(), 3, 10 * 60_000)) {
      return NextResponse.json(
        { error: "Too many verification requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const url = process.env.ZAPIER_WEBHOOK_URL;
    if (!url) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 503 }
      );
    }

    const challenge = createOtpChallenge(email);
    if (!challenge) {
      return NextResponse.json(
        { error: "Verification is not configured on the server." },
        { status: 503 }
      );
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          date: today,
          mustDo: [
            {
              title: `Verification Code: ${challenge.code}`,
              dueDate: "Valid 10 min",
              reason: `Enter code ${challenge.code} in ChronoTriage Settings to verify your email address. Never share this code.`,
            },
          ],
          skipSuggestions: [],
          loadRatio: 0,
        }),
      });
      if (!r.ok) {
        return NextResponse.json(
          { error: "Could not send verification email." },
          { status: 502 }
        );
      }
      return NextResponse.json({
        ok: true,
        challengeToken: challenge.challengeToken,
        expiresInSeconds: challenge.expiresInSeconds,
      });
    } catch {
      return NextResponse.json(
        { error: "Could not send verification email." },
        { status: 502 }
      );
    }
  }

  // Confirm OTP attempt – strict limit: max 5 guesses per 10 minutes per IP
  if (isRateLimited(`otp-confirm:${ip}`, Date.now(), 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new code in 10 minutes." },
      { status: 429 }
    );
  }

  const result = confirmOtpChallenge({
    email,
    code: data.code,
    challengeToken: data.challengeToken,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    verifiedEmail: result.email,
    verifiedToken: result.verifiedToken,
    expiresAt: result.expiresAt,
  });
}
