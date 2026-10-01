/* The catalog maps a plane to the Higgsfield platform's field names. Where fal
   hosts the same endpoint its schema is nearly identical; this is the short
   list of places it is not, so the catalog keeps one mapping per model. */

import { imageSizeFor } from "./to-platform";

const SEEDANCE = /^bytedance\/seedance-/;
const QWEN_IMAGE = /^alibaba\/qwen-image-/;

export function toFalInput(path: string, body: Record<string, unknown>): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    input[key] = value;
  }

  if (SEEDANCE.test(path)) {
    /* fal declares Seedance duration as a string enum ("auto" | "4" … "30"). */
    if (typeof input.duration === "number") input.duration = String(Math.round(input.duration));
    /* No output_format on fal's Seedance schema; the container is always mp4. */
    delete input.output_format;
  }

  if (QWEN_IMAGE.test(path)) {
    const size = imageSizeFor(input.aspect_ratio);
    if (size) input.image_size = size;
    delete input.aspect_ratio;
    delete input.resolution;
  }

  return input;
}
