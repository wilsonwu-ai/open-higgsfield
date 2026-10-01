"use server";

import { createWriteStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/* Result URLs belong to the generation platform's CDN and expire (Higgsfield
   keeps outputs "at least seven days"; fal's are similar). The browser gallery
   remembers a run longer than its file lives, so every finished output is also
   copied to disk with a sidecar of how it was made. Off in production unless
   OUTPUT_DIR names a directory — a serverless filesystem would lose it anyway. */

export type ArchiveItem = {
  id: string;
  url: string;
  modelId: string;
  prompt: string;
  settings?: Record<string, unknown>;
  createdAt: number;
};

const MAX_BYTES = 1024 * 1024 * 1024;
const DEFAULT_HOSTS = ["fal.media", "fal.run", "fal.ai", "higgsfield.ai"];
const EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function archiveRoot(): string | null {
  const configured = process.env.OUTPUT_DIR?.trim();
  if (configured) return path.resolve(configured);
  return process.env.NODE_ENV === "production" ? null : path.join(process.cwd(), "outputs");
}

/* Only the platforms' own CDNs: this action fetches whatever URL it is given,
   so an open allow-list would make it a server-side request proxy. */
function allowedHost(hostname: string): boolean {
  const extra = (process.env.ARCHIVE_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const host = hostname.toLowerCase();
  return [...DEFAULT_HOSTS, ...extra].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function safe(part: string, max = 80): string {
  return part.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "").slice(0, max) || "run";
}

export async function archiveOutputs(items: ArchiveItem[]): Promise<string[]> {
  const root = archiveRoot();
  if (!root || !Array.isArray(items)) return [];
  const saved: string[] = [];
  for (const item of items.slice(0, 16)) {
    try {
      const file = await archiveOne(root, item);
      if (file) saved.push(file);
    } catch (caught) {
      console.warn("[archive] skipped", item?.id, caught instanceof Error ? caught.message : caught);
    }
  }
  return saved;
}

async function archiveOne(root: string, item: ArchiveItem): Promise<string | null> {
  if (!item || typeof item.url !== "string" || typeof item.id !== "string") return null;
  const url = new URL(item.url);
  if (url.protocol !== "https:" || !allowedHost(url.hostname)) {
    console.warn("[archive] host not allowed", url.hostname);
    return null;
  }

  /* Local calendar day, not UTC: a run made at 10pm belongs to today's folder. */
  const made = new Date(Number(item.createdAt) || Date.now());
  const day = `${made.getFullYear()}-${String(made.getMonth() + 1).padStart(2, "0")}-${String(made.getDate()).padStart(2, "0")}`;
  const dir = path.join(root, day);
  /* fal ids carry their app path ("fal:owner/app:uuid#n"); the uuid is enough
     next to the model name. */
  const shortId = item.id.slice(item.id.lastIndexOf(":") + 1);
  const stem = `${safe(item.modelId, 40)}_${safe(shortId)}`;
  const guessed = path.extname(url.pathname).replace(".", "").toLowerCase();

  /* A run already on disk is done; the gallery calls this once per arrival,
     but a reload that resumes the poll can deliver the same run twice. */
  for (const ext of new Set([guessed, ...Object.values(EXTENSIONS)])) {
    if (!ext) continue;
    if (await exists(path.join(dir, `${stem}.${ext}`))) return path.join(dir, `${stem}.${ext}`);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`download failed (${response.status})`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) throw new Error("file too large to archive");
  const type = (response.headers.get("content-type") ?? "").split(";")[0]!.trim();
  const ext = EXTENSIONS[type] ?? (guessed || "bin");

  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${stem}.${ext}`);
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(file));
  await writeFile(
    path.join(dir, `${stem}.json`),
    JSON.stringify(
      {
        id: item.id,
        model: item.modelId,
        prompt: item.prompt,
        settings: item.settings ?? {},
        createdAt: new Date(Number(item.createdAt) || Date.now()).toISOString(),
        sourceUrl: item.url,
        file: path.basename(file),
      },
      null,
      2,
    ),
  );
  console.info("[archive] saved", file);
  return file;
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}
