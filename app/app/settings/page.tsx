// app/app/settings/page.tsx – Capacity, study hours, reminder email, voice, theme, data management

"use client";

import { useState, useEffect, useRef } from "react";
import { Download, RotateCcw, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import type { Settings } from "@/lib/types";
import { useApp } from "@/lib/context";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { isReminderEmailVerified } from "@/lib/storage";

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

// ── OTP verification states ─────────────────────────────────────────────────
type OtpState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "code"; challengeToken: string; countdown: number }
  | { phase: "confirming"; challengeToken: string; countdown: number }
  | { phase: "verified" }
  | { phase: "error"; message: string };

function EmailVerifyWidget({
  email,
  settings,
  updateSettings,
}: {
  email: string;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
}) {
  const [otpState, setOtpState] = useState<OtpState>({ phase: "idle" });
  const [code, setCode] = useState("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showToast } = useToast();

  const isVerified = isReminderEmailVerified(settings);
  // If email changed since last verification, it's no longer valid
  const verifiedForThisEmail =
    isVerified &&
    settings.verifiedReminderEmail?.trim().toLowerCase() === email.trim().toLowerCase();

  // Tick countdown
  useEffect(() => {
    if (
      (otpState.phase === "code" || otpState.phase === "confirming") &&
      otpState.countdown > 0
    ) {
      countdownRef.current = setInterval(() => {
        setOtpState((prev) => {
          if (prev.phase !== "code" && prev.phase !== "confirming") return prev;
          if (prev.countdown <= 1) {
            clearInterval(countdownRef.current!);
            return { phase: "error", message: "Code expired. Request a new one." };
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpState.phase]);

  const sendCode = async () => {
    setOtpState({ phase: "sending" });
    setCode("");
    try {
      const res = await fetch("/api/reminders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chronotriage-client": "1" },
        body: JSON.stringify({ action: "send", email: email.trim() }),
      });
      const data = (await res.json()) as { challengeToken?: string; expiresInSeconds?: number; error?: string };
      if (!res.ok || !data.challengeToken) {
        setOtpState({ phase: "error", message: data.error ?? "Could not send code. Try again." });
        return;
      }
      setOtpState({
        phase: "code",
        challengeToken: data.challengeToken,
        countdown: data.expiresInSeconds ?? 600,
      });
    } catch {
      setOtpState({ phase: "error", message: "Network error. Please try again." });
    }
  };

  const confirmCode = async () => {
    if (otpState.phase !== "code" && otpState.phase !== "confirming") return;
    const { challengeToken } = otpState;
    const prevCountdown =
      otpState.phase === "code" || otpState.phase === "confirming"
        ? otpState.countdown
        : 0;
    setOtpState({ phase: "confirming", challengeToken, countdown: prevCountdown });
    try {
      const res = await fetch("/api/reminders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chronotriage-client": "1" },
        body: JSON.stringify({ action: "confirm", email: email.trim(), code: code.trim(), challengeToken }),
      });
      const data = (await res.json()) as { verifiedToken?: string; error?: string };
      if (!res.ok || !data.verifiedToken) {
        // Revert to code entry phase so they can retry
        setOtpState({ phase: "code", challengeToken, countdown: 0 });
        showToast(data.error ?? "Incorrect code. Please try again.");
        return;
      }
      updateSettings({
        verifiedReminderEmail: email.trim().toLowerCase(),
        verifiedEmailToken: data.verifiedToken,
      });
      setOtpState({ phase: "verified" });
      showToast("Email verified! Reminders are now enabled.");
    } catch {
      setOtpState({ phase: "code", challengeToken, countdown: 0 });
      showToast("Network error. Please try again.");
    }
  };

  const reset = () => {
    setOtpState({ phase: "idle" });
    setCode("");
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // ── Verified badge ────────────────────────────────────────────────────────
  if (verifiedForThisEmail && otpState.phase !== "code" && otpState.phase !== "confirming") {
    return (
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck size={16} aria-hidden="true" />
          Email verified
        </span>
        <button
          onClick={sendCode}
          className="text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--text)] transition-colors"
          aria-label="Re-verify email"
        >
          Re-verify
        </button>
      </div>
    );
  }

  // ── Send code button (idle / error) ───────────────────────────────────────
  if (otpState.phase === "idle" || otpState.phase === "error") {
    return (
      <div className="mt-2 space-y-1.5">
        {otpState.phase === "error" && (
          <p role="alert" className="text-xs text-[var(--must)] flex items-center gap-1">
            <AlertCircle size={13} aria-hidden="true" />
            {otpState.message}
          </p>
        )}
        <button
          onClick={sendCode}
          className="btn-secondary text-sm gap-1.5"
          aria-label="Send verification code to this email"
        >
          <ShieldCheck size={15} aria-hidden="true" />
          Send verification code
        </button>
        <p className="text-xs text-[var(--muted)]">
          We&apos;ll email a 6-digit code to confirm you own this address.
        </p>
      </div>
    );
  }

  // ── Sending spinner ───────────────────────────────────────────────────────
  if (otpState.phase === "sending") {
    return (
      <div className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
        <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
        Sending code…
      </div>
    );
  }

  // ── Code entry / confirming ───────────────────────────────────────────────
  if (otpState.phase !== "code" && otpState.phase !== "confirming") return null;
  const { countdown } = otpState;
  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, "0");
  const countdownLabel = countdown > 0 ? `${mins}:${secs}` : "Expired";
  const isExpired = countdown <= 0;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-[var(--muted)]">
        Enter the 6-digit code sent to <strong>{email}</strong>.{" "}
        {!isExpired && (
          <span className="tabular-nums text-[var(--text)]">Expires in {countdownLabel}</span>
        )}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          aria-label="6-digit verification code"
          className="input w-32 text-center tracking-widest font-mono"
          autoComplete="one-time-code"
          disabled={otpState.phase === "confirming" || isExpired}
        />
        <button
          onClick={confirmCode}
          disabled={code.length !== 6 || otpState.phase === "confirming" || isExpired}
          className="btn-primary text-sm gap-1.5"
          aria-label="Confirm verification code"
        >
          <CheckCircle2 size={15} aria-hidden="true" />
          {otpState.phase === "confirming" ? "Verifying…" : "Confirm"}
        </button>
        {isExpired ? (
          <button onClick={sendCode} className="text-xs underline underline-offset-2 text-[var(--primary)] hover:opacity-80">
            Request new code
          </button>
        ) : (
          <button onClick={reset} className="text-xs underline underline-offset-2 text-[var(--muted)] hover:text-[var(--text)]">
            Cancel
          </button>
        )}
      </div>
      {!isExpired && (
        <button
          onClick={sendCode}
          className="text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--text)] transition-colors"
        >
          Resend code
        </button>
      )}
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
  const [settings, setSettings] = useState(initialSettings);
  const [errors, setErrors] = useState<{
    weeklyCap?: string;
    dailyHours?: string;
    email?: string;
  }>({});

  // Mirror settings changes from parent into local state so the verify widget
  // can call updateSettings and SettingsFields sees fresh values
  const handleUpdateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    updateSettings(patch);
  };

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
    handleUpdateSettings({ weeklyCapacityHours: num });
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
    handleUpdateSettings({ dailyStudyHours: num });
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
    // If the email changed from the verified one, clear verification
    if (
      trimmed.toLowerCase() !== settings.verifiedReminderEmail?.trim().toLowerCase()
    ) {
      handleUpdateSettings({
        reminderEmail: trimmed,
        verifiedReminderEmail: "",
        verifiedEmailToken: "",
      });
    } else {
      handleUpdateSettings({ reminderEmail: trimmed });
    }
  };

  const emailTrimmed = email.trim();
  const emailValid =
    emailTrimmed !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);

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
            Optional. Verify to enable the &ldquo;Email me today&apos;s plan&rdquo; button.
          </p>
        )}

        {/* OTP verification widget — only shown when email is valid */}
        {emailValid && !errors.email && (
          <EmailVerifyWidget
            email={emailTrimmed}
            settings={settings}
            updateSettings={handleUpdateSettings}
          />
        )}
      </div>
    </section>
  );
}
