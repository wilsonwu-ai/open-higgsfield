/* Server-only configuration: which generation platform answers, and whether a
   key held in the server environment may stand in for the visitor's own.
   Imported by server actions and route handlers only — nothing here may reach
   a client bundle, because serverKey() returns a secret. */

export type ProviderId = "higgsfield" | "fal";

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  higgsfield: "Higgsfield",
  fal: "fal",
};

/** GENERATION_PROVIDER wins; otherwise a FAL_KEY in the environment selects
    fal, and everything else is the Higgsfield platform the studio was built on. */
export function providerId(): ProviderId {
  const explicit = process.env.GENERATION_PROVIDER?.trim().toLowerCase();
  if (explicit === "fal" || explicit === "higgsfield") return explicit;
  return process.env.FAL_KEY?.trim() ? "fal" : "higgsfield";
}

/* A server key turns every visitor into the key's owner. That is the point on
   a laptop and a liability on a public URL, so production refuses it unless
   the deployer opts in by name. */
export function serverKeyAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_SERVER_KEY === "1";
}

export function serverKey(provider: ProviderId): string | null {
  if (!serverKeyAllowed()) return null;
  const raw = provider === "fal" ? process.env.FAL_KEY : process.env.HF_API_KEY;
  const key = raw?.trim();
  return key ? key : null;
}

export function providerBaseUrl(provider: ProviderId): string {
  const raw =
    provider === "fal"
      ? process.env.FAL_QUEUE_URL || "https://queue.fal.run"
      : process.env.HF_API_BASE_URL || "https://api.higgsfield.ai";
  return raw.replace(/\/$/, "");
}

export function falRestUrl(): string {
  return (process.env.FAL_REST_URL || "https://rest.fal.ai").replace(/\/$/, "");
}
