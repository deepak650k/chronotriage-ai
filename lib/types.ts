// lib/types.ts – All shared TypeScript types. No `any` allowed.

export type Status = "todo" | "in_progress" | "done" | "skipped";
export type Category = "must" | "later" | "skip";

export interface Task {
  id: string;             // crypto.randomUUID()
  title: string;          // 1–80 chars
  course: string;         // optional label, may be ""
  dueDate: string;        // "YYYY-MM-DD" local date
  estimatedHours: number; // 0.5–40, step 0.5
  importance: number;     // integer 1–10
  status: Status;
  dependsOn: string[];    // ids of prerequisite tasks
  notes: string;
  userOverride: Category | null;
  createdAt: string;      // ISO timestamp
}

export interface Settings {
  weeklyCapacityHours: number; // default 20, range 1–80
  dailyStudyHours: number;     // default 3, range 0.5–16
  reminderEmail: string;       // "" when not set
  verifiedReminderEmail?: string; // normalized lowercase email that passed OTP check
  verifiedEmailToken?: string;    // HMAC-signed verification token from /api/reminders/verify
  voiceEnabled: boolean;       // default true
  theme: "light" | "dark" | "system";
}

export interface TriageResult {
  taskId: string;
  days: number;          // days until due, negative if overdue
  urgency: number;
  score: number;         // rounded to 1 decimal for display
  suggested: Category;
  category: Category;    // override applied
  overridden: boolean;
  weekOverloaded: boolean;
  hasDependents: boolean;
  reason: string;
}

export interface AppState {
  version: 1;
  tasks: Task[];
  settings: Settings;
}

// Action union for useReducer
export type AppAction =
  | { type: "HYDRATE"; state: AppState }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; task: Task }
  | { type: "DELETE_TASK"; id: string }
  | { type: "SET_STATUS"; id: string; status: Status }
  | { type: "SET_OVERRIDE"; id: string; category: Category | null }
  | { type: "UPDATE_SETTINGS"; settings: Partial<Settings> }
  | { type: "LOAD_DEMO"; tasks: Task[] }
  | { type: "RESET" };
