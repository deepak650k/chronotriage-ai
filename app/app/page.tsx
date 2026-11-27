// app/app/page.tsx – Main Dashboard (/app)

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Sparkles } from "lucide-react";
import type { Category, Task } from "@/lib/types";
import { useApp } from "@/lib/context";
import { useToast } from "@/components/Toast";
import { isOpen, currentWeekHours } from "@/lib/triage";
import { greeting } from "@/lib/utils";
import SummaryCards from "@/components/SummaryCards";
import LoadMeter from "@/components/LoadMeter";
import TaskCard from "@/components/TaskCard";
import SkipPanel from "@/components/SkipPanel";
import EmptyState from "@/components/EmptyState";
import ReminderButton from "@/components/ReminderButton";
import BriefingPlayer from "@/components/BriefingPlayer";
import TaskModal from "@/components/TaskModal";

const CATEGORY_ORDER: Record<Category, number> = { must: 0, later: 1, skip: 2 };

export default function DashboardPage() {
  const { state, triageResults, loadDemo, isLoaded, today, user } = useApp();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const openTasks = useMemo(() => state.tasks.filter(isOpen), [state.tasks]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { must: 0, later: 0, skip: 0 };
    for (const t of openTasks) {
      const cat = triageResults.get(t.id)?.category ?? "later";
      c[cat]++;
    }
    return c;
  }, [openTasks, triageResults]);

  const sortedTasks = useMemo(() => {
    return [...openTasks].sort((a, b) => {
      const ra = triageResults.get(a.id);
      const rb = triageResults.get(b.id);
      const ca = CATEGORY_ORDER[ra?.category ?? "later"];
      const cb = CATEGORY_ORDER[rb?.category ?? "later"];
      if (ca !== cb) return ca - cb;
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return (rb?.score ?? 0) - (ra?.score ?? 0);
    });
  }, [openTasks, triageResults]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return sortedTasks;
    return sortedTasks.filter((t) => triageResults.get(t.id)?.category === filter);
  }, [sortedTasks, filter, triageResults]);

  const skipSuggestions = useMemo(() => {
    return sortedTasks
      .filter((t) => triageResults.get(t.id)?.category === "skip")
      .map((t) => ({ task: t, result: triageResults.get(t.id)! }));
  }, [sortedTasks, triageResults]);

  const weekHours = useMemo(
    () => (today ? currentWeekHours(state.tasks, today) : 0),
    [state.tasks, today]
  );

  const handleLoadDemo = () => {
    const added = loadDemo();
    showToast(
      added > 0 ? `Loaded ${added} sample tasks.` : "Demo tasks are already loaded."
    );
  };

  if (!isLoaded || !today) {
    return (
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 w-56 rounded bg-[var(--border)] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--border)] animate-pulse" />
          ))}
        </div>
        <div className="h-20 rounded-xl bg-[var(--border)] animate-pulse" />
      </div>
    );
  }

  const displayed = filteredTasks.slice(0, 20);
  const hasMore = filteredTasks.length > 20;
  const doneCount = state.tasks.filter((t) => t.status === "done").length;
  const topFocusTask = sortedTasks.find(
    (t) => triageResults.get(t.id)?.category === "must"
  );

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 sm:pb-10">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-[var(--text)]">
            {user ? `${greeting(today)}, ${user.name.split(" ")[0]}.` : `${greeting(today)}.`}
          </h1>
          <p className="text-sm text-[var(--muted)] flex flex-wrap items-center gap-2">
            <span>{format(today, "EEE d MMM yyyy")}</span>
            {doneCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--skip-bg)] text-[var(--skip)]">
                {doneCount} finished — nice momentum!
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ReminderButton
            settings={state.settings}
            tasks={state.tasks}
            results={triageResults}
          />
          {state.settings.voiceEnabled && (
            <BriefingPlayer
              settings={state.settings}
              tasks={state.tasks}
              results={triageResults}
              today={today}
            />
          )}
        </div>
      </div>

      {openTasks.length === 0 ? (
        <EmptyState
          title="Nothing on your plate yet."
          body="Add your first task, or load demo data to see how ChronoTriage works."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setAddModalOpen(true)}
                className="btn-primary gap-1.5"
              >
                <Plus size={18} aria-hidden="true" />
                Add your first task
              </button>
              <button onClick={handleLoadDemo} className="btn-secondary gap-1.5">
                <Sparkles size={16} aria-hidden="true" />
                Load demo data
              </button>
            </div>
          }
        />
      ) : (
        <>
          {/* Summary Cards + Load Meter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2">
              <SummaryCards
                counts={counts}
                activeFilter={filter}
                onFilter={setFilter}
              />
            </div>
            <LoadMeter
              hours={weekHours}
              capacity={state.settings.weeklyCapacityHours}
            />
          </div>

          {/* Focus Spotlight for students */}
          {topFocusTask ? (
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--primary)]/6 border-[var(--primary)]/20">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                  Start here next
                </p>
                <p className="text-sm font-medium text-[var(--text)]">
                  Focus on <span className="font-semibold">{topFocusTask.title}</span> (~{topFocusTask.estimatedHours} h) before anything else.
                </p>
              </div>
              <button
                onClick={() => setEditingTask(topFocusTask)}
                className="btn-secondary text-xs min-h-[38px] px-3 shrink-0 self-start sm:self-center"
              >
                Open task
              </button>
            </div>
          ) : (
            <div className="card p-4 bg-[var(--skip-bg)]/50 border-[var(--skip)]/25">
              <p className="text-sm font-medium text-[var(--skip)]">
                No urgent fires right now — work ahead at your own pace or take a breather.
              </p>
            </div>
          )}

          {/* Filter tabs */}
          <div
            className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3"
            role="tablist"
            aria-label="Filter tasks by category"
          >
            {(
              [
                { key: "all", label: `All (${openTasks.length})` },
                { key: "must", label: `Must Do (${counts.must})` },
                { key: "later", label: `Schedule Later (${counts.later})` },
                { key: "skip", label: `Safe to Skip (${counts.skip})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={filter === tab.key}
                onClick={() => setFilter(tab.key)}
                className={`min-h-[40px] px-4 rounded-lg text-sm font-medium transition-colors focus-ring ${
                  filter === tab.key
                    ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                    : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Task list */}
          <section aria-label="Prioritised task list" className="space-y-3">
            {displayed.length === 0 ? (
              <p className="card p-6 text-center text-sm text-[var(--muted)]">
                No tasks in this category right now.
              </p>
            ) : (
              displayed.map((task) => {
                const res = triageResults.get(task.id);
                if (!res) return null;
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    result={res}
                    onEdit={() => setEditingTask(task)}
                  />
                );
              })
            )}

            {hasMore && (
              <div className="pt-2 text-center">
                <Link href="/app/tasks" className="btn-secondary text-sm">
                  Show all in Tasks ({filteredTasks.length})
                </Link>
              </div>
            )}
          </section>

          {/* Skip suggestions */}
          <SkipPanel suggestions={skipSuggestions} />
        </>
      )}

      <TaskModal
        open={addModalOpen || Boolean(editingTask)}
        task={editingTask}
        onClose={() => {
          setAddModalOpen(false);
          setEditingTask(undefined);
        }}
      />
    </div>
  );
}
