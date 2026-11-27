// lib/storage.ts – localStorage wrapper with per-user data isolation.
// Each signed-in user's data lives at "chronotriage:user:<userId>:v1".
// Unauthenticated / guest data stays at the legacy "chronotriage:v1" key.
// All public functions accept an optional userId so the caller decides the slot.

import type { AppState, Settings } from "./types";

/** The guest / anonymous data key (unchanged for backward compatibility). */
const GUEST_KEY = "chronotriage:v1";

/** Returns the localStorage key for a signed-in user's data. */
export function userKey(userId: string): string {
  return `chronotriage:user:${userId}:v1`;
}

/** Returns the active storage key: per-user when userId is provided, guest otherwise. */
function activeKey(userId?: string): string {
  return userId ? userKey(userId) : GUEST_KEY;
}

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

/** Loads app state for the given user (or guest if no userId). */
export function loadState(userId?: string): AppState {
  try {
    const raw = localStorage.getItem(activeKey(userId));
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    return parsed && parsed.version === 1 ? parsed : defaultState();
  } catch {
    return defaultState();
  }
}

/** Persists app state for the given user (or guest if no userId). */
export function saveState(s: AppState, userId?: string): void {
  try {
    localStorage.setItem(activeKey(userId), JSON.stringify(s));
  } catch {
    // quota exceeded or private mode – silently ignore
  }
}

/** Clears app state for the given user (or guest if no userId). */
export function resetState(userId?: string): void {
  try {
    localStorage.removeItem(activeKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Migrates guest tasks into a newly-registered user's slot if the user has no
 * data yet, then clears the guest slot. Safe to call multiple times.
 */
export function migrateGuestToUser(userId: string): void {
  try {
    const userSlot = localStorage.getItem(userKey(userId));
    if (userSlot) return; // User already has saved data – do not overwrite.

    const guestRaw = localStorage.getItem(GUEST_KEY);
    if (!guestRaw) return; // Nothing to migrate.

    const guest = JSON.parse(guestRaw) as AppState;
    if (!guest || guest.version !== 1 || guest.tasks.length === 0) return;

    // Copy guest tasks into user's slot, preserve settings defaults.
    const userState: AppState = {
      ...guest,
      settings: { ...defaultSettings(), theme: guest.settings?.theme ?? "system" },
    };
    localStorage.setItem(userKey(userId), JSON.stringify(userState));
    localStorage.removeItem(GUEST_KEY); // Guest slot cleaned up after migration.
  } catch {
    // Migration is best-effort; never block registration on errors.
  }
}
