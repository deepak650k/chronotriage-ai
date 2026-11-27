// lib/emailVerify.ts – Stateless HMAC-SHA256 OTP & verified-email tokens (Node server-only).
// Ensures reminder emails can ONLY be dispatched to addresses the user proved ownership
// of via a time-limited 6-digit email verification code, plus optional env allowlist.

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const VERIFIED_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface ChallengePayload {
  e: string; // normalized lowercase email
  x: number; // expiresAt unix ms
  s: string; // hex HMAC signature binding email + exp + otp
}

interface VerifiedPayload {
  e: string; // normalized lowercase email
  x: number; // expiresAt unix ms
  s: string; // hex HMAC signature binding purpose + email + exp
}

function getSecret(): string | null {
  const raw =
    process.env.EMAIL_VERIFY_SECRET?.trim() ||
    process.env.ZAPIER_WEBHOOK_URL?.trim();
  if (raw) return raw;
  if (process.env.NODE_ENV !== "production") {
    return "chronotriage-dev-verify-secret";
  }
  return null;
}

function signHmac(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks optional ALLOWED_REMINDER_EMAILS env allowlist (comma-separated).
 * Returns true if allowlist is unset/empty OR email is in the list.
 */
export function isEmailAllowlisted(email: string): boolean {
  const raw = process.env.ALLOWED_REMINDER_EMAILS?.trim();
  if (!raw) return true;
  const allowed = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.includes(normalizeEmail(email));
}

/**
 * Creates a 6-digit OTP code and an opaque HMAC-signed challengeToken.
 * The OTP itself is NOT stored inside the token, so clients cannot read it.
 */
export function createOtpChallenge(
  rawEmail: string,
  now = Date.now()
): { code: string; challengeToken: string; expiresInSeconds: number } | null {
  const secret = getSecret();
  if (!secret) return null;

  const email = normalizeEmail(rawEmail);
  const code = String(randomInt(100000, 1000000));
  const exp = now + OTP_TTL_MS;
  const sig = signHmac(secret, `otp:${email}:${exp}:${code}`);

  const payload: ChallengePayload = { e: email, x: exp, s: sig };
  const challengeToken = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );

  return {
    code,
    challengeToken,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  };
}

/**
 * Verifies a user-submitted 6-digit OTP against a challengeToken.
 * On success returns a signed verifiedToken bound to that exact email.
 */
export function confirmOtpChallenge(params: {
  email: string;
  code: string;
  challengeToken: string;
  now?: number;
}):
  | { ok: true; email: string; verifiedToken: string; expiresAt: number }
  | { ok: false; error: string } {
  const secret = getSecret();
  if (!secret) {
    return { ok: false, error: "Email verification is not configured on the server." };
  }

  const now = params.now ?? Date.now();
  const email = normalizeEmail(params.email);
  const code = params.code.trim();

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Please enter the 6-digit verification code." };
  }

  let payload: ChallengePayload;
  try {
    const json = Buffer.from(params.challengeToken, "base64url").toString("utf8");
    payload = JSON.parse(json) as ChallengePayload;
  } catch {
    return { ok: false, error: "Invalid verification request. Please request a new code." };
  }

  if (
    !payload ||
    typeof payload.e !== "string" ||
    typeof payload.x !== "number" ||
    typeof payload.s !== "string"
  ) {
    return { ok: false, error: "Invalid verification request. Please request a new code." };
  }

  if (payload.e !== email) {
    return { ok: false, error: "Email does not match the verification code requested." };
  }

  if (now > payload.x) {
    return { ok: false, error: "Verification code expired. Please request a new code." };
  }

  const expectedSig = signHmac(secret, `otp:${email}:${payload.x}:${code}`);
  if (!safeEqualHex(expectedSig, payload.s)) {
    return { ok: false, error: "Incorrect verification code. Please check and try again." };
  }

  const verifiedExp = now + VERIFIED_TTL_MS;
  const verifiedSig = signHmac(secret, `verified:${email}:${verifiedExp}`);
  const verifiedPayload: VerifiedPayload = {
    e: email,
    x: verifiedExp,
    s: verifiedSig,
  };
  const verifiedToken = Buffer.from(
    JSON.stringify(verifiedPayload),
    "utf8"
  ).toString("base64url");

  return {
    ok: true,
    email,
    verifiedToken,
    expiresAt: verifiedExp,
  };
}

/**
 * Validates that a reminder request carries a valid, non-expired verifiedToken
 * issued specifically for `email` (and passes any server allowlist).
 */
export function verifyEmailToken(
  rawEmail: string,
  verifiedToken: string,
  now = Date.now()
): { valid: true } | { valid: false; reason: string } {
  const email = normalizeEmail(rawEmail);

  if (!isEmailAllowlisted(email)) {
    return {
      valid: false,
      reason: "Reminders are restricted to approved email addresses.",
    };
  }

  const secret = getSecret();
  if (!secret || !verifiedToken) {
    return { valid: false, reason: "Email is not verified." };
  }

  let payload: VerifiedPayload;
  try {
    const json = Buffer.from(verifiedToken, "base64url").toString("utf8");
    payload = JSON.parse(json) as VerifiedPayload;
  } catch {
    return { valid: false, reason: "Invalid email verification token." };
  }

  if (
    !payload ||
    typeof payload.e !== "string" ||
    typeof payload.x !== "number" ||
    typeof payload.s !== "string"
  ) {
    return { valid: false, reason: "Invalid email verification token." };
  }

  if (payload.e !== email) {
    return { valid: false, reason: "Verified token belongs to a different email." };
  }

  if (now > payload.x) {
    return { valid: false, reason: "Email verification expired. Please re-verify in Settings." };
  }

  const expectedSig = signHmac(secret, `verified:${email}:${payload.x}`);
  if (!safeEqualHex(expectedSig, payload.s)) {
    return { valid: false, reason: "Invalid email verification signature." };
  }

  return { valid: true };
}
