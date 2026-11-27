// lib/storage.test.ts – Unit tests for resilient localStorage handling

import { describe, it, expect, beforeEach } from "vitest";
import { defaultState, loadState, saveState, resetState } from "./storage";

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
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

  it("returns defaultState when storage is empty", () => {
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

  it("saves, loads, and resets valid state", () => {
    const s = defaultState();
    s.settings.weeklyCapacityHours = 15;
    saveState(s);
    expect(loadState().settings.weeklyCapacityHours).toBe(15);
    resetState();
    expect(loadState()).toEqual(defaultState());
  });
});
