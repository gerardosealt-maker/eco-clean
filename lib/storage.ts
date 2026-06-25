import type { AppData } from "./types";
import { createDemoData, defaultCategories, defaultSettings, defaultTags } from "./demo-data";

export const STORAGE_KEY = "eco-clean-financiero-v3";

export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function normalizeData(input: Partial<AppData> | null | undefined): AppData {
  const demo = createDemoData();
  const settings = { ...defaultSettings, ...(input?.settings || {}) };
  return {
    version: 3,
    settings,
    movements: (input?.movements || []).map((movement: any) => ({ ...movement, tags: Array.isArray(movement.tags) ? movement.tags : [] })),
    debts: input?.debts || [],
    categories: (input?.categories?.length ? input.categories : defaultCategories).map((category: any) => ({
      icon: "📌",
      color: "#64748b",
      active: true,
      ...category,
    })),
    tags: input?.tags?.length ? input.tags : defaultTags,
    updatedAt: input?.updatedAt || demo.updatedAt,
  };
}

export function loadLocalData(): AppData {
  if (typeof window === "undefined") return createDemoData();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const legacyRaw = window.localStorage.getItem("control-financiero-juan-jose-v2");
    const data = legacyRaw ? normalizeData(JSON.parse(legacyRaw)) : createDemoData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }
  try {
    const parsed = normalizeData(JSON.parse(raw));
    return parsed;
  } catch {
    const data = createDemoData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }
}

export function saveLocalData(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...normalizeData(data), updatedAt: new Date().toISOString() }));
}

export function downloadText(filename: string, content: string, type = "application/json;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
