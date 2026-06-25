import type { AppData } from "./types";
import { normalizeData } from "./storage";

function normalizeSupabaseUrl(value?: string) {
  if (!value) return undefined;
  // Supabase sometimes shows either:
  // 1) Project URL: https://xxxx.supabase.co
  // 2) API URL:     https://xxxx.supabase.co/rest/v1/
  // The app accepts both to avoid configuration mistakes.
  return value.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function getConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  // Supabase new secret keys replace the legacy service_role key.
  // The app accepts both variable names for easier setup.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stateId = process.env.APP_STATE_ID || "default";
  return { url, key, stateId, configured: Boolean(url && key) };
}

export function isCloudConfigured() {
  return getConfig().configured;
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { url, key } = getConfig();
  if (!url || !key) throw new Error("Supabase no está configurado.");

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error Supabase ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function readCloudState(): Promise<AppData | null> {
  const { stateId } = getConfig();
  const result = (await supabaseRequest(`finance_app_state?id=eq.${encodeURIComponent(stateId)}&select=data&limit=1`)) as { data: AppData }[];
  return result?.[0]?.data ? normalizeData(result[0].data) : null;
}

export async function writeCloudState(data: AppData) {
  const { stateId } = getConfig();
  const payload = {
    id: stateId,
    data,
    updated_at: new Date().toISOString(),
  };
  await supabaseRequest("finance_app_state", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(payload),
  });
}
