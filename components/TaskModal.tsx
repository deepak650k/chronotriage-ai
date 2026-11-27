// components/TaskModal.tsx – Add/edit/delete task modal with validation and focus trap

"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { X, AlertCircle, Trash2 } from "lucide-react";
import type { Category, Task } from "@/lib/types";
import { useApp } from "@/lib/context";
import { useToast } from "@/components/Toast";
import { triage } from "@/lib/triage";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  open: boolean;
  task?: Task;
  defaultDate?: string;
  onClose: () => void;
}

interface FormData {
  title: string;
  course: string;
  dueDate: string;
  estimatedHours: string;
  importance: number;
  dependsOn: string[];
  notes: string;
  userOverride: Category | "";
}

type FormErrors = Partial<Record<keyof FormData, string>>;

const CATEGORY_LABELS: Record<Category, string> = {
  must: "Must Do",
  later: "Schedule Later",
  skip: "Safe to Skip",
};

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.title.trim()) errors.title = "Title is required.";
  else if (data.title.trim().length > 80)
    errors.title = "Title must be 80 characters or fewer.";
  if (!data.dueDate) errors.dueDate = "Due date is required.";
  const h = parseFloat(data.estimatedHours);
  if (isNaN(h) || h < 0.5 || h > 40) {
    errors.estimatedHours = "Enter a number between 0.5 and 40.";
  }
  return errors;
}

export default function TaskModal({ open, task, defaultDate, onClose }: Props) {
  if (!open) return null;
  const modalKey = `${task?.id ?? "new"}-${defaultDate ?? ""}`;
  return (
    <TaskModalInner
      key={modalKey}
      task={task}
      defaultDate={defaultDate}
      onClose={onClose}
    />
  );
}

function TaskModalInner({
  task,
  defaultDate,
  onClose,
}: Omit<Props, "open">) {
  const { state, addTask, updateTask, deleteTask } = useApp();
  const { showToast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const [form, setForm] = useState<FormData>(() =>
    task
      ? {
          title: task.title,
          course: task.course,
          dueDate: task.dueDate,
          estimatedHours: String(task.estimatedHours),
          importance: task.importance,
          dependsOn: task.dependsOn,
          notes: task.notes,
          userOverride: task.userOverride ?? "",
        }
      : {
          title: "",
          course: "",
          dueDate: defaultDate ?? new Date().toISOString().split("T")[0],
          estimatedHours: "2",
          importance: 5,
          dependsOn: [],
          notes: "",
          userOverride: "",
        }
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const liveErrors = useMemo(() => validate(form), [form]);
  const isValid = Object.keys(liveErrors).length === 0;

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => firstFocusRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      openerRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (confirmDelete) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [confirmDelete, onClose]);

  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => new Set([...prev, field]));
      setErrors(validate(form));
    },
    [form]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = new Set(Object.keys(form));
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = {
      title: form.title.trim(),
      course: form.course.trim(),
      dueDate: form.dueDate,
      estimatedHours: Math.round(parseFloat(form.estimatedHours) * 2) / 2,
      importance: form.importance,
      status: task?.status ?? ("todo" as const),
      dependsOn: form.dependsOn,
      notes: form.notes.trim(),
      userOverride: form.userOverride === "" ? null : (form.userOverride as Category),
    };

    if (task) {
      const updated = { ...task, ...payload };
      updateTask(updated);
      const resMap = triage(
        state.tasks.map((t) => (t.id === updated.id ? updated : t)),
        state.settings
      );
      const label = resMap.get(updated.id)?.category;
      showToast(
        label
          ? `Saved. Here is what we suggest: ${CATEGORY_LABELS[label]}.`
          : `Saved "${updated.title}".`
      );
    } else {
      const created = addTask(payload);
      const resMap = triage([...state.tasks, created], state.settings);
      const label = resMap.get(created.id)?.category ?? "later";
      showToast(`Saved. Here is what we suggest: ${CATEGORY_LABELS[label]}.`);
    }
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="bg-[var(--surface)] w-full h-full sm:h-auto sm:max-w-[480px] sm:rounded-xl shadow-2xl p-6 space-y-4 overflow-y-auto sm:max-h-[90vh]"
        >
          <div className="flex items-center justify-between">
            <h2 id="modal-title" className="text-xl font-bold text-[var(--text)]">
              {task ? "Edit task" : "Add task"}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-[var(--muted)] hover:text-[var(--text)] focus-ring rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field
              id="title"
              label="Title *"
              error={touched.has("title") ? errors.title : undefined}
            >
              <input
                ref={firstFocusRef}
                id="title"
                type="text"
                maxLength={80}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onBlur={() => handleBlur("title")}
                className={cn(
                  "input",
                  touched.has("title") && errors.title && "border-[var(--must)]"
                )}
                aria-invalid={Boolean(touched.has("title") && errors.title)}
                aria-describedby={touched.has("title") && errors.title ? "title-error" : undefined}
                placeholder="e.g. Maths assignment 4"
              />
            </Field>

            <Field id="course" label="Course / label">
              <input
                id="course"
                type="text"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                className="input"
                placeholder="e.g. Maths, Club, Personal"
              />
            </Field>

            <Field
              id="dueDate"
              label="Due date *"
              error={touched.has("dueDate") ? errors.dueDate : undefined}
            >
              <input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                onBlur={() => handleBlur("dueDate")}
                className={cn(
                  "input",
                  touched.has("dueDate") && errors.dueDate && "border-[var(--must)]"
                )}
                aria-invalid={Boolean(touched.has("dueDate") && errors.dueDate)}
                aria-describedby={
                  touched.has("dueDate") && errors.dueDate ? "dueDate-error" : undefined
                }
              />
            </Field>

            <Field
              id="estimatedHours"
              label="Estimated hours *"
              helper="0.5 to 40, step 0.5"
              error={touched.has("estimatedHours") ? errors.estimatedHours : undefined}
            >
              <input
                id="estimatedHours"
                type="number"
                min={0.5}
                max={40}
                step={0.5}
                value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                onBlur={() => handleBlur("estimatedHours")}
                className={cn(
                  "input",
                  touched.has("estimatedHours") &&
                    errors.estimatedHours &&
                    "border-[var(--must)]"
                )}
                aria-invalid={Boolean(touched.has("estimatedHours") && errors.estimatedHours)}
                aria-describedby={
                  touched.has("estimatedHours") && errors.estimatedHours
                    ? "estimatedHours-error"
                    : "estimatedHours-helper"
                }
              />
            </Field>

            <div className="space-y-1">
              <label htmlFor="importance" className="label">
                Importance * — {form.importance}/10
              </label>
              <p className="text-xs text-[var(--muted)]" id="importance-helper">
                10 = big graded weight, or others depend on it
              </p>
              <input
                id="importance"
                type="range"
                min={1}
                max={10}
                step={1}
                value={form.importance}
                aria-describedby="importance-helper"
                onChange={(e) =>
                  setForm({ ...form, importance: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[var(--primary)] min-h-[44px] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>1 (low)</span>
                <span>10 (critical)</span>
              </div>
            </div>

            <Field id="notes" label="Notes">
              <textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input resize-none py-2"
              />
            </Field>

            {state.tasks.some(
              (t) =>
                t.id !== task?.id &&
                (t.status === "todo" || t.status === "in_progress")
            ) && (
              <fieldset className="space-y-1.5">
                <legend className="label">Depends on (prerequisites)</legend>
                <p className="text-xs text-[var(--muted)]">
                  Tasks others depend on are never marked Safe to Skip.
                </p>
                <div className="max-h-28 overflow-y-auto border border-[var(--border)] rounded-lg p-2 space-y-1 bg-[var(--bg)]">
                  {state.tasks
                    .filter(
                      (t) =>
                        t.id !== task?.id &&
                        (t.status === "todo" || t.status === "in_progress")
                    )
                    .map((other) => {
                      const checked = form.dependsOn.includes(other.id);
                      return (
                        <label
                          key={other.id}
                          className="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...form.dependsOn, other.id]
                                : form.dependsOn.filter((id) => id !== other.id);
                              setForm({ ...form, dependsOn: next });
                            }}
                            className="accent-[var(--primary)] w-4 h-4"
                          />
                          <span className="truncate">{other.title}</span>
                        </label>
                      );
                    })}
                </div>
              </fieldset>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              {task ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="btn-danger gap-1.5 text-sm"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={!isValid} className="btn-primary">
                  {task ? "Save changes" : "Save task"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {task && (
        <ConfirmDialog
          open={confirmDelete}
          title="Delete this task?"
          body="Delete this task? This cannot be undone."
          confirmLabel="Delete task"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteTask(task.id);
            setConfirmDelete(false);
            showToast(`Deleted "${task.title}".`);
            onClose();
          }}
        />
      )}
    </>
  );
}

function Field({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {helper && !error && (
        <p id={`${id}-helper`} className="text-xs text-[var(--muted)]">
          {helper}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-[var(--must)] flex items-center gap-1"
        >
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
