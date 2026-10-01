/* Which catalog models answer on fal at the path the catalog already uses.
   Verified 2026-09-30 against fal's model registry (api.fal.ai/v1/models,
   endpoint_id lookup) — every path these entries can submit to exists there.
   The rest of the catalog is written against the Higgsfield platform's own
   paths (Soul, DoP, kling-video/…, minimax/h3, …); fal either hosts those
   under different ids or not at all, so on fal they are marked, not hidden. */

export const FAL_READY_MODELS: ReadonlySet<string> = new Set([
  // Seedance 2.5 — text / image / reference, plus edit and extend
  "seedance-2.5",
  "seedance-2.5-edit",
  "seedance-2.5-extend",
  // Seedance 2.0 — standard, fast, mini (text / image / reference)
  "seedance-2",
  "seedance-2-fast",
  "seedance-2-mini",
  // Alibaba
  "wan-3",
  "wan-3-prime",
  "happy-horse-1",
  "happy-horse-1.1",
  "qwen-image-3",
  // Black Forest Labs
  "flux-3",
  // fal-only entries added by this fork
  "nano-banana-2",
  "gpt-image-2",
]);

/** Entries that exist only on fal; the Higgsfield platform has no such path. */
export const FAL_ONLY_MODELS: ReadonlySet<string> = new Set(["nano-banana-2", "gpt-image-2"]);
