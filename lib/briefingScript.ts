// lib/briefingScript.ts – Shared deterministic script builder (< 600 chars) for voice briefing

export interface BriefingPayload {
  mustDoTitles: string[];
  loadRatio: number;
  skipTitle?: string;
  firstName?: string;
}

export function buildBriefingScript(data: BriefingPayload): string {
  const { mustDoTitles, loadRatio, skipTitle, firstName } = data;
  const n = mustDoTitles.length;
  const percent = Math.round(loadRatio * 100);

  const greetingPart = firstName
    ? `Good morning, ${firstName}.`
    : "Good morning.";

  const mustPart =
    n === 0
      ? "You have no urgent must-do tasks today."
      : `You have ${n} must-do task${n === 1 ? "" : "s"} today. Top priority: ${mustDoTitles[0]}${
          mustDoTitles[1] ? ` and ${mustDoTitles[1]}` : ""
        }.`;

  const loadPart = `This week is at ${percent} percent of your capacity${
    loadRatio > 1 ? ", so things are tight." : " and looks manageable."
  }`;

  const skipPart = skipTitle
    ? ` One thing you could safely drop is ${skipTitle}.`
    : "";

  const full = `${greetingPart} ${mustPart} ${loadPart}${skipPart} You are in control. Have a great day.`;
  return full.slice(0, 600);
}
