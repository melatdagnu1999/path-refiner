import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/task";

const TOKENS_KEY = "gcal_tokens";
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

function getRedirectUri() {
  // Always use the published URL for OAuth to avoid redirect URI mismatch
  // with Google Cloud Console authorized URIs
  const publishedOrigin = "https://path-refiner.lovable.app";
  return `${publishedOrigin}/auth/callback`;
}

async function invokeCalendarFn(action: string, body: Record<string, unknown>) {
  const res = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/google-calendar-auth`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Calendar API error");
  }
  return res.json();
}

export function isGoogleCalendarConnected(): boolean {
  return !!localStorage.getItem(TOKENS_KEY);
}

export function getStoredTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveTokens(tokens: { access_token: string; refresh_token?: string; expires_in?: number }) {
  const existing = getStoredTokens();
  const merged = {
    ...existing,
    ...tokens,
    expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
  };
  localStorage.setItem(TOKENS_KEY, JSON.stringify(merged));
}

export function disconnectGoogleCalendar() {
  localStorage.removeItem(TOKENS_KEY);
}

export async function startGoogleAuth() {
  const data = await invokeCalendarFn("get-auth-url", { redirectUri: getRedirectUri() });
  window.location.href = data.url;
}

export async function handleAuthCallback(code: string) {
  const data = await invokeCalendarFn("exchange-code", { code, redirectUri: getRedirectUri() });
  saveTokens(data.tokens);
  return data.tokens;
}

async function getValidAccessToken(): Promise<string> {
  const tokens = getStoredTokens();
  if (!tokens) throw new Error("Not connected to Google Calendar");

  if (tokens.expires_at && Date.now() < tokens.expires_at - 60000) {
    return tokens.access_token;
  }

  // Refresh
  if (!tokens.refresh_token) throw new Error("No refresh token available");
  const data = await invokeCalendarFn("refresh-token", { refreshToken: tokens.refresh_token });
  saveTokens(data.tokens);
  return data.tokens.access_token;
}

export async function syncTasksToCalendar(tasks: Task[]) {
  const accessToken = await getValidAccessToken();
  const dailyTasks = tasks.filter((t) => t.scope === "day" && t.startTime && t.endTime && t.dueDate);
  if (dailyTasks.length === 0) return { results: [] };
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return invokeCalendarFn("sync-tasks", { accessToken, tasks: dailyTasks, timeZone });
}

export async function fetchCalendarEvents(timeMin: string, timeMax: string) {
  const accessToken = await getValidAccessToken();
  return invokeCalendarFn("fetch-events", { accessToken, timeMin, timeMax });
}
