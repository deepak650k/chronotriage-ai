// lib/sanitize.ts – Input sanitisation helpers
// Strips HTML tags and limits string length to prevent XSS via stored data.
// All user-supplied strings (task titles, notes, names) pass through here
// before being saved.

/** Strips script/style blocks, HTML tags, event handlers, and js: URIs. */
export function stripHtml(raw: string): string {
  return raw
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, "") // remove remaining HTML tags
    .replace(/javascript:/gi, "") // remove js: protocol in attributes
    .replace(/on\w+\s*=/gi, "") // remove inline event handlers
    .trim();
}

/** Sanitises and truncates a string to maxLen characters. */
export function sanitizeText(raw: string, maxLen = 500): string {
  return stripHtml(raw).slice(0, maxLen);
}

/** Sanitises a task title: strip HTML, max 80 chars. */
export function sanitizeTitle(raw: string): string {
  return sanitizeText(raw, 80);
}

/** Sanitises notes: strip HTML, max 1000 chars. */
export function sanitizeNotes(raw: string): string {
  return sanitizeText(raw, 1000);
}

/** Sanitises a display name: strips HTML/control chars and limits to 60 chars. */
export function sanitizeName(raw: string): string {
  return stripHtml(raw)
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
