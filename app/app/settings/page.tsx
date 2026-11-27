// app/app/settings/page.tsx – Capacity, study hours, reminder email, voice, theme, data management

"use client";

import { useState } from "react";
import { Download, RotateCcw, Sparkles, AlertCircle } from "lucide-react";
import type { Settings } from "@/lib/types";
import { useApp } from "@/lib/context";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function SettingsPage() {
  const { state, updateSettings, loadDemo, reset, isLoaded } = useApp();
  const { showToast } = useToast();
  const [formKey, setFormKey] = useState(0);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div className="max-w-[720px] mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-4">
        <div className="h-8 w-36 rounded bg-[var(--border)] animate-pulse" />
        <div className="h-64 rounded-xl bg-[var(--border)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 sm:pb-10">
      <div>
        <h1 className="text-[28px] leading-[34px] font-bold text-[var(--text)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Adjust your realistic capacity and preferences. Changes apply immediately.
        </p>
      </div>

      <SettingsFields
        key={formKey}
        initialSettings={state.settings}
        updateSettings={updateSettings}
      />

      {/* Preferences */}
      <section className="card p-5 space-y-5" aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" className="text-lg font-semibold text-[var(--text)]">
          Preferences
        </h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor="voice-toggle" className="label">
              Voice briefing
            </label>
            <p className="text-xs text-[var(--muted)]">
              Show the spoken daily briefing player on the dashboard.
            </p>
          </div>
          <input
            id="voice-toggle"
            type="checkbox"
            checked={state.settings.voiceEnabled}
            onChange={(e) => updateSettings({ voiceEnabled: e.target.checked })}
            className="w-6 h-6 accent-[var(--primary)] cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <span className="label">Theme</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Theme selection">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => updateSettings({ theme })}
                aria-pressed={state.settings.theme === theme}
                className={`min-h-[44px] px-4 rounded-lg text-sm capitalize font-medium focus-ring ${
                  state.settings.theme === theme
                    ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                    : "btn-secondary"
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="card p-5 space-y-4" aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-lg font-semibold text-[var(--text)]">
          Data
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Your tasks and settings are stored only in this browser.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const added = loadDemo();
              showToast(
                added > 0
                  ? `Loaded ${added} sample tasks.`
                  : "Demo tasks are already loaded."
              );
            }}
            className="btn-secondary gap-1.5 text-sm"
          >
            <Sparkles size={16} aria-hidden="true" />
            Load demo data
          </button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "chronotriage-backup.json";
              a.click();
              URL.revokeObjectURL(url);
              showToast("Downloaded chronotriage-backup.json.");
            }}
            className="btn-secondary gap-1.5 text-sm"
          >
            <Download size={16} aria-hidden="true" />
            Export JSON
          </button>
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="btn-danger gap-1.5 text-sm"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reset all data
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset all data?"
        body="Reset all data? Your tasks and settings will be removed from this browser."
        confirmLabel="Reset everything"
        danger
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          reset();
          setFormKey((k) => k + 1);
          setResetConfirmOpen(false);
          showToast("All tasks and settings have been reset.");
        }}
      />
    </div>
  );
}

function SettingsFields({
  initialSettings,
  updateSettings,
}: {
  initialSettings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
}) {
  const [weeklyCap, setWeeklyCap] = useState(
    String(initialSettings.weeklyCapacityHours)
  );
  const [dailyHours, setDailyHours] = useState(
    String(initialSettings.dailyStudyHours)
  );
  const [email, setEmail] = useState(initialSettings.reminderEmail);
  const [errors, setErrors] = useState<{
    weeklyCap?: string;
    dailyHours?: string;
    email?: string;
  }>({});

  const handleWeeklyChange = (val: string) => {
    setWeeklyCap(val);
    const num = Number(val);
    if (!val || isNaN(num) || num < 1 || num > 80) {
      setErrors((e) => ({
        ...e,
        weeklyCap: "Enter weekly hours between 1 and 80.",
      }));
      return;
    }
    setErrors((e) => ({ ...e, weeklyCap: undefined }));
    updateSettings({ weeklyCapacityHours: num });
  };

  const handleDailyChange = (val: string) => {
    setDailyHours(val);
    const num = Number(val);
    if (!val || isNaN(num) || num < 0.5 || num > 16) {
      setErrors((e) => ({
        ...e,
        dailyHours: "Enter daily hours between 0.5 and 16.",
      }));
      return;
    }
    setErrors((e) => ({ ...e, dailyHours: undefined }));
    updateSettings({ dailyStudyHours: num });
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const trimmed = val.trim();
    if (trimmed !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrors((e) => ({
        ...e,
        email: "Enter a valid email address or leave blank.",
      }));
      return;
    }
    setErrors((e) => ({ ...e, email: undefined }));
    updateSettings({ reminderEmail: trimmed });
  };

  return (
    <section className="card p-5 space-y-5" aria-labelledby="planning-heading">
      <h2 id="planning-heading" className="text-lg font-semibold text-[var(--text)]">
        Planning &amp; reminders
      </h2>

      <div className="space-y-1">
        <label htmlFor="weekly-capacity" className="label">
          Weekly capacity hours
        </label>
        <input
          id="weekly-capacity"
          type="number"
          min={1}
          max={80}
          step={1}
          value={weeklyCap}
          onChange={(e) => handleWeeklyChange(e.target.value)}
          aria-describedby={errors.weeklyCap ? "weekly-err" : "weekly-help"}
          className="input max-w-xs"
        />
        {errors.weeklyCap ? (
          <p
            id="weekly-err"
            role="alert"
            className="text-xs text-[var(--must)] flex items-center gap-1"
          >
            <AlertCircle size={14} aria-hidden="true" />
            {errors.weeklyCap}
          </p>
        ) : (
          <p id="weekly-help" className="text-xs text-[var(--muted)]">
            1 to 80 hours per week (default 20). Controls your load meter and Safe to Skip overload check.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="daily-hours" className="label">
          Daily study hours
        </label>
        <input
          id="daily-hours"
          type="number"
          min={0.5}
          max={16}
          step={0.5}
          value={dailyHours}
          onChange={(e) => handleDailyChange(e.target.value)}
          aria-describedby={errors.dailyHours ? "daily-err" : "daily-help"}
          className="input max-w-xs"
        />
        {errors.dailyHours ? (
          <p
            id="daily-err"
            role="alert"
            className="text-xs text-[var(--must)] flex items-center gap-1"
          >
            <AlertCircle size={14} aria-hidden="true" />
            {errors.dailyHours}
          </p>
        ) : (
          <p id="daily-help" className="text-xs text-[var(--muted)]">
            0.5 to 16 hours per day (default 3). Used for calendar day tints and start-early suggestions.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="reminder-email" className="label">
          Reminder email
        </label>
        <input
          id="reminder-email"
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder="you@university.edu"
          aria-describedby={errors.email ? "email-err" : "email-help"}
          className="input max-w-md"
        />
        {errors.email ? (
          <p
            id="email-err"
            role="alert"
            className="text-xs text-[var(--must)] flex items-center gap-1"
          >
            <AlertCircle size={14} aria-hidden="true" />
            {errors.email}
          </p>
        ) : (
          <p id="email-help" className="text-xs text-[var(--muted)]">
            Optional. Needed to enable the &ldquo;Email me today&apos;s plan&rdquo; button.
          </p>
        )}
      </div>
    </section>
  );
}
