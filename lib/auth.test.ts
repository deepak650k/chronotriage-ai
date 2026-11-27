// lib/auth.test.ts – Unit tests for hardened local account registration, lockout & session TTL

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAccount,
  loginAccount,
  getSessionUser,
  clearSessionUser,
  validatePasswordStrength,
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

const STRONG_PASS = "StudyPass123!";

describe("auth", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockStorage(),
      writable: true,
      configurable: true,
    });
  });

  it("enforces password strength requirements", () => {
    expect(validatePasswordStrength("short")).toContain("8 characters");
    expect(validatePasswordStrength("alllowercase1!")).toContain("uppercase");
    expect(validatePasswordStrength("ALLUPPERCASE1!")).toContain("lowercase");
    expect(validatePasswordStrength("NoNumbersHere!")).toContain("number");
    expect(validatePasswordStrength("NoSpecial123")).toContain("special character");
    expect(validatePasswordStrength(STRONG_PASS)).toBeNull();
  });

  it("registers a student account with PBKDF2 hash and sets active session", async () => {
    const res = await registerAccount({
      name: "  Aarav <script>alert(1)</script> ",
      email: "Aarav@College.edu",
      password: STRONG_PASS,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.user.email).toBe("aarav@college.edu");
      expect(res.user.name).toBe("Aarav");
      expect(getSessionUser()?.email).toBe("aarav@college.edu");
    }

    const rawAccounts = localStorage.getItem("chronotriage:accounts:v1") ?? "";
    expect(rawAccounts).not.toContain(STRONG_PASS);
    expect(rawAccounts).toContain("pbkdf2$100000$");
  });

  it("rejects duplicate emails and locks account after 5 failed attempts", async () => {
    await registerAccount({
      name: "Maya",
      email: "maya@college.edu",
      password: STRONG_PASS,
    });

    const dup = await registerAccount({
      name: "Maya",
      email: "maya@college.edu",
      password: STRONG_PASS,
    });
    expect(dup.ok).toBe(false);

    clearSessionUser();
    expect(getSessionUser()).toBeNull();

    for (let i = 0; i < 4; i++) {
      const wrong = await loginAccount({
        email: "maya@college.edu",
        password: "WrongPassword1!",
      });
      expect(wrong.ok).toBe(false);
    }

    const fifth = await loginAccount({
      email: "maya@college.edu",
      password: "WrongPassword1!",
    });
    expect(fifth.ok).toBe(false);
    if (!fifth.ok) {
      expect(fifth.error).toContain("locked");
    }

    // Even the right password must be rejected while locked
    const whileLocked = await loginAccount({
      email: "maya@college.edu",
      password: STRONG_PASS,
    });
    expect(whileLocked.ok).toBe(false);
    if (!whileLocked.ok) {
      expect(whileLocked.error).toContain("Account locked");
    }
  });

  it("expires sessions older than TTL", async () => {
    await registerAccount({
      name: "Riya",
      email: "riya@college.edu",
      password: STRONG_PASS,
    });
    expect(getSessionUser()?.email).toBe("riya@college.edu");

    // Simulate expired session timestamp
    const raw = JSON.parse(localStorage.getItem("chronotriage:session:v1") ?? "{}");
    raw.expiresAt = Date.now() - 1000;
    localStorage.setItem("chronotriage:session:v1", JSON.stringify(raw));

    expect(getSessionUser()).toBeNull();
    expect(localStorage.getItem("chronotriage:session:v1")).toBeNull();
  });
});
