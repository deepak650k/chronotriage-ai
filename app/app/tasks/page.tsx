// app/app/tasks/page.tsx – All tasks table & mobile cards (/app/tasks)

"use client";

import { useState, useMemo } from "react";
import { Search, Pencil, CheckCircle, RotateCcw, Trash2 } from "lucide-react";
import type { Category, Task } from "@/lib/types";
import { useApp } from "@/lib/context";
import { useToast } from "@/components/Toast";
import { isOpen } from "@/lib/triage";
import { formatDate, cn, coursePillClass } from "@/lib/utils";
import CategoryBadge from "@/components/CategoryBadge";
import TaskModal from "@/components/TaskModal";
import ConfirmDialog from "@/components/ConfirmDialog";

const CATEGORY_LABELS: Record<Category, string> = {
  must: "Must Do",
  later: "Schedule Later",
  skip: "Safe to Skip",
};

export default function TasksPage() {
  const { state, triageResults, dispatch, deleteTask, isLoaded } = useApp();
  const { showToast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"open" | "done" | "skipped" | "all">("open");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"dueDate" | "importance" | "score">("dueDate");

  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [overrideTargetId, setOverrideTargetId] = useState<string | null>(null);

  const courses = useMemo(() => {
    const set = new Set<string>();
    state.tasks.forEach((t) => {
      if (t.course.trim()) set.add(t.course.trim());
    });
    return Array.from(set).sort();
  }, [state.tasks]);

  const openHours = useMemo(
    () => state.tasks.filter(isOpen).reduce((s, t) => s + t.estimatedHours, 0),
    [state.tasks]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.tasks
      .filter((t) => {
        if (statusFilter === "open" && !isOpen(t)) return false;
        if (statusFilter === "done" && t.status !== "done") return false;
        if (statusFilter === "skipped" && t.status !== "skipped") return false;
        if (courseFilter !== "all" && t.course.trim() !== courseFilter) return false;
        if (q && !t.title.toLowerCase().includes(q)) return false;
        if (categoryFilter !== "all") {
          const cat = triageResults.get(t.id)?.category;
          if (cat !== categoryFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "importance") return b.importance - a.importance;
        if (sortBy === "score") {
          const sa = triageResults.get(a.id)?.score ?? -1;
          const sb = triageResults.get(b.id)?.score ?? -1;
          return sb - sa;
        }
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [state.tasks, statusFilter, courseFilter, search, categoryFilter, sortBy, triageResults]);

  if (!isLoaded) {
    return (
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-4">
        <div className="h-8 w-44 rounded bg-[var(--border)] animate-pulse" />
        <div className="h-64 rounded-xl bg-[var(--border)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 sm:pb-10">
      <div>
        <h1 className="text-[28px] leading-[34px] font-bold text-[var(--text)]">
          All tasks
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {state.tasks.length} total task{state.tasks.length !== 1 ? "s" : ""} ·{" "}
          {Math.round(openHours * 10) / 10} open hours
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label htmlFor="task-search" className="label text-xs mb-1">
            Search title
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              id="task-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title…"
              className="input pl-9"
            />
          </div>
        </div>

        <div>
          <label htmlFor="status-filter" className="label text-xs mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "open" | "done" | "skipped" | "all")
            }
            className="input"
          >
            <option value="open">Open</option>
            <option value="done">Done</option>
            <option value="skipped">Skipped</option>
            <option value="all">All</option>
          </select>
        </div>

        <div>
          <label htmlFor="category-filter" className="label text-xs mb-1">
            Category
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}
            className="input"
          >
            <option value="all">All categories</option>
            <option value="must">Must Do</option>
            <option value="later">Schedule Later</option>
            <option value="skip">Safe to Skip</option>
          </select>
        </div>

        <div>
          <label htmlFor="course-filter" className="label text-xs mb-1">
            Course
          </label>
          <select
            id="course-filter"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="input"
          >
            <option value="all">All courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sort-by" className="label text-xs mb-1">
            Sort by
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "dueDate" | "importance" | "score")
            }
            className="input"
          >
            <option value="dueDate">Due date</option>
            <option value="importance">Importance</option>
            <option value="score">Score</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--muted)]">
          No tasks match the current filters.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block card overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                  <th className="p-3 font-semibold">Title</th>
                  <th className="p-3 font-semibold">Course</th>
                  <th className="p-3 font-semibold">Due</th>
                  <th className="p-3 font-semibold">Hours</th>
                  <th className="p-3 font-semibold">Imp.</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((t) => {
                  const res = triageResults.get(t.id);
                  return (
                    <tr key={t.id} className="hover:bg-[var(--bg)]/60">
                      <td className="p-3 font-medium text-[var(--text)]">
                        <div>{t.title}</div>
                        {res && (
                          <div className="text-xs text-[var(--muted)] font-normal mt-0.5">
                            {res.reason}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {t.course ? (
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap",
                              coursePillClass(t.course)
                            )}
                          >
                            {t.course}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="p-3 text-[var(--muted)] whitespace-nowrap">
                        {formatDate(t.dueDate)}
                      </td>
                      <td className="p-3 text-[var(--muted)]">{t.estimatedHours} h</td>
                      <td className="p-3 text-[var(--muted)]">{t.importance}/10</td>
                      <td className="p-3">
                        {res ? (
                          <div className="space-y-1">
                            <CategoryBadge category={res.category} size="sm" />
                            {res.overridden && (
                              <span className="block text-[10px] text-[var(--muted)]">
                                Overridden
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="p-3 capitalize text-[var(--muted)]">
                        {t.status.replace("_", " ")}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            onClick={() => setEditingTask(t)}
                            className="btn-secondary min-h-[36px] px-2.5 text-xs gap-1"
                            aria-label={`Edit ${t.title}`}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </button>
                          {isOpen(t) ? (
                            <>
                              <button
                                onClick={() => {
                                  dispatch({ type: "SET_STATUS", id: t.id, status: "done" });
                                  showToast(`"${t.title}" marked as done.`);
                                }}
                                className="btn-secondary min-h-[36px] px-2.5 text-xs gap-1"
                              >
                                <CheckCircle size={14} aria-hidden="true" />
                                Done
                              </button>
                              <button
                                onClick={() =>
                                  setOverrideTargetId(overrideTargetId === t.id ? null : t.id)
                                }
                                className="btn-secondary min-h-[36px] px-2.5 text-xs"
                              >
                                Label
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                dispatch({ type: "SET_STATUS", id: t.id, status: "todo" });
                                showToast(`Restored "${t.title}".`);
                              }}
                              className="btn-secondary min-h-[36px] px-2.5 text-xs gap-1"
                            >
                              <RotateCcw size={14} aria-hidden="true" />
                              Restore
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="btn-danger min-h-[36px] px-2.5 text-xs"
                            aria-label={`Delete ${t.title}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                        {overrideTargetId === t.id && (
                          <div className="flex justify-end gap-1 mt-2">
                            {(["must", "later", "skip"] as Category[]).map((cat) => (
                              <button
                                key={cat}
                                onClick={() => {
                                  dispatch({ type: "SET_OVERRIDE", id: t.id, category: cat });
                                  setOverrideTargetId(null);
                                  showToast(`Label changed to ${CATEGORY_LABELS[cat]}.`);
                                }}
                                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface)]"
                              >
                                {CATEGORY_LABELS[cat]}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & tablet cards */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((t) => {
              const res = triageResults.get(t.id);
              return (
                <article key={t.id} className="card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-[var(--text)]">{t.title}</h2>
                    {res && <CategoryBadge category={res.category} size="sm" />}
                  </div>
                  <div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-3 gap-y-1">
                    {t.course && (
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
                          coursePillClass(t.course)
                        )}
                      >
                        {t.course}
                      </span>
                    )}
                    <span>{formatDate(t.dueDate)}</span>
                    <span>{t.estimatedHours} h</span>
                    <span>{t.importance}/10</span>
                    <span className="capitalize">{t.status.replace("_", " ")}</span>
                  </div>
                  {res && <p className="text-xs text-[var(--muted)]">{res.reason}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setEditingTask(t)}
                      className="btn-secondary text-xs min-h-[40px] px-3"
                    >
                      Edit
                    </button>
                    {isOpen(t) ? (
                      <button
                        onClick={() => {
                          dispatch({ type: "SET_STATUS", id: t.id, status: "done" });
                          showToast(`"${t.title}" marked as done.`);
                        }}
                        className="btn-secondary text-xs min-h-[40px] px-3"
                      >
                        Mark done
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          dispatch({ type: "SET_STATUS", id: t.id, status: "todo" });
                          showToast(`Restored "${t.title}".`);
                        }}
                        className="btn-secondary text-xs min-h-[40px] px-3"
                      >
                        Restore
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="btn-danger text-xs min-h-[40px] px-3"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <TaskModal
        open={Boolean(editingTask)}
        task={editingTask}
        onClose={() => {
          setEditingTask(undefined);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this task?"
        body="Delete this task? This cannot be undone."
        confirmLabel="Delete task"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTask(deleteTarget.id);
            showToast(`Deleted "${deleteTarget.title}".`);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
