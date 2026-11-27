// components/Footer.tsx – Global site footer with privacy note, tool credits, and About link

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] mt-auto">
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[var(--muted)]">
        <div className="space-y-1">
          <p className="font-medium text-[var(--text)]">
            ChronoTriage AI · Digital Data &amp; AI Literacy Team Project
          </p>
          <p>
            In this version your tasks stay in your own browser. Advice only — you always decide.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Built with Next.js, Tailwind, Antigravity, GitHub, Vercel, Zapier, ElevenLabs, Gemini &amp; Botpress
          </span>
          <Link
            href="/about"
            className="text-[var(--primary)] font-medium hover:underline focus-ring rounded px-1 py-0.5"
          >
            About &amp; Scoring Rules
          </Link>
        </div>
      </div>
    </footer>
  );
}
