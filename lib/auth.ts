// lib/auth.ts – Local browser authentication & session storage helpers
// Security hardening:
//   • Passwords: 8+ chars, upper + lower + digit + special char required
//   • Key stretching: PBKDF2-HMAC-SHA256 (100,000 iterations, 16-byte random salt)
//     with backward-compatible verification for legacy salted SHA-256 accounts
//   • Brute-force lockout: 5 failed attempts → 15-minute block per account
//   • Sessions: expire after 8 hours (auto-logout on next load)

import { sanitizeName } from "./sanitize";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // "pbkdf2$100000$<salt>$<hash>" or legacy "<salt>:<sha256>"
  createdAt: string;
  failedAttempts: number;
  lockedUntil: number | null; // Unix ms, null if not locked
}

interface StoredSession {
  user: UserProfile;
  expiresAt: number; // Unix ms
}

// ── Constants ──────────────────────────────────────────────────────────────────
const ACCOUNTS_KEY = "chronotriage:accounts:v1";
const SESSION_KEY = "chronotriage:session:v1";
const PBKDF2_ITERATIONS = 100_000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// ── Crypto helpers ─────────────────────────────────────────────────────────────
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function legacyHashWithSalt(password: string, saltHex: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${saltHex}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return `${saltHex}:${toHex(new Uint8Array(digest))}`;
}

async function pbkdf2Hash(
  password: string,
  saltHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromHex(saltHex),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return `pbkdf2$${iterations}$${saltHex}$${toHex(new Uint8Array(bits))}`;
}

async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return pbkdf2Hash(password, toHex(salt), PBKDF2_ITERATIONS);
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("pbkdf2$")) {
    const [, iterStr, saltHex] = storedHash.split("$");
    const iterations = Number(iterStr);
    if (!saltHex || !Number.isFinite(iterations) || iterations < 10_000) return false;
    const candidate = await pbkdf2Hash(password, saltHex, iterations);
    return timingSafeEqual(candidate, storedHash);
  }
  const [saltHex] = storedHash.split(":");
  if (!saltHex) return false;
  const candidate = await legacyHashWithSalt(password, saltHex);
  return timingSafeEqual(candidate, storedHash);
}

// ── Storage helpers ────────────────────────────────────────────────────────────
function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Back-fill security fields for accounts created before this version
    return (parsed as StoredAccount[]).map((a) => ({
      ...a,
      failedAttempts: a.failedAttempts ?? 0,
      lockedUntil: a.lockedUntil ?? null,
    }));
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore quota errors
  }
}

// ── Session ────────────────────────────────────────────────────────────────────
export function getSessionUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.user || typeof parsed.user.email !== "string") return null;
    // Auto-expire sessions older than SESSION_TTL_MS
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.user;
  } catch {
    return null;
  }
}

function saveSessionUser(user: UserProfile): void {
  try {
    const session: StoredSession = {
      user,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearSessionUser(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ── Validation ─────────────────────────────────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Returns null if the password is strong enough, or an error message. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8)
    return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password))
    return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password))
    return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include at least one special character (e.g. @, #, !).";
  return null;
}

// ── Lockout helpers ────────────────────────────────────────────────────────────
function recordFailedAttempt(
  email: string
): { locked: boolean; remainingMs: number; attempts: number } {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.email === email);
  if (idx === -1) return { locked: false, remainingMs: 0, attempts: 0 };

  const account = accounts[idx];
  const expiredLock = account.lockedUntil !== null && Date.now() >= account.lockedUntil;
  const attempts = (expiredLock ? 0 : account.failedAttempts ?? 0) + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;
  accounts[idx] = { ...account, failedAttempts: attempts, lockedUntil };
  saveAccounts(accounts);

  return {
    locked: lockedUntil !== null,
    remainingMs: lockedUntil ? LOCKOUT_MS : 0,
    attempts,
  };
}

function finalizeSuccessfulLogin(email: string, upgradedHash?: string): void {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.email === email);
  if (idx === -1) return;
  accounts[idx] = {
    ...accounts[idx],
    failedAttempts: 0,
    lockedUntil: null,
    ...(upgradedHash ? { passwordHash: upgradedHash } : {}),
  };
  saveAccounts(accounts);
}

function getLockoutInfo(account: StoredAccount): { locked: boolean; remainingMs: number } {
  if (!account.lockedUntil) return { locked: false, remainingMs: 0 };
  const remaining = account.lockedUntil - Date.now();
  if (remaining <= 0) return { locked: false, remainingMs: 0 };
  return { locked: true, remainingMs: remaining };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Registers a new student profile in browser storage and signs them in. */
export async function registerAccount(params: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }> {
  const name = sanitizeName(params.name);
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (!name) return { ok: false, error: "Please enter your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Please enter a valid email address." };

  const pwError = validatePasswordStrength(password);
  if (pwError) return { ok: false, error: pwError };

  const accounts = loadAccounts();
  if (accounts.some((a) => a.email === email)) {
    return { ok: false, error: "An account with this email already exists. Try signing in." };
  }

  const account: StoredAccount = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null,
  };

  saveAccounts([...accounts, account]);
  const user: UserProfile = {
    id: account.id,
    name: account.name,
    email: account.email,
    createdAt: account.createdAt,
  };
  saveSessionUser(user);
  return { ok: true, user };
}

/** Authenticates an existing student account; enforces lockout + session TTL. */
export async function loginAccount(params: {
  email: string;
  password: string;
}): Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (!isValidEmail(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!password) return { ok: false, error: "Please enter your password." };

  const accounts = loadAccounts();
  const match = accounts.find((a) => a.email === email);
  if (!match) {
    // Generic message to avoid user enumeration
    return { ok: false, error: "Incorrect email or password. Please try again." };
  }

  // Check lockout before attempting crypto
  const lockInfo = getLockoutInfo(match);
  if (lockInfo.locked) {
    const mins = Math.ceil(lockInfo.remainingMs / 60_000);
    return {
      ok: false,
      error: `Account locked after too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
    };
  }

  const valid = await verifyPassword(password, match.passwordHash);
  if (!valid) {
    const { locked, remainingMs, attempts } = recordFailedAttempt(email);
    if (locked) {
      const mins = Math.ceil(remainingMs / 60_000);
      return {
        ok: false,
        error: `Too many failed attempts. Account locked for ${mins} minute${mins !== 1 ? "s" : ""}.`,
      };
    }
    const left = MAX_ATTEMPTS - attempts;
    return {
      ok: false,
      error: `Incorrect password. ${left > 0 ? `${left} attempt${left !== 1 ? "s" : ""} remaining before lockout.` : "Account is now locked."}`,
    };
  }

  const upgradedHash = !match.passwordHash.startsWith("pbkdf2$")
    ? await hashPassword(password)
    : undefined;
  finalizeSuccessfulLogin(email, upgradedHash);

  const user: UserProfile = {
    id: match.id,
    name: match.name,
    email: match.email,
    createdAt: match.createdAt,
  };
  saveSessionUser(user);
  return { ok: true, user };
}

