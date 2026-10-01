"use server";

import { cookies } from "next/headers";

import { FAL_READY_MODELS } from "./catalog/availability";
import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import {
  MissingCredentialsError,
  PLATFORM_KEY_COOKIE,
  PLATFORM_KEY_COOKIE_OPTIONS,
  decodeCredentials,
  encodeCredentials,
  parseCredentialInput,
} from "./credentials";
import { createFalQueueClient, isFalRequestId } from "./fal";
import { toFalInput } from "./fal-input";
import { createPlatformClient } from "./platform";
import type { GenerationStatus, QueuedGeneration, StatusResult } from "./platform";
import {
  PROVIDER_LABELS,
  providerBaseUrl,
  providerId,
  serverKey,
  type ProviderId,
} from "./server-config";
import { toPlatform } from "./to-platform";

export type StudioInfo = {
  provider: ProviderId;
  providerLabel: string;
  /** A key from the server environment is in use (development, or opted in). */
  serverKey: boolean;
  keyConfigured: boolean;
  /** Catalog ids verified to run on the active provider; null = every model. */
  readyModels: string[] | null;
};

export async function getStudioInfo(): Promise<StudioInfo> {
  const provider = providerId();
  const fromServer = serverKey(provider) !== null;
  const stored = await readStoredCredentials();
  return {
    provider,
    providerLabel: PROVIDER_LABELS[provider],
    serverKey: fromServer,
    keyConfigured: fromServer || stored !== null,
    readyModels: provider === "fal" ? [...FAL_READY_MODELS] : null,
  };
}

export async function savePlatformCredentials(data: unknown) {
  const { apiKey } = parseCredentialInput(data);
  const jar = await cookies();
  jar.set(PLATFORM_KEY_COOKIE, encodeCredentials(apiKey), PLATFORM_KEY_COOKIE_OPTIONS);
}

export async function clearPlatformCredentials() {
  const jar = await cookies();
  jar.set(PLATFORM_KEY_COOKIE, "", { ...PLATFORM_KEY_COOKIE_OPTIONS, maxAge: 0 });
}

export async function hasPlatformCredentials() {
  return (await getStudioInfo()).keyConfigured;
}

export async function submitGeneration(plane: GenerationPlane): Promise<QueuedGeneration> {
  const model = getModel(plane.model);
  const parsed: GenerationPlane = {
    ...plane,
    settings: parseSettings(model, plane.settings),
  };
  const { path, body } = toPlatform(parsed);
  const provider = providerId();
  const client = await clientFor(provider);
  return client.submit(path, provider === "fal" ? toFalInput(path, body) : body);
}

/** Every request in flight, answered in one round trip. Next dispatches server
    actions one at a time per client, so a poll per run would queue ahead of the
    next submit — the fan-out belongs on this side of the call, where it is
    genuinely parallel. Each id is routed to the platform that issued it, so a
    history that spans a provider switch keeps resolving. */
export async function getGenerationStatuses(data: unknown): Promise<StatusResult[]> {
  const requestIds = parseRequestIds(data);
  const clients = new Map<ProviderId, Promise<Client>>();
  const clientOf = (provider: ProviderId) => {
    let client = clients.get(provider);
    if (!client) {
      client = clientFor(provider);
      clients.set(provider, client);
    }
    return client;
  };
  return Promise.all(
    requestIds.map(async (requestId): Promise<StatusResult> => {
      try {
        const client = await clientOf(isFalRequestId(requestId) ? "fal" : "higgsfield");
        return { requestId, status: await client.status(requestId) };
      } catch (caught) {
        return { requestId, error: caught instanceof Error ? caught.message : String(caught) };
      }
    }),
  );
}

type Client = {
  submit(model: string, input: Record<string, unknown>): Promise<QueuedGeneration>;
  status(requestId: string): Promise<GenerationStatus>;
};

async function clientFor(provider: ProviderId): Promise<Client> {
  const apiKey = await keyFor(provider);
  const baseUrl = providerBaseUrl(provider);
  return provider === "fal"
    ? createFalQueueClient({ apiKey, baseUrl })
    : createPlatformClient({ apiKey, baseUrl });
}

/* The server key, when allowed, is the key for its own provider. A key saved
   in the browser belongs to whichever provider is active — the modal asks for
   "your platform key", and that is the platform answering. */
async function keyFor(provider: ProviderId): Promise<string> {
  const fromServer = serverKey(provider);
  if (fromServer) return fromServer;
  if (provider === providerId()) {
    const stored = await readStoredCredentials();
    if (stored) return stored.apiKey;
  }
  throw new MissingCredentialsError();
}

async function readStoredCredentials() {
  const jar = await cookies();
  return decodeCredentials(jar.get(PLATFORM_KEY_COOKIE)?.value);
}

function parseRequestIds(data: unknown): string[] {
  const payload = asObject(data, "Invalid status payload");
  const requestIds = payload.requestIds;
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new Error("Invalid request ids");
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId) throw new Error("Invalid request id");
    return requestId;
  });
}

function asObject(data: unknown, message: string): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error(message);
  return data as Record<string, unknown>;
}
