import { toAuthorizationHeader } from "./credentials";
import { PlatformError, isModelId } from "./platform";
import type { GenerationStatus, QueuedGeneration } from "./platform";

/* fal's queue speaks the same dialect as the Higgsfield platform — POST a model
   path, get a request id back, poll — with three differences this client
   absorbs so the studio never sees them:

   1. Status and result live under the model's app id
      (`/{owner}/{alias}/requests/{id}/status`), not at a global `/requests/{id}`.
   2. Status is IN_QUEUE / IN_PROGRESS / COMPLETED, and COMPLETED carries no
      media: the result is a second GET on the request itself.
   3. A failed job still reports COMPLETED; the failure is the result's error.

   The studio's request id is therefore a composite, `fal:{appId}:{requestId}`,
   so a status poll knows where to look without trusting any URL the browser
   could hand back. Every URL here is built server-side from validated parts. */

const PREFIX = "fal:";
/* Endpoint namespaces where the app id spans three segments (fal client's
   ENDPOINT_NAMESPACES). Every catalog path today uses the two-segment form. */
const NAMESPACES = new Set(["workflows", "comfy"]);
const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/i;
const REQUEST_ID = /^[a-z0-9][a-z0-9-]{7,63}$/i;

export function isFalRequestId(requestId: string): boolean {
  return requestId.startsWith(PREFIX);
}

export function falAppId(model: string): string {
  const parts = model.split("/");
  const span = NAMESPACES.has(parts[0] ?? "") ? 3 : 2;
  const app = parts.slice(0, span);
  if (app.length < span || !app.every((part) => SEGMENT.test(part))) {
    throw new PlatformError(400, { detail: "Invalid model" });
  }
  return app.join("/");
}

function parseRequestId(requestId: string): { appId: string; id: string } {
  if (!isFalRequestId(requestId)) throw new PlatformError(400, { detail: "Not a fal request" });
  const rest = requestId.slice(PREFIX.length);
  const split = rest.lastIndexOf(":");
  const appId = rest.slice(0, split);
  const id = rest.slice(split + 1);
  if (split <= 0 || !REQUEST_ID.test(id) || falAppId(appId) !== appId) {
    throw new PlatformError(400, { detail: "Invalid request id" });
  }
  return { appId, id };
}

export type FalClientOptions = {
  apiKey: string;
  baseUrl: string;
  fetch?: typeof fetch;
};

export function createFalQueueClient(options: FalClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const fetchImpl = options.fetch ?? fetch;
  const auth = toAuthorizationHeader(options.apiKey);

  async function send(method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
    const url = `${baseUrl}${path}`;
    console.info("[fal] request", { method, url, body: body ?? null });
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const payload = await readJson(response);
    console.info("[fal] response", { method, url, status: response.status });
    return { response, payload };
  }

  return {
    async submit(model: string, input: Record<string, unknown>): Promise<QueuedGeneration> {
      if (!isModelId(model)) throw new PlatformError(400, { detail: "Invalid model" });
      const appId = falAppId(model);
      const { response, payload } = await send("POST", `/${model}`, input);
      if (!response.ok) throw new PlatformError(response.status, normalizeError(payload));
      const id = stringField(asRecord(payload), "request_id");
      if (!id || !REQUEST_ID.test(id)) {
        throw new PlatformError(502, { detail: "fal response missing request_id" });
      }
      return {
        status: "queued",
        requestId: `${PREFIX}${appId}:${id}`,
        statusUrl: "",
        cancelUrl: "",
      };
    },

    async status(requestId: string): Promise<GenerationStatus> {
      const { appId, id } = parseRequestId(requestId);
      const polled = await send("GET", `/${appId}/requests/${id}/status`);
      if (!polled.response.ok) {
        throw new PlatformError(polled.response.status, normalizeError(polled.payload));
      }
      const state = asRecord(polled.payload);
      const raw = (stringField(state, "status") ?? "").toUpperCase();
      if (raw === "IN_QUEUE") return { status: "queued", requestId };
      if (raw === "IN_PROGRESS") return { status: "in_progress", requestId };
      if (state.error !== undefined && state.error !== null) {
        return { status: "failed", requestId, error: messageOf(state.error) };
      }
      if (raw !== "COMPLETED") return { status: raw.toLowerCase() || "unknown", requestId };

      const result = await send("GET", `/${appId}/requests/${id}`);
      if (!result.response.ok) {
        return {
          status: "failed",
          requestId,
          error: messageOf(normalizeError(result.payload).detail) || `fal request failed (${result.response.status})`,
        };
      }
      return mapResult(result.payload, requestId);
    },
  };
}

/* Output shapes seen across fal endpoints: images[], image, video, videos[]. */
function mapResult(payload: unknown, requestId: string): GenerationStatus {
  const data = asRecord(payload);
  const images = Array.isArray(data.images)
    ? data.images.flatMap((item) => {
        const url = asRecord(item).url;
        return typeof url === "string" ? [{ url }] : [];
      })
    : [];
  const single = asRecord(data.image).url;
  if (typeof single === "string") images.push({ url: single });
  const video =
    asRecord(data.video).url ??
    (Array.isArray(data.videos) ? asRecord(data.videos[0]).url : undefined);
  const draftId = stringField(data, "draft_id");

  if (images.length === 0 && typeof video !== "string") {
    return { status: "failed", requestId, error: "fal returned no media" };
  }
  return {
    status: "completed",
    requestId,
    ...(images.length ? { images } : {}),
    ...(typeof video === "string" ? { video: { url: video } } : {}),
    ...(draftId ? { draftId } : {}),
  };
}

/* fal errors arrive as { detail: string } or { detail: [{ msg, loc }] }
   (validation). The studio surfaces `detail` as the message. */
function normalizeError(payload: unknown): { detail: string } {
  const detail = asRecord(payload).detail;
  if (typeof detail === "string") return { detail };
  if (Array.isArray(detail)) {
    const text = detail
      .map((item) => {
        const record = asRecord(item);
        const loc = Array.isArray(record.loc) ? record.loc.slice(1).join(".") : "";
        const msg = typeof record.msg === "string" ? record.msg : "";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean)
      .join("; ");
    if (text) return { detail: text };
  }
  if (typeof payload === "string" && payload) return { detail: payload.slice(0, 300) };
  return { detail: "fal request failed" };
}

function messageOf(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  if (typeof record.message === "string") return record.message;
  if (typeof record.detail === "string") return record.detail;
  try {
    return JSON.stringify(value).slice(0, 300);
  } catch {
    return "fal request failed";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
