// app/login/page.tsx – Student Sign In & Create Account page with Zapier reminder email opt-in

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { useApp } from "@/lib/context";
import { useToast } from "@/components/Toast";
import { isValidEmail, validatePasswordStrength } from "@/lib/auth";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, register, logout, isLoaded } = useApp();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useForReminders, setUseForReminders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup") {
      const pwErr = validatePasswordStrength(password);
      if (pwErr) { setError(pwErr); return; }
    } else if (!password) {
      setError("Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const res =
        mode === "signup"
          ? await register(name, email, password, useForReminders)
          : await login(email, password, useForReminders);

      if (!res.ok) {
        setError(res.error);
        return;
      }

      showToast(
        useForReminders
          ? `Welcome, ${res.user.name}! Reminder email set to ${res.user.email}.`
          : `Welcome back, ${res.user.name}!`
      );
      router.push("/app");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="max-w-[460px] mx-auto px-4 py-12">
        <div className="card p-8 h-96 animate-pulse bg-[var(--surface)]" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-12">
        <div className="card p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-[var(--skip-bg)] text-[var(--skip)] flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[var(--text)]">
                Signed in as {user.name}
              </h1>
              <p className="text-sm text-[var(--muted)]">{user.email}</p>
            </div>
          </div>

          <p className="text-sm text-[var(--muted)]">
            Your planner is personalized and ready. Daily email reminders use your saved email address whenever you click{" "}
            <strong className="text-[var(--text)]">Email me today&apos;s plan</strong> on the Dashboard.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/app" className="btn-primary gap-2 flex-1">
              Open dashboard
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                showToast("Signed out.");
              }}
              className="btn-secondary gap-1.5"
            >
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[460px] mx-auto px-4 py-10 md:py-14 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
          <Clock size={14} aria-hidden="true" />
          Student workspace
        </div>
        <h1 className="text-[28px] leading-[34px] font-bold text-[var(--text)]">
          {mode === "signin" ? "Welcome back" : "Create your study profile"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {mode === "signin"
            ? "Sign in to personalise your planner and connect your email for daily Zapier reminders."
            : "Takes 10 seconds — save your email for one-click daily Zapier plan reminders."}
        </p>
      </div>

      <div className="card p-6 sm:p-7 space-y-5">
        {/* Mode switcher */}
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => switchMode("signin")}
            className={cn(
              "min-h-[40px] rounded-lg text-sm font-medium transition-colors focus-ring",
              mode === "signin"
                ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => switchMode("signup")}
            className={cn(
              "min-h-[40px] rounded-lg text-sm font-medium transition-colors focus-ring",
              mode === "signup"
                ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="label">
                First name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav"
                  className="input pl-9"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-email" className="label">
              Email address
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="input pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="auth-password" className="label">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 8 chars · A-Z · 0-9 · symbol" : "Enter your password"}
                className="input pl-9 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] focus-ring rounded-lg p-2"
              >
                {showPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            {/* Password strength meter — only shown during signup */}
            {mode === "signup" && password.length > 0 && (() => {
              const checks = [
                password.length >= 8,
                /[A-Z]/.test(password),
                /[a-z]/.test(password),
                /[0-9]/.test(password),
                /[^A-Za-z0-9]/.test(password),
              ];
              const passed = checks.filter(Boolean).length;
              const labels = ["Weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
              const colors = ["bg-red-500", "bg-red-400", "bg-yellow-400", "bg-lime-400", "bg-green-500", "bg-green-600"];
              return (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {checks.map((ok, i) => (
                      <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", ok ? colors[passed] : "bg-[var(--border)]")} />
                    ))}
                  </div>
                  <p className={cn("text-xs font-medium", passed <= 1 ? "text-red-500" : passed <= 2 ? "text-yellow-500" : passed <= 3 ? "text-lime-600" : "text-green-600")}>
                    {labels[passed]} — {passed < 5 ? "add " + [
                      !checks[0] && "8+ chars",
                      !checks[1] && "uppercase",
                      !checks[2] && "lowercase",
                      !checks[3] && "number",
                      !checks[4] && "symbol",
                    ].filter(Boolean).join(", ") : "All requirements met ✓"}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Automation email opt-in */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] cursor-pointer">
            <input
              type="checkbox"
              checked={useForReminders}
              onChange={(e) => setUseForReminders(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--primary)] shrink-0"
            />
            <span className="text-xs text-[var(--text)] leading-relaxed">
              Use this email for daily{" "}
              <strong className="font-semibold">Zapier email reminders</strong>{" "}
              <span className="text-[var(--muted)]">
                (enables &ldquo;Email me today&apos;s plan&rdquo; automatically).
              </span>
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="text-xs text-[var(--must)] bg-[var(--must-bg)] border border-[var(--must)]/30 rounded-lg px-3 py-2 flex items-center gap-2"
            >
              <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full gap-2"
          >
            {submitting
              ? "Please wait…"
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>

        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2 text-xs">
          <span className="text-[var(--muted)]">Just browsing?</span>
          <Link
            href="/app"
            className="text-[var(--primary)] font-medium hover:underline focus-ring rounded px-1 py-0.5"
          >
            Continue as guest →
          </Link>
        </div>
      </div>

      <p className="text-xs text-center text-[var(--muted)] px-2">
        Your data is stored privately on this device only (PBKDF2-SHA256 · per-user isolation · 8h session expiry · 5-attempt lockout). No passwords or tasks ever leave your browser.
      </p>
    </div>
  );
}
