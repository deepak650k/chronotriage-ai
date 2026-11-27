// app/page.tsx – Landing page (/)

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Clock,
  Leaf,
  PlusCircle,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/lib/context";

export default function LandingPage() {
  const router = useRouter();
  const { loadDemo } = useApp();

  const handleTryDemo = () => {
    loadDemo();
    router.push("/app");
  };

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 space-y-16">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
            Built for busy semesters · 100% private &amp; free
          </span>
          <h1 className="text-[32px] leading-[36px] md:text-[44px] md:leading-[48px] font-bold text-[var(--text)] tracking-tight">
            Know what to do, what can wait, and what to drop.
          </h1>
          <p className="text-lg text-[var(--muted)]">
            Midterms, lab reports, and club deadlines colliding in the same week? ChronoTriage turns chaos into a calm, honest plan — with a plain-language reason for every call.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app" className="btn-primary gap-2">
              Open the planner
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <button onClick={handleTryDemo} className="btn-secondary gap-1.5">
              <Sparkles size={16} aria-hidden="true" />
              Try with sample deadlines
            </button>
          </div>
        </div>

        {/* Static mock of dashboard cards */}
        <div className="card p-5 space-y-3 bg-[var(--surface)]" aria-label="Sample triage view">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] pb-2 border-b border-[var(--border)]">
            <span className="font-semibold text-[var(--text)]">Sample week · 14 / 20 h</span>
            <span className="text-[var(--later)] font-medium">70% Getting full</span>
          </div>

          <div className="card border-l-4 border-l-[var(--must)] p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase bg-[var(--must-bg)] text-[var(--must)]">
                <Flame size={11} aria-hidden="true" /> Must Do
              </span>
              <span className="text-xs text-[var(--muted)]">Score 36.0</span>
            </div>
            <p className="font-semibold text-sm text-[var(--text)]">Maths assignment 4 · 4 h</p>
            <p className="text-xs text-[var(--muted)]">
              Due in 2 days, worth 9/10, about 4 h of work. Do this first.
            </p>
          </div>

          <div className="card border-l-4 border-l-[var(--later)] p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase bg-[var(--later-bg)] text-[var(--later)]">
                <Clock size={11} aria-hidden="true" /> Schedule Later
              </span>
              <span className="text-xs text-[var(--muted)]">Score 16.8</span>
            </div>
            <p className="font-semibold text-sm text-[var(--text)]">Physics lab report · 6 h</p>
            <p className="text-xs text-[var(--muted)]">
              Worth 7/10 and due in 5 days. Plan about 6 h before then; no need to start today.
            </p>
          </div>

          <div className="card border-l-4 border-l-[var(--skip)] p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase bg-[var(--skip-bg)] text-[var(--skip)]">
                <Leaf size={11} aria-hidden="true" /> Safe to Skip
              </span>
              <span className="text-xs text-[var(--muted)]">Score 6.9</span>
            </div>
            <p className="font-semibold text-sm text-[var(--text)]">Club poster design · 3 h</p>
            <p className="text-xs text-[var(--muted)]">
              Low impact (2/10), nothing depends on it, and that week is over capacity.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="space-y-6 scroll-mt-20">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[var(--text)]">How it works</h2>
          <p className="text-sm text-[var(--muted)]">Three simple steps — takes under a minute to set up your week.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 space-y-2 transition-transform hover:-translate-y-0.5">
            <PlusCircle size={22} className="text-[var(--primary)]" aria-hidden="true" />
            <h3 className="font-semibold text-lg text-[var(--text)]">1. Add your deadlines</h3>
            <p className="text-sm text-[var(--muted)]">
              Use quick presets for assignments, exams, or labs — just due date, hours, and importance.
            </p>
          </div>
          <div className="card p-5 space-y-2 transition-transform hover:-translate-y-0.5">
            <Sparkles size={22} className="text-[var(--primary)]" aria-hidden="true" />
            <h3 className="font-semibold text-lg text-[var(--text)]">2. Get clear triage</h3>
            <p className="text-sm text-[var(--muted)]">
              A clear, deterministic rule labels every task Must Do, Schedule Later, or Safe to Skip.
            </p>
          </div>
          <div className="card p-5 space-y-2 transition-transform hover:-translate-y-0.5">
            <ShieldCheck size={22} className="text-[var(--primary)]" aria-hidden="true" />
            <h3 className="font-semibold text-lg text-[var(--text)]">3. Protect your time</h3>
            <p className="text-sm text-[var(--muted)]">
              Watch your weekly study load, spot crunch weeks early, and stay ahead without burnout.
            </p>
          </div>
        </div>
      </section>

      {/* The three labels */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">The three labels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 border-l-4 border-l-[var(--must)] space-y-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase bg-[var(--must-bg)] text-[var(--must)]">
              <Flame size={12} aria-hidden="true" /> Must Do
            </span>
            <p className="text-sm text-[var(--text)]">
              Urgent and valuable enough that you should start it now.
            </p>
            <p className="text-xs text-[var(--muted)]">
              Example: Maths assignment due in 2 days (importance 9/10).
            </p>
          </div>

          <div className="card p-5 border-l-4 border-l-[var(--later)] space-y-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase bg-[var(--later-bg)] text-[var(--later)]">
              <Clock size={12} aria-hidden="true" /> Schedule Later
            </span>
            <p className="text-sm text-[var(--text)]">
              Matters, but is not urgent yet. Plan time for it before the deadline.
            </p>
            <p className="text-xs text-[var(--muted)]">
              Example: Physics lab report due in 5 days (6 h of work).
            </p>
          </div>

          <div className="card p-5 border-l-4 border-l-[var(--skip)] space-y-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase bg-[var(--skip-bg)] text-[var(--skip)]">
              <Leaf size={12} aria-hidden="true" /> Safe to Skip
            </span>
            <p className="text-sm text-[var(--text)]">
              Low impact, nothing depends on it, and your week is over capacity.
            </p>
            <p className="text-xs text-[var(--muted)]">
              Example: Optional club poster during an overloaded week. Only skipped if you click.
            </p>
          </div>
        </div>
      </section>

      {/* Why it is different */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Why it is different</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 space-y-2">
            <h3 className="font-semibold text-[var(--text)]">Explainable</h3>
            <p className="text-sm text-[var(--muted)]">
              Every label includes a plain-language reason and a visible score so you can trust or challenge it.
            </p>
          </div>
          <div className="card p-5 space-y-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[var(--primary)]" aria-hidden="true" />
              <h3 className="font-semibold text-[var(--text)]">You stay in control</h3>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Override any label with one click, and undo any skip anytime. Nothing is dropped without your click.
            </p>
          </div>
          <div className="card p-5 space-y-2">
            <h3 className="font-semibold text-[var(--text)]">Honest</h3>
            <p className="text-sm text-[var(--muted)]">
              Built on a transparent heuristic, not a black-box grade predictor. It advises; you decide.
            </p>
          </div>
        </div>
      </section>

      {/* Try it */}
      <section className="card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[var(--primary)]/5 border-[var(--primary)]/20">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[var(--text)]">Try it with realistic student deadlines</h2>
          <p className="text-sm text-[var(--muted)]">
            Insert 8 sample tasks across two weeks and see how ChronoTriage organises the week.
          </p>
        </div>
        <button onClick={handleTryDemo} className="btn-primary gap-2 shrink-0">
          Load demo data and explore
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>

      {/* FAQ */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Frequently asked questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5 space-y-1.5">
            <h3 className="font-semibold text-[var(--text)]">Is my data private?</h3>
            <p className="text-sm text-[var(--muted)]">
              Yes. In this version your tasks stay in your own browser.
            </p>
          </div>
          <div className="card p-5 space-y-1.5">
            <h3 className="font-semibold text-[var(--text)]">How is the score calculated?</h3>
            <p className="text-sm text-[var(--muted)]">
              Urgency times importance, divided by effort. The{" "}
              <Link href="/about" className="text-[var(--primary)] hover:underline">
                About page
              </Link>{" "}
              shows the full formula.
            </p>
          </div>
          <div className="card p-5 space-y-1.5">
            <h3 className="font-semibold text-[var(--text)]">Can it skip something important?</h3>
            <p className="text-sm text-[var(--muted)]">
              The app only suggests skipping low-impact tasks that nothing depends on when your week is full, and you always decide.
            </p>
          </div>
          <div className="card p-5 space-y-1.5">
            <h3 className="font-semibold text-[var(--text)]">Do I need an account?</h3>
            <p className="text-sm text-[var(--muted)]">
              No — you can jump straight in as a guest, or{" "}
              <Link href="/login" className="text-[var(--primary)] hover:underline">
                sign in / create a profile
              </Link>{" "}
              to personalise your dashboard and auto-fill your email for daily Zapier reminders.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
