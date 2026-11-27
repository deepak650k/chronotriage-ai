// components/ChronoBot.tsx – Built-in floating AI assistant for website Q&A and task guidance

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, Sparkles, RotateCcw } from "lucide-react";
import { useApp } from "@/lib/context";
import { isOpen, currentWeekHours } from "@/lib/triage";
import type { Category } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const STARTER_PROMPTS = [
  "What should I do first?",
  "What does this website do?",
  "How does scoring work?",
  "How do email reminders work?",
];

const INITIAL_GREETING: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm ChronoBot, your ChronoTriage AI assistant. Ask me anything about this website (Calendar, Forecast, scoring rules, email reminders, privacy) or about your current tasks!",
};

export default function ChronoBot() {
  const { state, triageResults, isLoaded, today } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const chatContext = useMemo(() => {
    if (!isLoaded || !today) return undefined;
    const openTasks = state.tasks.filter(isOpen);
    const counts: Record<Category, number> = { must: 0, later: 0, skip: 0 };
    for (const t of openTasks) {
      const cat = triageResults.get(t.id)?.category ?? "later";
      counts[cat]++;
    }
    const order: Record<Category, number> = { must: 0, later: 1, skip: 2 };
    const topTasks = [...openTasks]
      .sort((a, b) => {
        const ra = triageResults.get(a.id);
        const rb = triageResults.get(b.id);
        const ca = order[ra?.category ?? "later"];
        const cb = order[rb?.category ?? "later"];
        if (ca !== cb) return ca - cb;
        return (rb?.score ?? 0) - (ra?.score ?? 0);
      })
      .slice(0, 12)
      .map((t) => {
        const res = triageResults.get(t.id);
        return {
          title: t.title,
          course: t.course,
          hours: t.estimatedHours,
          days: res?.days ?? 0,
          importance: t.importance,
          score: res ? Math.round(res.score * 10) / 10 : undefined,
          category: res?.category ?? ("later" as Category),
          reason: res?.reason ?? "",
        };
      });

    return {
      weekHours: currentWeekHours(state.tasks, today),
      capacity: state.settings.weeklyCapacityHours,
      counts,
      tasks: topTasks,
    };
  }, [isLoaded, today, state.tasks, state.settings.weeklyCapacityHours, triageResults]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
    };
    const nextHistory = [...messages.slice(-6), userMsg].map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory.slice(0, -1),
          context: chatContext,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      const replyText =
        data.reply ??
        data.error ??
        "Sorry, I had trouble answering that. Try asking about your Must Do tasks, scoring, or any page on the website.";
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: replyText },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Couldn't reach ChronoBot right now — please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating trigger button (bottom-right, unobstructed by mobile Add button on bottom-left) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 btn-primary shadow-lg gap-2 px-3.5 sm:px-4 rounded-full"
          aria-label="Open ChronoBot AI website assistant"
        >
          <MessageCircle size={18} aria-hidden="true" />
          <span className="hidden sm:inline text-sm">Ask ChronoBot</span>
          <span className="sm:hidden text-sm">Chat</span>
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <section
          role="dialog"
          aria-label="ChronoBot AI assistant"
          className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-h-[75vh] card shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[var(--primary)]/12 text-[var(--primary)] flex items-center justify-center">
                <Sparkles size={16} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[var(--text)] leading-tight">
                  ChronoBot AI
                </h2>
                <p className="text-[11px] text-[var(--muted)]">
                  Website &amp; deadline guide
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMessages([INITIAL_GREETING])}
                  aria-label="Reset conversation"
                  title="New conversation"
                  className="text-[var(--muted)] hover:text-[var(--text)] focus-ring rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <RotateCcw size={15} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close ChronoBot"
                className="text-[var(--muted)] hover:text-[var(--text)] focus-ring rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[var(--bg)] min-h-[220px]"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm bg-[var(--primary)] text-[var(--primary-fg)] whitespace-pre-line"
                      : "max-w-[90%] rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] whitespace-pre-line"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)]">
                  Thinking…
                </div>
              </div>
            )}

            {/* Starter prompts on fresh chat */}
            {messages.length === 1 && !sending && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => sendMessage(p)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors text-left focus-ring"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-2.5 border-t border-[var(--border)] bg-[var(--surface)] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about ChronoTriage…"
              maxLength={600}
              aria-label="Message ChronoBot"
              className="input flex-1 text-sm min-h-[40px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="btn-primary min-h-[40px] px-3 shrink-0"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
