// app/app/calendar/page.tsx – Calendar view (/app/calendar)

"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { useApp } from "@/lib/context";
import CalendarGrid from "@/components/CalendarGrid";
import DayPanel from "@/components/DayPanel";
import TaskModal from "@/components/TaskModal";

export default function CalendarPage() {
  const { state, triageResults, isLoaded } = useApp();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>();
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const handleDayClick = (isoDate: string) => {
    const hasOpenOnDay = state.tasks.some(
      (t) =>
        t.dueDate === isoDate &&
        (t.status === "todo" || t.status === "in_progress")
    );
    if (hasOpenOnDay) {
      setSelectedDay(isoDate);
    } else {
      setEditingTask(undefined);
      setModalDate(isoDate);
      setModalOpen(true);
    }
  };

  const handleChipClick = (task: Task) => {
    setSelectedDay(task.dueDate);
  };

  if (!isLoaded) {
    return (
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-4">
        <div className="h-8 w-44 rounded bg-[var(--border)] animate-pulse" />
        <div className="h-96 rounded-xl bg-[var(--border)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-4 pb-24 sm:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-[var(--text)]">
            Calendar
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Click a task chip to inspect or update it. Click an empty day to add a deadline.
          </p>
        </div>
      </div>

      <CalendarGrid
        tasks={state.tasks}
        results={triageResults}
        onDayClick={handleDayClick}
        onChipClick={handleChipClick}
        dailyStudyHours={state.settings.dailyStudyHours}
      />

      <DayPanel
        date={selectedDay}
        tasks={state.tasks}
        results={triageResults}
        onClose={() => setSelectedDay(null)}
        onAddTask={(date) => {
          setEditingTask(undefined);
          setModalDate(date);
          setModalOpen(true);
        }}
        onEditTask={(task) => {
          setModalDate(undefined);
          setEditingTask(task);
          setModalOpen(true);
        }}
      />

      <TaskModal
        open={modalOpen}
        task={editingTask}
        defaultDate={modalDate}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(undefined);
          setModalDate(undefined);
        }}
      />
    </div>
  );
}
