// components/SkipPanel.tsx – Safe to Skip suggestions panel with undo

"use client";

import { Leaf } from "lucide-react";
import type { Task, TriageResult } from "@/lib/types";
import { useApp } from "@/lib/context";
import { useToast } from "@/components/Toast";

interface Props {
  suggestions: Array<{ task: Task; result: TriageResult }>;
}

export default function SkipPanel({ suggestions }: Props) {
  const { dispatch } = useApp();
  const { showToast } = useToast();

  if (suggestions.length === 0) return null;

  const handleSkip = (task: Task) => {
    dispatch({ type: "SET_STATUS", id: task.id, status: "skipped" });
    showToast(`Skipped "${task.title}".`, {
      label: "Undo",
      onClick: () => {
        dispatch({ type: "SET_STATUS", id: task.id, status: "todo" });
      },
    });
  };

  const handleKeep = (task: Task) => {
    dispatch({ type: "SET_OVERRIDE", id: task.id, category: "later" });
    showToast(`Keeping "${task.title}" on your list.`);
  };

  return (
    <section aria-labelledby="skip-heading" className="space-y-3">
      <h2 id="skip-heading" className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide flex items-center gap-2">
        <Leaf size={14} className="text-[var(--skip)]" aria-hidden="true" />
        You could safely drop these
      </h2>
      <p className="text-xs text-[var(--muted)]">Only you can decide. Skipping is always undoable.</p>
      <div className="space-y-2">
        {suggestions.map(({ task }) => (
          <div
            key={task.id}
            className="card border-l-4 border-l-[var(--skip)] p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text)] text-sm">{task.title}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Low impact ({task.importance}/10), nothing depends on it. Frees about {task.estimatedHours} h.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleSkip(task)}
                className="btn-secondary text-xs py-1.5 px-3 text-[var(--skip)] border-[var(--skip)]/30 hover:bg-[var(--skip-bg)]"
              >
                Skip it
              </button>
              <button
                onClick={() => handleKeep(task)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Keep it
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
