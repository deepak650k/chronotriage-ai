// components/ReminderButton.tsx – Send email reminder via /api/reminders

"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import type { Task, TriageResult, Settings } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { currentWeekHours } from "@/lib/triage";
import { format } from "date-fns";

interface Props {
  settings: Settings;
  tasks: Task[];
  results: Map<string, TriageResult>;
}

export default function ReminderButton({ settings, tasks, results }: Props) {
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);

  const noEmail = !settings.reminderEmail.trim();

  const mustDo = tasks
    .filter((t) => results.get(t.id)?.category === "must")
    .slice(0, 20)
    .map((t) => ({
      title: t.title,
      dueDate: t.dueDate,
      reason: results.get(t.id)?.reason ?? "",
    }));

  const skipSuggestions = tasks
    .filter((t) => results.get(t.id)?.category === "skip")
    .slice(0, 20)
    .map((t) => ({
      title: t.title,
      dueDate: t.dueDate,
      reason: results.get(t.id)?.reason ?? "",
    }));

  const weekHours = currentWeekHours(tasks);
  const loadRatio =
    settings.weeklyCapacityHours > 0
      ? Math.min(weekHours / settings.weeklyCapacityHours, 10)
      : 0;

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: settings.reminderEmail.trim(),
          date: format(new Date(), "yyyy-MM-dd"),
          mustDo,
          skipSuggestions,
          loadRatio,
        }),
      });
      if (res.status === 429) {
        showToast("Slow down a little and try again.");
        return;
      }
      if (!res.ok) {
        showToast("Could not send the reminder. Try again in a minute.");
        return;
      }
      showToast("Reminder sent! Check your inbox.");
    } catch {
      showToast("Could not send the reminder. Try again in a minute.");
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={send}
      disabled={noEmail || sending}
      title={noEmail ? "Add your email in Settings" : "Email me today's plan"}
      className="btn-secondary gap-2 text-sm"
      aria-label="Email me today's plan"
    >
      <Mail size={16} aria-hidden="true" />
      {sending ? "Sending…" : "Email me today's plan"}
    </button>
  );
}
