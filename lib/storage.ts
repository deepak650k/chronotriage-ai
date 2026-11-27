// lib/storage.ts – localStorage wrapper. Keep interface identical for future Supabase swap.

import type { AppState, Settings } from "./types";

const KEY = "chronotriage:v1";

export function defaultSettings(): Settings {
  return {
    weeklyCapacityHours: 20,
    dailyStudyHours: 3,
    reminderEmail: "",
    voiceEnabled: true,
    theme: "system",
  };
}

export function defaultState(): AppState {
  return { version: 1, tasks: [], settings: defaultSettings() };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    return parsed && parsed.version === 1 ? parsed : defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // quota exceeded or private mode – silently ignore
  }
}

export function resetState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
