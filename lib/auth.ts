// lib/auth.ts – Local browser authentication & session storage helpers (ready for future backend/Supabase swap)

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
  passwordHash: string; // "<hex-salt>:<hex-sha256>"
  createdAt: string;
}

const ACCOUNTS_KEY = "chronotriage:accounts:v1";
const SESSION_KEY = "chronotriage:session:v1";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashWithSalt(password: string, saltHex: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${saltHex}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return `${saltHex}:${toHex(new Uint8Array(digest))}`;
}

async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return hashWithSalt(password, toHex(salt));
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex] = storedHash.split(":");
  if (!saltHex) return false;
  const candidate = await hashWithSalt(password, saltHex);
  return candidate === storedHash;
}

function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
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

export function getSessionUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed || typeof parsed.email !== "string" || typeof parsed.name !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSessionUser(user: UserProfile): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
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

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Registers a new student profile in browser storage and signs them in. */
export async function registerAccount(params: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }> {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (!name) return { ok: false, error: "Please enter your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Please enter a valid email address." };
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

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

/** Authenticates an existing student account and saves the active session. */
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
    return { ok: false, error: "No account found for that email. Create an account first." };
  }

  const valid = await verifyPassword(password, match.passwordHash);
  if (!valid) {
    return { ok: false, error: "Incorrect password. Please try again." };
  }

  const user: UserProfile = {
    id: match.id,
    name: match.name,
    email: match.email,
    createdAt: match.createdAt,
  };
  saveSessionUser(user);
  return { ok: true, user };
}
