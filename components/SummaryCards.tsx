// components/SummaryCards.tsx – Three category count cards

import { Flame, Clock, Leaf } from "lucide-react";
import type { Category } from "@/lib/types";

interface Props {
  counts: Record<Category, number>;
  activeFilter: Category | "all";
  onFilter: (f: Category | "all") => void;
}

const CARDS = [
  {
    key: "must" as Category,
    label: "Must Do",
    Icon: Flame,
    bg: "bg-[var(--must-bg)]",
    text: "text-[var(--must)]",
    border: "border-[var(--must)]/30",
  },
  {
    key: "later" as Category,
    label: "Schedule Later",
    Icon: Clock,
    bg: "bg-[var(--later-bg)]",
    text: "text-[var(--later)]",
    border: "border-[var(--later)]/30",
  },
  {
    key: "skip" as Category,
    label: "Safe to Skip",
    Icon: Leaf,
    bg: "bg-[var(--skip-bg)]",
    text: "text-[var(--skip)]",
    border: "border-[var(--skip)]/30",
  },
];

export default function SummaryCards({ counts, activeFilter, onFilter }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {CARDS.map(({ key, label, Icon, bg, text, border }) => (
        <button
          key={key}
          onClick={() => onFilter(activeFilter === key ? "all" : key)}
          aria-pressed={activeFilter === key}
          className={`card p-4 text-left transition-all focus-ring min-h-[44px] ${bg} border ${border} ${
            activeFilter === key ? "ring-2 ring-[var(--primary)]" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <Icon size={18} className={text} aria-hidden="true" />
            <span className={`text-xs font-semibold uppercase tracking-wide ${text}`}>
              {label}
            </span>
          </div>
          <p className={`text-3xl font-bold mt-2 ${text}`}>{counts[key]}</p>
        </button>
      ))}
    </div>
  );
}
