// components/CategoryBadge.tsx – Icon + label pill. Never colour-only.

import { Flame, Clock, Leaf } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  Category,
  { label: string; Icon: typeof Flame; className: string }
> = {
  must: {
    label: "Must Do",
    Icon: Flame,
    className:
      "bg-[var(--must-bg)] text-[var(--must)] border border-[var(--must)]/30",
  },
  later: {
    label: "Schedule Later",
    Icon: Clock,
    className:
      "bg-[var(--later-bg)] text-[var(--later)] border border-[var(--later)]/30",
  },
  skip: {
    label: "Safe to Skip",
    Icon: Leaf,
    className:
      "bg-[var(--skip-bg)] text-[var(--skip)] border border-[var(--skip)]/30",
  },
};

interface Props {
  category: Category;
  size?: "sm" | "md";
}

export default function CategoryBadge({ category, size = "md" }: Props) {
  const { label, Icon, className } = CONFIG[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold tracking-wide uppercase whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[12px]",
        className
      )}
    >
      <Icon size={size === "sm" ? 10 : 12} aria-hidden="true" />
      {label}
    </span>
  );
}
