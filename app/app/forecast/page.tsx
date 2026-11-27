// app/app/forecast/page.tsx – Placeholder until Step 14 Stretch Forecast

import Link from "next/link";

export default function ForecastPlaceholderPage() {
  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-4">
      <h1 className="text-[28px] leading-[34px] font-bold text-[var(--text)]">
        4-Week Forecast
      </h1>
      <p className="text-sm text-[var(--muted)]">
        Estimated from your deadlines. Forecast chart is coming right after MVP verification.
      </p>
      <Link href="/app" className="btn-secondary text-sm">
        Back to Dashboard
      </Link>
    </div>
  );
}
