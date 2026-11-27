// components/Navbar.tsx – Top navigation bar with responsive hamburger & mobile floating Add button

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import TaskModal from "./TaskModal";

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/tasks", label: "Tasks" },
  { href: "/app/forecast", label: "Forecast" },
  { href: "/app/settings", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isAppRoute = pathname.startsWith("/app");

  // Focus trap and Escape handling for mobile hamburger menu
  useEffect(() => {
    if (!menuOpen) return;
    const container = menuContainerRef.current;
    const firstLink = container?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      } else if (e.key === "Tab" && container) {
        const focusable = container.querySelectorAll<HTMLElement>("a, button");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40">
        <nav
          className="max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between gap-3"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-heading font-bold text-[var(--primary)] text-lg focus-ring rounded-lg px-1 py-1 min-h-[44px] whitespace-nowrap shrink-0"
          >
            <Clock size={20} aria-hidden="true" />
            ChronoTriage
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-3 lg:gap-6">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={cn(
                  "text-sm font-medium transition-colors focus-ring rounded-lg px-2 py-2 min-h-[44px] flex items-center whitespace-nowrap",
                  pathname === l.href
                    ? "text-[var(--primary)] border-b-2 border-[var(--primary)] rounded-b-none"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Add task + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="hidden sm:inline-flex btn-primary gap-1.5 text-sm whitespace-nowrap shrink-0"
              aria-label="Add new task"
            >
              <Plus size={18} aria-hidden="true" />
              <span>Add task</span>
            </button>
            <button
              ref={menuButtonRef}
              className="md:hidden btn-secondary px-3"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            ref={menuContainerRef}
            id="mobile-menu"
            role="dialog"
            aria-label="Mobile navigation"
            className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-4 pt-2 space-y-1"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                aria-current={pathname === l.href ? "page" : undefined}
                className={cn(
                  "flex items-center px-3 min-h-[44px] rounded-lg text-sm font-medium focus-ring",
                  pathname === l.href
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                )}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
              className="sm:hidden w-full btn-primary gap-1.5 text-sm mt-2"
            >
              <Plus size={18} aria-hidden="true" />
              <span>Add task</span>
            </button>
          </div>
        )}
      </header>

      {/* Mobile floating Add task button at bottom-left so Botpress bubble bottom-right stays unobstructed */}
      {isAppRoute && (
        <button
          onClick={() => setModalOpen(true)}
          className="sm:hidden fixed bottom-4 left-4 z-30 btn-primary shadow-lg gap-1.5 px-4"
          aria-label="Add new task"
        >
          <Plus size={18} aria-hidden="true" />
          <span>Add task</span>
        </button>
      )}

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
