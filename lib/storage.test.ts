// lib/storage.test.ts – Unit tests for resilient localStorage handling (per-user isolation)

import { describe, it, expect, beforeEach } from "vitest";
import { defaultState, loadState, saveState, resetState, userKey, migrateGuestToUser } from "./storage";

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

describe("storage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockStorage(),
      writable: true,
      configurable: true,
    });
  });

  it("returns defaultState when storage is empty (guest slot)", () => {
    expect(loadState()).toEqual(defaultState());
  });

  it("returns defaultState when storage contains corrupt JSON", () => {
    localStorage.setItem("chronotriage:v1", "{bad json!!!");
    expect(loadState()).toEqual(defaultState());
  });

  it("returns defaultState when storage has wrong version", () => {
    localStorage.setItem("chronotriage:v1", JSON.stringify({ version: 99, tasks: [] }));
    expect(loadState()).toEqual(defaultState());
  });

  it("saves, loads, and resets valid state (guest slot)", () => {
    const s = defaultState();
    s.settings.weeklyCapacityHours = 15;
    saveState(s);
    expect(loadState().settings.weeklyCapacityHours).toBe(15);
    resetState();
    expect(loadState()).toEqual(defaultState());
  });

  it("user slots are isolated from each other and from guest slot", () => {
    const userA = "user-aaa";
    const userB = "user-bbb";

    const stateA = defaultState();
    stateA.settings.weeklyCapacityHours = 10;
    saveState(stateA, userA);

    const stateB = defaultState();
    stateB.settings.weeklyCapacityHours = 30;
    saveState(stateB, userB);

    const guestState = defaultState();
    guestState.settings.weeklyCapacityHours = 5;
    saveState(guestState);

    expect(loadState(userA).settings.weeklyCapacityHours).toBe(10);
    expect(loadState(userB).settings.weeklyCapacityHours).toBe(30);
    expect(loadState().settings.weeklyCapacityHours).toBe(5);
  });

  it("userKey returns a stable namespaced key", () => {
    expect(userKey("abc123")).toBe("chronotriage:user:abc123:v1");
  });

  it("migrateGuestToUser copies guest tasks into new user slot and clears guest slot", () => {
    const guest = defaultState();
    guest.tasks = [{ id: "t1", title: "Essay", course: "English", dueDate: "2025-12-01", estimatedHours: 3, importance: 7, status: "todo", dependsOn: [], notes: "", userOverride: null, createdAt: new Date().toISOString() }];
    saveState(guest);

    migrateGuestToUser("user-new");

    const migrated = loadState("user-new");
    expect(migrated.tasks).toHaveLength(1);
    expect(migrated.tasks[0].id).toBe("t1");

    // Guest slot should be cleared after migration
    expect(loadState().tasks).toHaveLength(0);
  });

  it("migrateGuestToUser does NOT overwrite existing user data", () => {
    const userState = defaultState();
    userState.settings.weeklyCapacityHours = 42;
    saveState(userState, "existing-user");

    const guest = defaultState();
    guest.tasks = [{ id: "g1", title: "Guest task", course: "Math", dueDate: "2025-12-10", estimatedHours: 2, importance: 5, status: "todo", dependsOn: [], notes: "", userOverride: null, createdAt: new Date().toISOString() }];
    saveState(guest);

    migrateGuestToUser("existing-user");

    // User's data unchanged
    expect(loadState("existing-user").settings.weeklyCapacityHours).toBe(42);
    expect(loadState("existing-user").tasks).toHaveLength(0);
    // Guest slot still there (not cleared since migration was skipped)
    expect(loadState().tasks).toHaveLength(1);
  });
});
