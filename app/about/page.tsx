// app/about/page.tsx – Problem, scoring rules, 3 team roles, tools, privacy & limitations

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-[820px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-[28px] leading-[34px] font-bold text-[var(--text)]">
          About ChronoTriage AI
        </h1>
        <p className="text-[var(--muted)]">
          A calm deadline and priority planner for college students, built as a Digital Data and AI Literacy team project.
        </p>
      </div>

      <section className="card p-6 space-y-2">
        <h2 className="text-xl font-semibold text-[var(--text)]">The problem</h2>
        <p className="text-sm text-[var(--muted)]">
          Ordinary calendars display every deadline with equal visual weight. When assignments, lab reports, exams, and club tasks collide in the same week, students are left guessing what actually needs attention tonight and what can safely give.
        </p>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-[var(--text)]">How the scoring works</h2>
        <p className="text-sm text-[var(--muted)]">
          Triage labels are computed by plain, deterministic code — never guessed by an LLM — so every recommendation is repeatable and explainable.
        </p>

        <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-mono text-sm text-[var(--text)]">
          score = (Urgency × Importance) / (1 + estimatedHours / 4)
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                <th className="py-2 pr-4">Days until due</th>
                <th className="py-2">Urgency (U)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
              <tr><td className="py-2 pr-4">0 or 1 (or overdue)</td><td className="py-2 font-semibold">10</td></tr>
              <tr><td className="py-2 pr-4">2 to 3</td><td className="py-2 font-semibold">8</td></tr>
              <tr><td className="py-2 pr-4">4 to 7</td><td className="py-2 font-semibold">6</td></tr>
              <tr><td className="py-2 pr-4">8 to 14</td><td className="py-2 font-semibold">4</td></tr>
              <tr><td className="py-2 pr-4">15 or more</td><td className="py-2 font-semibold">2</td></tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--text)]">Category rules (first match wins):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>If you set an override, your choice always wins.</li>
            <li>If due in 1 day or less (or overdue) and importance ≥ 5: <strong>Must Do</strong> (hard rule).</li>
            <li>If score ≥ 20: <strong>Must Do</strong>.</li>
            <li>
              <strong>Safe to Skip</strong> only when ALL four conditions hold: score &lt; 8, importance ≤ 3, no open task depends on it, and that week&apos;s planned hours exceed your weekly capacity.
            </li>
            <li>Otherwise: <strong>Schedule Later</strong>.</li>
          </ul>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-[var(--text)]">The three team roles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1">
            <h3 className="font-semibold text-[var(--text)]">Member 1</h3>
            <p className="text-[var(--primary)] font-medium">Frontend and UX Lead</p>
            <p className="text-xs text-[var(--muted)]">
              Pages, components, design tokens, responsive 360 px layout, and WCAG accessibility.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1">
            <h3 className="font-semibold text-[var(--text)]">Member 2</h3>
            <p className="text-[var(--primary)] font-medium">AI Logic and Automation Lead</p>
            <p className="text-xs text-[var(--muted)]">
              Deterministic triage and forecast engines, reason templates, Zapier, ElevenLabs, Gemini explanations, and Botpress content.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1">
            <h3 className="font-semibold text-[var(--text)]">Member 3</h3>
            <p className="text-[var(--primary)] font-medium">Integration and Deployment Lead</p>
            <p className="text-xs text-[var(--muted)]">
              State &amp; storage, API wiring, Vitest test suite, GitHub workflow, Vercel deployment, and README.
            </p>
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-3 text-sm text-[var(--muted)]">
        <h2 className="text-xl font-semibold text-[var(--text)]">Tools we used</h2>
        <p>
          Next.js (App Router), TypeScript, Tailwind CSS, Antigravity, GitHub, Vercel, Zapier (Gmail Catch Hook), ElevenLabs, Google Gemini API, and Botpress Webchat.
        </p>
      </section>

      <section className="card p-6 space-y-3 text-sm text-[var(--muted)]">
        <h2 className="text-xl font-semibold text-[var(--text)]">Privacy &amp; limitations</h2>
        <p>
          <strong className="text-[var(--text)]">Privacy:</strong> In this version your tasks are stored only in your own browser. Clearing browser data removes them, and no analytics or third-party trackers are included.
        </p>
        <p>
          <strong className="text-[var(--text)]">Limitations:</strong> Triage is advice from a simple scoring rule. It cannot know your syllabus or your teacher&apos;s rules. You are always in control.
        </p>
      </section>

      <div>
        <Link href="/app" className="btn-primary">
          Open the planner
        </Link>
      </div>
    </div>
  );
}
