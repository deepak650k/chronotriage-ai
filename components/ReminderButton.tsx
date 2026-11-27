// components/ReminderButton.tsx – Send email reminder via /api/reminders

"use client";

import { useState } from "react";
import { Mail, ShieldAlert } from "lucide-react";
import type { Task, TriageResult, Settings } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { currentWeekHours } from "@/lib/triage";
import { isReminderEmailVerified } from "@/lib/storage";
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
  const verified = isReminderEmailVerified(settings);

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

  // Button state derivation
  const isDisabled = noEmail || !verified || sending;

  let title: string;
  let label: string;
  if (noEmail) {
    title = "Add your email in Settings first";
    label = "Email me today's plan";
  } else if (!verified) {
    title = "Verify your email in Settings before sending";
    label = "Verify email first";
  } else if (sending) {
    title = "Sending…";
    label = "Sending…";
  } else {
    title = "Email me today's plan";
    label = "Email me today's plan";
  }

  const send = async () => {
    if (isDisabled) return;
    setSending(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chronotriage-client": "1" },
        body: JSON.stringify({
          email: settings.reminderEmail.trim(),
          verifiedToken: settings.verifiedEmailToken ?? "",
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
      if (res.status === 403) {
        showToast("Email not verified. Please verify your email in Settings.");
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
      disabled={isDisabled}
      title={title}
      className={`btn-secondary gap-2 text-sm ${
        !noEmail && !verified ? "opacity-70" : ""
      }`}
      aria-label={label}
    >
      {!noEmail && !verified ? (
        <ShieldAlert size={16} aria-hidden="true" className="text-amber-500" />
      ) : (
        <Mail size={16} aria-hidden="true" />
      )}
      {label}
    </button>
  );
}
