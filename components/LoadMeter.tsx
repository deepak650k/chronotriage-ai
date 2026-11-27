// components/LoadMeter.tsx – Weekly workload bar

interface Props {
  hours: number;
  capacity: number;
}

export default function LoadMeter({ hours, capacity }: Props) {
  const roundedHours = Math.round(hours * 10) / 10;
  const rawPct = capacity > 0 ? Math.round((roundedHours / capacity) * 100) : 0;
  const barWidth = Math.min(rawPct, 100);
  const over = roundedHours > capacity;
  const amber = rawPct >= 70 && !over;

  const fillColor = over
    ? "bg-[var(--must)]"
    : amber
    ? "bg-[var(--later)]"
    : "bg-[var(--skip)]";

  const statusWord = over
    ? "Crunch week"
    : amber
    ? "Busy week ahead"
    : "Room to breathe";

  return (
    <div className="card p-4 space-y-2">
      <div className="flex justify-between text-sm text-[var(--muted)]">
        <span>This week&apos;s load</span>
        <span className="font-semibold text-[var(--text)]">{statusWord}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={rawPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Weekly load: ${roundedHours} of ${capacity} hours planned (${rawPct}%)`}
        className="h-3 rounded-full bg-[var(--border)] overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${fillColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="text-sm text-[var(--muted)]">
        {roundedHours} of {capacity} hours planned ({rawPct}%)
      </p>
    </div>
  );
}
