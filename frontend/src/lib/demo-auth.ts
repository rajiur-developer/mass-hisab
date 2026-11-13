"use client";

export type DemoRole = "Manager" | "Member";
export type DemoSession = {
  role: DemoRole;
  name: string;
  email: string;
  id?: string;
  messId?: string;
  authMode?: "api" | "demo";
};

const SESSION_KEY = "mass-hisab-demo-session";

export function saveDemoSession(session: DemoSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readDemoSession(): DemoSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as DemoSession;
    if ((parsed.role !== "Manager" && parsed.role !== "Member") || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDemoSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
