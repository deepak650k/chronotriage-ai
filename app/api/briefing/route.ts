// app/api/briefing/route.ts – Server-side ElevenLabs TTS briefing (stretch)

import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited, isCsrfBlocked } from "@/lib/rateLimit";
import { buildBriefingScript } from "@/lib/briefingScript";

const Body = z.object({
  mustDoTitles: z.array(z.string().max(80)).max(5),
  loadRatio: z.number().min(0).max(10),
  skipTitle: z.string().max(80).optional(),
  firstName: z.string().max(40).optional(),
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
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) {
    return NextResponse.json(
      { error: "Voice is not configured" },
      { status: 503 }
    );
  }

  const text = buildBriefingScript(parsed.data).slice(0, 600);

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!r.ok || !r.body) {
      return NextResponse.json(
        { error: "Voice service failed" },
        { status: 502 }
      );
    }

    return new Response(r.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Voice service failed" },
      { status: 502 }
    );
  }
}
