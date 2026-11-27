// components/Navbar.tsx – Top navigation bar with responsive hamburger & mobile floating Add button

"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus, Clock, Sun, Moon, LogIn, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { useToast } from "./Toast";
import TaskModal from "./TaskModal";

function usePrefersDark(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false
  );
}

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/tasks", label: "Tasks" },
  { href: "/app/forecast", label: "Forecast" },
  { href: "/app/settings", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { state, updateSettings, isLoaded, user, logout } = useApp();
  const { showToast } = useToast();
  const prefersDark = usePrefersDark();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isAppRoute = pathname.startsWith("/app");
  const isDark =
    state.settings.theme === "dark" ||
    (state.settings.theme === "system" && prefersDark);

  const toggleTheme = () => {
    updateSettings({ theme: isDark ? "light" : "dark" });
  };

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
          <div className="hidden md:flex items-center gap-1.5 lg:gap-5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={cn(
                  "text-sm font-medium transition-colors focus-ring rounded-lg px-1.5 lg:px-2 py-2 min-h-[44px] flex items-center whitespace-nowrap",
                  pathname === l.href
                    ? "text-[var(--primary)] border-b-2 border-[var(--primary)] rounded-b-none"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Theme toggle + Auth + Add task + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoaded && (
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-secondary px-2.5"
                aria-label={isDark ? "Switch to light study mode" : "Switch to dark study mode"}
                title={isDark ? "Light study mode" : "Dark study mode"}
              >
                {isDark ? (
                  <Sun size={18} aria-hidden="true" />
                ) : (
                  <Moon size={18} aria-hidden="true" />
                )}
              </button>
            )}
            {isLoaded &&
              (user ? (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Link
                    href="/login"
                    aria-label={`Account: ${user.name}`}
                    className="inline-flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-xl text-xs font-medium bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] focus-ring max-w-[130px]"
                    title={`Signed in as ${user.email}`}
                  >
                    <User size={15} className="text-[var(--primary)] shrink-0" aria-hidden="true" />
                    <span className="hidden lg:inline truncate">{user.name.split(" ")[0]}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      showToast("Signed out.");
                    }}
                    className="btn-secondary px-2.5"
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <LogOut size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  aria-label="Sign in"
                  title="Sign in"
                  className={cn(
                    "hidden sm:inline-flex btn-secondary gap-1.5 text-sm px-2.5 lg:px-3 whitespace-nowrap",
                    pathname === "/login" && "border-[var(--primary)] text-[var(--primary)]"
                  )}
                >
                  <LogIn size={16} aria-hidden="true" />
                  <span className="hidden lg:inline">Sign in</span>
                </Link>
              ))}
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
            {isLoaded &&
              (user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                    showToast("Signed out.");
                  }}
                  className="w-full flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] focus-ring"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Sign out ({user.name.split(" ")[0]})</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-sm font-medium text-[var(--primary)] hover:bg-[var(--bg)] focus-ring"
                >
                  <LogIn size={16} aria-hidden="true" />
                  <span>Sign in</span>
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
