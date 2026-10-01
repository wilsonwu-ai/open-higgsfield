import type { ModelEntry } from "./types";

/* Image models fal hosts that the Higgsfield catalog lacks. Both run on fal
   only — see availability.ts — and keep their own maps in to-platform.ts,
   because their schemas differ from the shared image mapper. */

export const nanoBanana2: ModelEntry = {
  id: "nano-banana-2",
  surface: "image",
  label: "Nano Banana 2",
  /* References switch the request to the /edit endpoint. */
  roles: { reference: 8 },
  settings: {
    aspectRatio: {
      type: "enum",
      values: ["auto", "1:1", "4:3", "3:4", "16:9", "9:16", "21:9"],
      default: "auto",
    },
    resolution: { type: "enum", values: ["1K", "2K", "4K"], default: "1K" },
    numImages: { type: "range", min: 1, max: 4, default: 1 },
  },
};

export const gptImage2: ModelEntry = {
  id: "gpt-image-2",
  surface: "image",
  label: "GPT Image 2",
  roles: {},
  settings: {
    aspectRatio: { type: "enum", values: ["1:1", "4:3", "3:4", "16:9", "9:16"], default: "4:3" },
    quality: { type: "enum", values: ["low", "medium", "high"], default: "medium" },
    numImages: { type: "range", min: 1, max: 4, default: 1 },
  },
};
