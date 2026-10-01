import { MODELS } from "@/generation/catalog";

import { BUILTIN_PRESETS } from "./builtin";
import type { Preset } from "./types";

/* Built-ins ship with the studio. Imported presets live in
   public/presets.local.json, written by `pnpm presets:import` from a folder of
   scraped prompt shares and kept out of git — other people's prompts stay on
   the machine that collected them. */
export async function loadPresets(): Promise<Preset[]> {
  let local: Preset[] = [];
  try {
    const res = await fetch("/presets.local.json", { cache: "no-store" });
    if (res.ok) {
      const data: unknown = await res.json();
      if (Array.isArray(data)) local = data.flatMap((item) => toPreset(item));
    }
  } catch {
    /* no local file — built-ins only */
  }
  return [...local, ...BUILTIN_PRESETS];
}

function toPreset(value: unknown): Preset[] {
  if (value === null || typeof value !== "object") return [];
  const item = value as Partial<Preset>;
  if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.prompt !== "string") {
    return [];
  }
  const model = MODELS.some((entry) => entry.id === item.model) ? item.model! : "seedance-2.5";
  return [
    {
      id: item.id,
      title: item.title,
      blurb: typeof item.blurb === "string" ? item.blurb : undefined,
      model,
      prompt: item.prompt,
      settings: item.settings && typeof item.settings === "object" ? item.settings : undefined,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string") : undefined,
      thumb: typeof item.thumb === "string" ? item.thumb : undefined,
      source:
        item.source && typeof item.source === "object" && typeof item.source.label === "string"
          ? { label: item.source.label, url: typeof item.source.url === "string" ? item.source.url : undefined }
          : undefined,
      origin: "local",
    },
  ];
}
