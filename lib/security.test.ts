// lib/security.test.ts – Unit tests for XSS sanitization and CSRF origin checks

import { describe, it, expect } from "vitest";
import { sanitizeTitle, sanitizeNotes, sanitizeName } from "./sanitize";
import { isCsrfBlocked } from "./rateLimit";

describe("sanitize", () => {
  it("strips HTML tags, inline handlers, and javascript: URIs from titles and notes", () => {
    expect(sanitizeTitle('<script>alert(1)</script>Math Homework')).toBe("Math Homework");
    expect(sanitizeTitle('<img src=x onerror="evil()">Quiz')).toBe("Quiz");
    expect(sanitizeNotes("Check javascript:alert(1) and <b>bold</b>")).toBe(
      "Check alert(1) and bold"
    );
  });

  it("caps length for title and notes", () => {
    expect(sanitizeTitle("A".repeat(120)).length).toBe(80);
    expect(sanitizeNotes("B".repeat(1500)).length).toBe(1000);
  });

  it("preserves Unicode letters while stripping HTML in names", () => {
    expect(sanitizeName("  Priya   <b>Sharma</b> ")).toBe("Priya Sharma");
  });
});

describe("isCsrfBlocked", () => {
  it("allows requests with the custom app header or matching origin", () => {
    const withHeader = new Request("https://chronotriage-ai.vercel.app/api/chat", {
      method: "POST",
      headers: { "x-chronotriage-client": "1" },
    });
    expect(isCsrfBlocked(withHeader)).toBe(false);

    const sameOrigin = new Request("https://chronotriage-ai.vercel.app/api/chat", {
      method: "POST",
      headers: { origin: "https://chronotriage-ai.vercel.app" },
    });
    expect(isCsrfBlocked(sameOrigin)).toBe(false);

    const localhostOrigin = new Request("http://localhost:3030/api/chat", {
      method: "POST",
      headers: { origin: "http://localhost:3030" },
    });
    expect(isCsrfBlocked(localhostOrigin)).toBe(false);
  });

  it("blocks cross-origin or missing-origin POST requests", () => {
    const evilOrigin = new Request("https://chronotriage-ai.vercel.app/api/chat", {
      method: "POST",
      headers: { origin: "https://evil-phishing.example.com" },
    });
    expect(isCsrfBlocked(evilOrigin)).toBe(true);

    const noOrigin = new Request("https://chronotriage-ai.vercel.app/api/chat", {
      method: "POST",
    });
    expect(isCsrfBlocked(noOrigin)).toBe(true);
  });
});
