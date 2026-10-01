import { put } from "@vercel/blob/client";

type UploadMode = "blob" | "fal" | "none";

let mode: Promise<UploadMode> | null = null;

/* Asked once per page: the server knows whether a Blob token or a fal key is
   held, and the browser must not guess at either. */
function uploadMode(): Promise<UploadMode> {
  mode ??= fetch("/api/upload")
    .then((res) => (res.ok ? (res.json() as Promise<{ mode?: UploadMode }>) : { mode: "blob" as const }))
    .then((data) => data.mode ?? "blob")
    .catch(() => "blob" as const);
  return mode;
}

export async function uploadMedia(file: File): Promise<{ url: string }> {
  if ((await uploadMode()) === "fal") return uploadToFal(file);
  return uploadToBlob(file);
}

async function uploadToFal(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
  if (!res.ok || typeof data.url !== "string") {
    throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
  }
  return { url: data.url };
}

async function uploadToBlob(file: File): Promise<{ url: string }> {
  const res = await fetch("/api/blob", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname: file.name, clientPayload: null, multipart: false },
    }),
  });
  if (!res.ok) throw new Error("Failed to retrieve the client token");
  const { clientToken, pathname } = (await res.json()) as {
    clientToken?: unknown;
    pathname?: unknown;
  };
  if (typeof clientToken !== "string" || typeof pathname !== "string") {
    throw new Error("Failed to retrieve the client token");
  }
  const blob = await put(pathname, file, { access: "public", token: clientToken });
  return { url: blob.url };
}
