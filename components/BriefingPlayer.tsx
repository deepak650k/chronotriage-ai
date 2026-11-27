// components/BriefingPlayer.tsx – Spoken daily briefing player with per-state cache & transcript

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Volume2, Loader2 } from "lucide-react";
import type { Settings, Task, TriageResult } from "@/lib/types";
import { currentWeekHours } from "@/lib/triage";
import { buildBriefingScript, type BriefingPayload } from "@/lib/briefingScript";

interface Props {
  settings: Settings;
  tasks: Task[];
  results: Map<string, TriageResult>;
  today?: Date;
}

export default function BriefingPlayer({ settings, tasks, results, today }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const cacheRef = useRef<{ key: string; url: string } | null>(null);

  const payload: BriefingPayload = useMemo(() => {
    const mustDoTitles = tasks
      .filter((t) => results.get(t.id)?.category === "must")
      .slice(0, 5)
      .map((t) => t.title);
    const skipTask = tasks.find((t) => results.get(t.id)?.category === "skip");
    const weekHours = currentWeekHours(tasks, today);
    const loadRatio =
      settings.weeklyCapacityHours > 0
        ? Math.min(weekHours / settings.weeklyCapacityHours, 10)
        : 0;
    return {
      mustDoTitles,
      loadRatio,
      skipTitle: skipTask?.title,
    };
  }, [tasks, results, settings.weeklyCapacityHours, today]);

  const stateKey = useMemo(() => JSON.stringify(payload), [payload]);
  const transcript = useMemo(() => buildBriefingScript(payload), [payload]);

  useEffect(() => {
    return () => {
      if (cacheRef.current?.url) {
        URL.revokeObjectURL(cacheRef.current.url);
      }
    };
  }, []);

  const handlePlay = async () => {
    setShowTranscript(true);
    setErrorMsg(null);

    // Return cached audio for identical task state without spending ElevenLabs chars
    if (cacheRef.current && cacheRef.current.key === stateKey) {
      setAudioUrl(cacheRef.current.url);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chronotriage-client": "1" },
        body: stateKey,
      });

      if (!res.ok) {
        setErrorMsg("Voice briefing is unavailable right now");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (cacheRef.current?.url) {
        URL.revokeObjectURL(cacheRef.current.url);
      }
      cacheRef.current = { key: stateKey, url };
      setAudioUrl(url);
    } catch {
      setErrorMsg("Voice briefing is unavailable right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handlePlay}
        disabled={!settings.voiceEnabled || loading}
        className="btn-secondary gap-2 text-sm min-w-[190px]"
        aria-label="Play today's briefing"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Volume2 size={16} aria-hidden="true" />
        )}
        {loading ? "Preparing briefing…" : "Play today's briefing"}
      </button>

      {showTranscript && (
        <div className="card p-3 space-y-2 max-w-xl">
          {errorMsg && (
            <p className="text-xs font-medium text-[var(--later)]" role="status">
              {errorMsg}
            </p>
          )}
          {audioUrl && (
            <audio controls autoPlay src={audioUrl} className="w-full h-10">
              Your browser does not support the audio element.
            </audio>
          )}
          <p className="text-xs text-[var(--muted)]">
            <strong className="text-[var(--text)]">Transcript:</strong> {transcript}
          </p>
        </div>
      )}
    </div>
  );
}
