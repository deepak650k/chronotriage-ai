// components/DayPanel.tsx – Side panel (bottom sheet on mobile) for a selected calendar day

"use client";

import { useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import type { Task, TriageResult } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import TaskCard from "./TaskCard";

interface Props {
  date: string | null;
  tasks: Task[];
  results: Map<string, TriageResult>;
  onClose: () => void;
  onAddTask: (date: string) => void;
  onEditTask: (task: Task) => void;
}

export default function DayPanel({
  date,
  tasks,
  results,
  onClose,
  onAddTask,
  onEditTask,
}: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!date) return;
    setTimeout(() => closeBtnRef.current?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [date, onClose]);

  if (!date) return null;

  const dayTasks = tasks.filter(
    (t) =>
      t.dueDate === date && (t.status === "todo" || t.status === "in_progress")
  );
  const totalHours = dayTasks.reduce((s, t) => s + t.estimatedHours, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-panel-title"
        className="bg-[var(--surface)] w-full md:w-[420px] max-h-[85vh] md:max-h-full rounded-t-2xl md:rounded-none md:border-l border-[var(--border)] shadow-2xl flex flex-col"
      >
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 id="day-panel-title" className="text-lg font-bold text-[var(--text)]">
              {formatDate(date)}
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {dayTasks.length} open task{dayTasks.length !== 1 ? "s" : ""} ·{" "}
              {totalHours} h planned
            </p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close day panel"
            className="btn-secondary min-w-[44px] px-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {dayTasks.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-6 text-center">
              No open tasks due on this day.
            </p>
          ) : (
            dayTasks.map((t) => {
              const res = results.get(t.id);
              if (!res) return null;
              return (
                <TaskCard
                  key={t.id}
                  task={t}
                  result={res}
                  onEdit={() => onEditTask(t)}
                />
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={() => onAddTask(date)}
            className="btn-primary w-full gap-1.5"
          >
            <Plus size={18} aria-hidden="true" />
            Add task for {formatDate(date)}
          </button>
        </div>
      </aside>
    </div>
  );
}
