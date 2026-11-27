// lib/context.tsx – AppProvider: global state via useReducer + localStorage + theme sync

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import type { AppState, AppAction, Task, Settings, TriageResult } from "./types";
import { defaultState, loadState, saveState, resetState, migrateGuestToUser } from "./storage";
import {
  getSessionUser,
  clearSessionUser,
  loginAccount,
  registerAccount,
  type UserProfile,
} from "./auth";
import { triage } from "./triage";
import { createDemoTasks } from "./demoData";

interface StoreState {
  app: AppState;
  isLoaded: boolean;
  today: Date | null;
  user: UserProfile | null;
}

type StoreAction =
  | (AppAction & { user?: UserProfile | null })
  | { type: "SET_USER"; user: UserProfile | null };

function reducer(store: StoreState, action: StoreAction): StoreState {
  const state = store.app;
  switch (action.type) {
    case "HYDRATE":
      return {
        app: action.state,
        isLoaded: true,
        today: new Date(),
        user: action.user ?? null,
      };
    case "SET_USER":
      return { ...store, user: action.user };
    case "ADD_TASK":
      return { ...store, app: { ...state, tasks: [...state.tasks, action.task] } };
    case "UPDATE_TASK":
      return {
        ...store,
        app: {
          ...state,
          tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
        },
      };
    case "DELETE_TASK":
      return {
        ...store,
        app: { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) },
      };
    case "SET_STATUS":
      return {
        ...store,
        app: {
          ...state,
          tasks: state.tasks.map((t) =>
            t.id === action.id ? { ...t, status: action.status } : t
          ),
        },
      };
    case "SET_OVERRIDE":
      return {
        ...store,
        app: {
          ...state,
          tasks: state.tasks.map((t) =>
            t.id === action.id ? { ...t, userOverride: action.category } : t
          ),
        },
      };
    case "UPDATE_SETTINGS":
      return {
        ...store,
        app: { ...state, settings: { ...state.settings, ...action.settings } },
      };
    case "LOAD_DEMO":
      return {
        ...store,
        app: { ...state, tasks: [...state.tasks, ...action.tasks] },
      };
    case "RESET":
      return { ...store, app: defaultState() };
    default:
      return store;
  }
}

interface AppContextValue {
  state: AppState;
  triageResults: Map<string, TriageResult>;
  dispatch: React.Dispatch<AppAction>;
  loadDemo: () => number;
  reset: () => void;
  addTask: (task: Omit<Task, "id" | "createdAt">) => Task;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  user: UserProfile | null;
  login: (
    email: string,
    password: string,
    useForReminders?: boolean
  ) => Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    useForReminders?: boolean
  ) => Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }>;
  logout: () => void;
  isLoaded: boolean;
  today: Date | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [store, dispatch] = useReducer(reducer, null, () => ({
    app: defaultState(),
    isLoaded: false,
    today: null,
    user: null,
  }));
  const { app: state, isLoaded, today, user } = store;

  // Load from storage on mount (client only) to avoid SSR/client hydration mismatch
  useEffect(() => {
    const sessionUser = getSessionUser();
    // Load the correct data slot for the user (or guest slot if no session)
    const loaded = loadState(sessionUser?.id);
    dispatch({ type: "HYDRATE", state: loaded, user: sessionUser });
  }, []);

  // Save to storage whenever state changes (after initial load)
  // Always write to the slot that matches whoever is currently signed in.
  useEffect(() => {
    if (!isLoaded) return;
    saveState(state, user?.id);
  }, [state, isLoaded, user?.id]);

  // Apply light/dark theme class on <html>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const applyTheme = () => {
      const theme = state.settings.theme;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = theme === "dark" || (theme === "system" && prefersDark);
      root.classList.toggle("dark", isDark);
    };
    applyTheme();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyTheme);
    return () => mq.removeEventListener("change", applyTheme);
  }, [state.settings.theme]);

  const triageResults = useMemo(
    () => (today ? triage(state.tasks, state.settings, today) : new Map<string, TriageResult>()),
    [state.tasks, state.settings, today]
  );

  const loadDemo = useCallback(() => {
    const demos = createDemoTasks();
    const existingIds = new Set(state.tasks.map((t) => t.id));
    const newTasks = demos.filter((d) => !existingIds.has(d.id));
    if (newTasks.length > 0) {
      dispatch({ type: "LOAD_DEMO", tasks: newTasks });
    }
    return newTasks.length;
  }, [state.tasks]);

  const reset = useCallback(() => {
    // Reset only the current user's slot (or guest slot if not signed in)
    resetState(user?.id);
    dispatch({ type: "RESET" });
  }, [user?.id]);

  const addTask = useCallback((taskData: Omit<Task, "id" | "createdAt">) => {
    const task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_TASK", task });
    return task;
  }, []);

  const updateTask = useCallback((task: Task) => {
    dispatch({ type: "UPDATE_TASK", task });
  }, []);

  const deleteTask = useCallback((id: string) => {
    dispatch({ type: "DELETE_TASK", id });
  }, []);

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    dispatch({ type: "UPDATE_SETTINGS", settings });
  }, []);

  const login = useCallback(
    async (email: string, password: string, useForReminders = true) => {
      const res = await loginAccount({ email, password });
      if (!res.ok) return res;
      // Load this user's private data slot and hydrate the store
      const userState = loadState(res.user.id);
      dispatch({ type: "HYDRATE", state: userState, user: res.user });
      if (useForReminders) {
        dispatch({ type: "UPDATE_SETTINGS", settings: { reminderEmail: res.user.email } });
      }
      return res;
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string, useForReminders = true) => {
      const res = await registerAccount({ name, email, password });
      if (!res.ok) return res;
      // On first registration: carry any guest tasks into the new user's slot
      migrateGuestToUser(res.user.id);
      // Now load from the (possibly migrated) user slot
      const userState = loadState(res.user.id);
      dispatch({ type: "HYDRATE", state: userState, user: res.user });
      if (useForReminders) {
        dispatch({ type: "UPDATE_SETTINGS", settings: { reminderEmail: res.user.email } });
      }
      return res;
    },
    []
  );

  const logout = useCallback(() => {
    clearSessionUser();
    // Reload the guest slot (blank or any pre-login guest data)
    const guestState = loadState(undefined);
    dispatch({ type: "HYDRATE", state: guestState, user: null });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        triageResults,
        dispatch,
        loadDemo,
        reset,
        addTask,
        updateTask,
        deleteTask,
        updateSettings,
        user,
        login,
        register,
        logout,
        isLoaded,
        today,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
