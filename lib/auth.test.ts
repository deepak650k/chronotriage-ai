// lib/auth.test.ts – Unit tests for salted local account registration & login

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAccount,
  loginAccount,
  getSessionUser,
  clearSessionUser,
} from "./auth";

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

describe("auth", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockStorage(),
      writable: true,
      configurable: true,
    });
  });

  it("registers a student account, stores a salted hash, and sets active session", async () => {
    const res = await registerAccount({
      name: "Aarav",
      email: "Aarav@College.edu",
      password: "study-pass-123",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.user.email).toBe("aarav@college.edu");
      expect(getSessionUser()?.name).toBe("Aarav");
    }

    const rawAccounts = localStorage.getItem("chronotriage:accounts:v1") ?? "";
    expect(rawAccounts).not.toContain("study-pass-123");
  });

  it("rejects duplicate emails and wrong passwords, accepts valid login", async () => {
    await registerAccount({
      name: "Maya",
      email: "maya@college.edu",
      password: "password123",
    });

    const dup = await registerAccount({
      name: "Maya",
      email: "maya@college.edu",
      password: "password123",
    });
    expect(dup.ok).toBe(false);

    clearSessionUser();
    expect(getSessionUser()).toBeNull();

    const wrong = await loginAccount({
      email: "maya@college.edu",
      password: "wrong-password",
    });
    expect(wrong.ok).toBe(false);

    const ok = await loginAccount({
      email: "maya@college.edu",
      password: "password123",
    });
    expect(ok.ok).toBe(true);
    expect(getSessionUser()?.email).toBe("maya@college.edu");
  });
});
