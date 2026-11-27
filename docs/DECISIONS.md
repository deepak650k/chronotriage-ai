# Architecture & Implementation Decisions

## 1. Dependencies beyond Section 2
- `clsx` and `tailwind-merge` are used in `lib/utils.ts` for clean conditional Tailwind class merging (`cn()`).
- `@vitest/globals` is not required; Vitest runs with explicit imports from `vitest`.

## 2. Theme & CSS Tokens
- Light and dark mode CSS custom properties (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--primary`, `--must`, `--must-bg`, `--later`, `--later-bg`, `--skip`, `--skip-bg`, `--focus`) are defined in `app/globals.css`.
- Dark mode activates when `.dark` is set on `<html>` (synced by `AppProvider` from `settings.theme`: `"light"`, `"dark"`, or `"system"`).

## 3. Storage & Hydration
- `lib/storage.ts` reads `chronotriage:v1` only inside `useEffect` in `AppProvider` so SSR and client initial renders match without hydration errors.
- If `localStorage` is blocked, empty, corrupt JSON, or has a different `version`, `loadState()` silently returns `defaultState()`.

## 4. API Rate Limiting
- API routes (`/api/reminders`, `/api/briefing`, `/api/explain`) enforce a best-effort in-memory rate limit (~20 requests per minute per IP). Note that in serverless deployments (Vercel), separate function instances do not share memory, so this rate limit is per-instance best-effort.

## 5. LLM Explanations (`/api/explain`, Stretch)
- Uses the Google Gemini API (`gemini-2.5-flash` via `generativelanguage.googleapis.com`) when `LLM_API_KEY` is configured on the server, with a 4-second abort timeout.
- Never alters the deterministic category computed by `lib/triage.ts`. Silently falls back to the deterministic template sentence from `lib/reasons.ts` if `LLM_API_KEY` is missing, times out, or fails.

## 6. Calendar Week Load vs Dashboard Week Load
- Both `triage.ts` and the Dashboard `LoadMeter` compute the current ISO week's hours using `startOfISOWeek` (`weekKeyOf`). Overdue tasks are additionally included in Week 1 of the 4-week Forecast (`lib/forecast.ts`) as specified in Section 7.
