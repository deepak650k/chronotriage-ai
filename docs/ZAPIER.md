# Zapier Integration — Daily Email Reminder

ChronoTriage AI sends today's priority plan to your inbox via a Zapier **Catch Hook → Gmail** workflow. This doc walks you through the full setup in under 10 minutes.

---

## Overview

```
ChronoTriage /api/reminders  →  Zapier Catch Hook  →  Gmail: Send Email
```

The app POSTs a JSON payload (see below) to your Zapier webhook URL. Zapier maps the fields into a styled email and sends it to your address.

---

## 1 — Create a Zap

1. Go to [zapier.com](https://zapier.com) and click **+ Create → Zap**.
2. Name it **ChronoTriage Daily Brief**.

---

## 2 — Set Up the Trigger: Webhooks by Zapier → Catch Hook

1. Search for **Webhooks by Zapier** as the trigger app.
2. Choose **Catch Hook** as the event.
3. Click **Continue** — Zapier shows you a webhook URL like:
   ```
   https://hooks.zapier.com/hooks/catch/1234567/abcde12/
   ```
4. **Copy that URL** — you'll paste it into your `.env.local` as `ZAPIER_WEBHOOK_URL`.
5. Test the trigger by sending a sample payload (see [§4](#4--test-payload) below).

---

## 3 — Set Up the Action: Gmail → Send Email

1. Add an **Action**, search for **Gmail**, choose **Send Email**.
2. Connect your Google account (allow Gmail send permission).
3. Fill in the fields using Zapier's dynamic **data pills** from the webhook body:

| Gmail Field | Value |
|---|---|
| **To** | `{{email}}` |
| **Subject** | `ChronoTriage — your plan for {{date}}` |
| **Body Type** | HTML |
| **Body** | Paste the template from [§5](#5--email-template) below |

4. Click **Continue → Publish Zap**.

---

## 4 — Test Payload

Send this JSON to your webhook URL with `curl` to let Zapier learn the field names:

```bash
curl -X POST "https://hooks.zapier.com/hooks/catch/YOUR_ID/YOUR_HOOK/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "date": "Mon 27 Jan 2025",
    "mustDo": [
      { "title": "CS101 Lab Report", "dueDate": "2025-01-28", "reason": "Due tomorrow — high importance." }
    ],
    "skipSuggestions": [
      { "title": "Extra reading", "dueDate": "2025-02-10", "reason": "Low priority, 3 weeks away, week is packed." }
    ],
    "loadRatio": 0.72
  }'
```

After sending, click **Test trigger** in Zapier — it should detect all six fields.

---

## 5 — Email Template

Paste this into the Gmail **Body (HTML)** field:

```html
<div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 600px; margin: auto; color: #1a1a2e;">
  <h2 style="margin:0 0 4px 0; font-size:20px;">📅 ChronoTriage — {{date}}</h2>
  <p style="margin:0 0 20px 0; color:#666; font-size:13px;">
    Load ratio: <strong>{{loadRatio}}×</strong> capacity
  </p>

  <h3 style="color:#c0392b; margin:0 0 8px 0;">🔴 Must Do</h3>
  <ul style="margin:0 0 20px 0; padding-left:20px;">
    {{#each mustDo}}
    <li style="margin-bottom:6px;">
      <strong>{{title}}</strong> — due {{dueDate}}<br>
      <span style="color:#555; font-size:13px;">{{reason}}</span>
    </li>
    {{/each}}
  </ul>

  <h3 style="color:#27ae60; margin:0 0 8px 0;">🟢 Safe to Skip</h3>
  <ul style="margin:0 0 20px 0; padding-left:20px;">
    {{#each skipSuggestions}}
    <li style="margin-bottom:6px;">
      <strong>{{title}}</strong><br>
      <span style="color:#555; font-size:13px;">{{reason}}</span>
    </li>
    {{/each}}
  </ul>

  <hr style="border:none; border-top:1px solid #eee; margin:16px 0;">
  <p style="font-size:11px; color:#999;">
    Sent by ChronoTriage AI · Tasks are stored only in your browser.
    You control every label — open the app to override or update.
  </p>
</div>
```

> **Note:** Zapier's HTML template uses `{{#each}}` for arrays only when the **Code by Zapier** action is used. For plain Gmail action, map `mustDo` as a **line-item** formatter, or use **Formatter → Utilities → Line-item to Text** step to join the array before the Gmail step.

---

## 6 — Add the URL to Your App

Add the copied webhook URL to your `.env.local`:

```env
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/1234567/abcde12/
```

Restart `npm run dev`. The **Send Reminder** button on the Dashboard will now be fully functional.

---

## 7 — Optional: Schedule Daily Trigger with Zapier

If you want the reminder emailed automatically every morning (not just on button click):

1. Create a **second Zap**: Schedule by Zapier → Catch Hour → Gmail.
2. Set the trigger to **Every day at 08:00** in your timezone.
3. Use a **Code by Zapier** action to fetch from your Vercel deployment:
   ```js
   const res = await fetch("https://your-app.vercel.app/api/reminders", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(inputData)
   });
   output = { ok: res.ok };
   ```
   This requires storing `email` in Zapier storage or passing it as a static value.

> This is a stretch feature — the core "Send Reminder" button in the dashboard covers the MVP use case.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Reminders are not configured" (503) | `ZAPIER_WEBHOOK_URL` env var is missing or empty |
| "Reminder service failed" (502) | Zapier hook URL is wrong or the Zap is off |
| "Slow down a little" (429) | Rate limit hit (20 req/min per IP) — wait a minute |
| Email body shows raw `{{...}}` | Use Code by Zapier to format array fields |
| Gmail connection error | Re-connect Gmail account in Zapier → Connected Accounts |
