// components/EmptyState.tsx – Empty state with demo data button

import { Calendar } from "lucide-react";

interface Props {
  title?: string;
  body?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  title = "Nothing on your plate yet.",
  body = "Add your first task, or load demo data to see how ChronoTriage works.",
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
        <Calendar size={28} className="text-[var(--primary)]" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
      <p className="text-[var(--muted)] max-w-sm">{body}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
