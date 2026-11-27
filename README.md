# ChronoTriage AI

ChronoTriage AI is a calm deadline and priority calendar web app for students. Instead of showing every deadline with equal weight, it reads each task's due date, estimated hours, and importance, then labels it **Must Do**, **Schedule Later**, or **Safe to Skip** with a plain-language reason. You stay in control at all times: every label can be overridden, and skipping requires your explicit click with instant undo.

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in optional secrets/URLs
npm run dev                  # http://localhost:3000
npm run test                 # run Vitest unit tests
npm run typecheck            # run tsc --noEmit
npm run lint                 # run ESLint
```

## How Scoring Works

Triage labels are computed deterministically in [`lib/triage.ts`](lib/triage.ts):

`score = (Urgency * Importance) / (1 + estimatedHours / 4)`

- **Urgency (U):** `<= 1` day (or overdue) = `10`, `2–3` days = `8`, `4–7` days = `6`, `8–14` days = `4`, `15+` days = `2`.
- **Must Do:** due in `<= 1` day with importance `>= 5` (hard rule), OR `score >= 20`.
- **Safe to Skip** (only when ALL four hold): `score < 8`, `importance <= 3`, no open task depends on it, and its ISO week's planned hours exceed `weeklyCapacityHours`.
- **Schedule Later:** conservative default for everything else.

## Environment Variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `ZAPIER_WEBHOOK_URL` | Server | Catch Hook URL for Gmail daily reminders (`/api/reminders`) |
| `NEXT_PUBLIC_BOTPRESS_INJECT_URL` | Public | Botpress Webchat script URL |
| `NEXT_PUBLIC_BOTPRESS_CONFIG_URL` | Public | Botpress Webchat config script URL |
| `ELEVENLABS_API_KEY` | Server | ElevenLabs API key for voice briefing (`/api/briefing`, stretch) |
| `ELEVENLABS_VOICE_ID` | Server | ElevenLabs voice ID (`/api/briefing`, stretch) |
| `LLM_API_KEY` | Server | Optional Google Gemini API key for rewriting reasons (`/api/explain`, stretch) |

## Deployment & Integrations

- **Vercel:** Push to GitHub, import repo in Vercel, add the environment variables above in Project Settings, and deploy.
- **Zapier:** Create a Catch Hook trigger -> Gmail Send Email action mapping `email`, `date`, `mustDo`, `skipSuggestions`, and `loadRatio`.
- **Botpress:** Create ChronoBot using the Webchat channel (not Viber), paste persona + KB from `docs/BOTPRESS.md`, publish, and set both `NEXT_PUBLIC_BOTPRESS_*` variables.

## Limitations & Team Roles

- **Privacy & limitations:** Tasks are stored locally in your browser (`chronotriage:v1`). Triage is advice from a simple rule and cannot know your syllabus or grading policies.
- **Team:** Member 1 (Frontend & UX Lead), Member 2 (AI Logic & Automation Lead), Member 3 (Integration, Testing & Deployment Lead).
