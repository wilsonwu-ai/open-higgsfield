import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { PLATFORM_KEY_COOKIE, decodeCredentials, toAuthorizationHeader } from "@/generation/credentials";
import { falRestUrl, providerId, serverKey } from "@/generation/server-config";

/* Media inputs need a public URL the platform can fetch. The studio's original
   path is Vercel Blob (/api/blob); on fal the same job is done by fal's own
   storage, so a local install needs no Blob token at all. The file passes
   through this route because the fal key must never reach the browser. */

const MAX_BYTES = 100 * 1024 * 1024;
const KINDS = /^(image|video|audio)\//;

async function falKey(): Promise<string | null> {
  if (providerId() !== "fal") return null;
  const fromServer = serverKey("fal");
  if (fromServer) return fromServer;
  const jar = await cookies();
  return decodeCredentials(jar.get(PLATFORM_KEY_COOKIE)?.value)?.apiKey ?? null;
}

/** Which upload path the client should take. Blob stays first when configured,
    because it uploads client-direct and skips this route's body size. */
export async function GET(): Promise<NextResponse> {
  const mode = process.env.OPEN_HIGGSFIELD_READ_WRITE_TOKEN
    ? "blob"
    : (await falKey())
      ? "fal"
      : "none";
  return NextResponse.json({ mode });
}

export async function POST(request: Request): Promise<NextResponse> {
  const key = await falKey();
  if (!key) return NextResponse.json({ error: "Uploads need a fal key" }, { status: 400 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    file = null;
  }
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files must be under 100 MB" }, { status: 413 });
  }
  const contentType = file.type || "application/octet-stream";
  if (!KINDS.test(contentType)) {
    return NextResponse.json({ error: "Only image, video and audio files" }, { status: 415 });
  }

  try {
    const initiated = await fetch(`${falRestUrl()}/storage/upload/initiate?storage_type=fal-cdn-v3`, {
      method: "POST",
      headers: { Authorization: toAuthorizationHeader(key), "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType, file_name: file.name.slice(0, 180) || "upload" }),
      cache: "no-store",
    });
    const target = (await initiated.json().catch(() => ({}))) as { upload_url?: unknown; file_url?: unknown };
    if (!initiated.ok || typeof target.upload_url !== "string" || typeof target.file_url !== "string") {
      throw new Error(`fal storage refused the upload (${initiated.status})`);
    }
    const put = await fetch(target.upload_url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!put.ok) throw new Error(`fal storage upload failed (${put.status})`);
    console.info("[upload] fal", { name: file.name, bytes: file.size });
    return NextResponse.json({ url: target.file_url });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Upload failed" },
      { status: 502 },
    );
  }
}
