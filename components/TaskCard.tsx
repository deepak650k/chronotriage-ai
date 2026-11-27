// components/TaskCard.tsx – Task card with left border, badge, reason, actions

"use client";

import { useState } from "react";
import { CheckCircle, Pencil, RotateCcw, Sparkles } from "lucide-react";
import type { Category, Task, TriageResult } from "@/lib/types";
import { useApp } from "@/lib/context";
import { useToast } from "@/components/Toast";
import CategoryBadge from "./CategoryBadge";
import { cn, formatDueText, formatDate, coursePillClass } from "@/lib/utils";

const BORDER_COLORS: Record<Category, string> = {
  must: "border-l-[var(--must)]",
  later: "border-l-[var(--later)]",
  skip: "border-l-[var(--skip)]",
};

interface Props {
  task: Task;
  result: TriageResult;
  onEdit: () => void;
}

const CATEGORY_LABELS: Record<Category, string> = {
  must: "Must Do",
  later: "Schedule Later",
  skip: "Safe to Skip",
};

export default function TaskCard({ task, result, onEdit }: Props) {
  const { dispatch } = useApp();
  const { showToast } = useToast();
  const [showOverride, setShowOverride] = useState(false);
  const [rephrasedReason, setRephrasedReason] = useState<string | null>(null);
  const [rephrasing, setRephrasing] = useState(false);

  const handleRephrase = async () => {
    setRephrasing(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chronotriage-client": "1" },
        body: JSON.stringify({
          title: task.title,
          course: task.course,
          estimatedHours: task.estimatedHours,
          importance: task.importance,
          category: result.category,
          score: result.score,
          days: result.days,
          fallbackReason: result.reason,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { reason?: string };
        if (data.reason) setRephrasedReason(data.reason);
      }
    } catch {
      // Silent fallback to deterministic template reason
    } finally {
      setRephrasing(false);
    }
  };

  const handleDone = () => {
    dispatch({ type: "SET_STATUS", id: task.id, status: "done" });
    showToast(`"${task.title}" marked as done.`, {
      label: "Undo",
      onClick: () => dispatch({ type: "SET_STATUS", id: task.id, status: "todo" }),
    });
  };

  const handleOverride = (cat: Category) => {
    dispatch({ type: "SET_OVERRIDE", id: task.id, category: cat });
    setShowOverride(false);
    showToast(`Label changed to ${CATEGORY_LABELS[cat]}.`);
  };

  const handleClearOverride = () => {
    dispatch({ type: "SET_OVERRIDE", id: task.id, category: null });
    showToast("Override cleared. Using suggested label.");
  };

  const scoreTooltip = `Score ${result.score.toFixed(1)} - suggested: ${CATEGORY_LABELS[result.suggested]}`;

  return (
    <article
      className={cn(
        "card border-l-4 p-4 space-y-2 relative",
        BORDER_COLORS[result.category]
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <CategoryBadge category={result.category} size="sm" />
          {result.overridden && (
            <span className="text-[11px] uppercase tracking-wide text-[var(--muted)] border border-[var(--border)] rounded-full px-2 py-0.5">
              Overridden by you
            </span>
          )}
        </div>
        <span
          title={scoreTooltip}
          aria-label={scoreTooltip}
          tabIndex={0}
          className="text-xs text-[var(--muted)] shrink-0 cursor-help focus-ring rounded px-1"
        >
          Score {result.score.toFixed(1)}
        </span>
      </div>

      {/* Title + meta */}
      <h3 className="font-semibold text-[var(--text)] leading-snug">{task.title}</h3>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--muted)]">
        {task.course && (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
              coursePillClass(task.course)
            )}
          >
            {task.course}
          </span>
        )}
        <span>
          {formatDueText(result.days)} · {formatDate(task.dueDate)}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">
          ~{task.estimatedHours} h
        </span>
        <span>Importance {task.importance}/10</span>
      </div>

      {/* Reason */}
      <p className="text-sm text-[var(--text)]/90">{rephrasedReason ?? result.reason}</p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={handleDone}
          className="btn-secondary text-xs min-h-[40px] px-3 gap-1.5"
          aria-label={`Mark ${task.title} as done`}
        >
          <CheckCircle size={16} aria-hidden="true" />
          Done
        </button>
        <button
          onClick={() => setShowOverride((v) => !v)}
          className="btn-secondary text-xs min-h-[40px] px-3"
          aria-expanded={showOverride}
        >
          Change label
        </button>
        <button
          onClick={onEdit}
          className="btn-secondary text-xs min-h-[40px] px-3 gap-1.5"
          aria-label={`Edit ${task.title}`}
        >
          <Pencil size={16} aria-hidden="true" />
          Edit
        </button>
        <button
          onClick={handleRephrase}
          disabled={rephrasing}
          className="btn-secondary text-xs min-h-[40px] px-3 gap-1.5"
          aria-label={`Rephrase explanation for ${task.title}`}
        >
          <Sparkles size={15} aria-hidden="true" />
          {rephrasing ? "Polishing…" : "Rephrase"}
        </button>
        {result.overridden && (
          <button
            onClick={handleClearOverride}
            className="btn-secondary text-xs min-h-[40px] px-3 gap-1.5"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Clear override
          </button>
        )}
      </div>

      {/* Override picker */}
      {showOverride && (
        <div
          className="flex gap-2 flex-wrap pt-1"
          role="group"
          aria-label="Choose a label"
        >
          {(["must", "later", "skip"] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => handleOverride(cat)}
              className={cn(
                "text-xs min-h-[40px] px-3 rounded-lg border transition-colors focus-ring",
                cat === result.category
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)]"
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
          <button
            onClick={() => setShowOverride(false)}
            className="text-xs min-h-[40px] px-3 text-[var(--muted)] hover:text-[var(--text)] focus-ring rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}
    </article>
  );
}
