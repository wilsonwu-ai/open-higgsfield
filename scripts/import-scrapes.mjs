#!/usr/bin/env node
/* Turns a folder of scraped prompt shares into Explore presets.

   Reads <dir>/postN/prompt.md (the format written by the scrape workflow:
   a header block of **Source:** / **Model:** / **Output:** bullets, a line of
   `---`, then the prompt), picks the closest catalog model, guesses aspect and
   duration from the prompt and the output dimensions, copies a contact-sheet
   thumbnail, and writes public/presets.local.json + public/presets-local/.

   Both outputs are gitignored: the prompts belong to the people who shared
   them, and this keeps them on the machine that collected them.

   Usage: pnpm presets:import [scrape-dir]   (default: $SCRAPE_DIR) */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? process.env.SCRAPE_DIR ?? "");
if (!process.argv[2] && !process.env.SCRAPE_DIR) {
  console.error("usage: pnpm presets:import <scrape-dir>");
  process.exit(1);
}
if (!existsSync(root)) {
  console.error(`not found: ${root}`);
  process.exit(1);
}

const publicDir = path.resolve("public");
const thumbDir = path.join(publicDir, "presets-local");
mkdirSync(thumbDir, { recursive: true });

const SEEDANCE_ASPECTS = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"];
const IMAGE_ASPECTS = ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"];

function field(text, label) {
  const line = text.split("\n").find((row) => row.includes(`**${label}:**`));
  return line ? line.split(`**${label}:**`)[1].trim() : "";
}

function firstUrl(text) {
  return text.match(/https?:\/\/[^\s)]+/)?.[0];
}

/* The prompt is the block after the first `---`; notes may follow a second.
   Shared posts wrap the prompt in marketing: a "PROMPT SHARE" caption, hashtag
   lines, "➜ Image Prompt:". The model only ever saw what follows the marker,
   and hashtags left in a prompt can surface as on-screen text. */
function promptOf(text) {
  const blocks = text.split(/\n---\n/);
  let body = (blocks[1] ?? "").trim();
  const marker = body.search(/(?:➜\s*)?(?:\*\*)?(?:\[GPT Image\s?2 Prompt\]|Image Prompt:)(?:\*\*)?[ \t]*\n/i);
  if (marker >= 0) body = body.slice(marker).replace(/^.*\n/, "");
  /* A one-line opener carrying an emoji is the post's caption, not direction. */
  const [opener, ...rest] = body.split(/\n\s*\n/);
  if (rest.length && opener && !opener.includes("\n") && opener.length <= 140 && /\p{Extended_Pictographic}/u.test(opener)) {
    body = rest.join("\n\n");
  }
  return body
    .replace(/^```[a-z]*\n?/gm, "")
    .replace(/^```$/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(?:#[\w\u3040-\u30ff\u4e00-\u9fff]+\s*)+$/gm, "")
    .replace(/^\s*(?:short\s+)?(?:reference\s+)?prompt\s*:\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function modelFor(modelLine, isVideo) {
  const m = modelLine.toLowerCase();
  if (!isVideo) {
    if (m.includes("gpt image")) return { id: "gpt-image-2" };
    return { id: "nano-banana-2", note: modelLine ? `orig: ${modelLine.split(/[(,.]/)[0].trim()}` : undefined };
  }
  if (m.includes("seedance 2.5") || m.includes("seedance")) return { id: "seedance-2.5" };
  return { id: "seedance-2.5", note: modelLine ? `orig: ${modelLine.split(/[(,.·]/)[0].trim()}` : undefined };
}

/* Order of trust: a ratio the prompt states, then the real output's pixels,
   then "vertical" — but only as a frame word ("vertical video", "vertical
   9:16"), never "vertical seams" or "vertical light strips". */
function aspectFrom(text, dims, allowed) {
  const found = text.match(/\b(21:9|16:9|9:16|4:3|3:4|1:1)\b/);
  if (found && allowed.includes(found[1])) return found[1];
  if (dims) {
    const ratio = dims.w / dims.h;
    const best = allowed
      .map((a) => {
        const [x, y] = a.split(":").map(Number);
        return { a, d: Math.abs(x / y - ratio) };
      })
      .sort((p, q) => p.d - q.d)[0];
    return best?.a;
  }
  if (/\bvertical\s+(?:video|format|frame|screen|shot|footage|smartphone|composition|portrait)\b/i.test(text)) {
    return allowed.includes("9:16") ? "9:16" : undefined;
  }
  return undefined;
}

/* When the header does not state the pixels, the scrape's yt-dlp metadata does. */
function dimsFromInfo(dir) {
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".info.json")) continue;
    try {
      const info = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      if (Number(info.width) > 0 && Number(info.height) > 0) return { w: Number(info.width), h: Number(info.height) };
    } catch {
      /* not a media record */
    }
  }
  return null;
}

function durationFrom(prompt, outputLine) {
  const said = prompt.match(/\b(\d{1,2})[- ]?(?:second|sec)\b/i) ?? prompt.match(/\b(\d{1,2})s\s*\/|\b(\d{1,2})s\b(?= \d)/);
  const fromOutput = outputLine.match(/\((\d+(?:\.\d+)?)\s*s/);
  const raw = Number(said?.[1] ?? said?.[2] ?? fromOutput?.[1] ?? 10);
  return Math.min(30, Math.max(4, Math.round(raw)));
}

const presets = [];
const posts = readdirSync(root)
  .filter((name) => /^post\d+$/.test(name))
  .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));

for (const post of posts) {
  const file = path.join(root, post, "prompt.md");
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const prompt = promptOf(text);
  if (prompt.length < 40) continue;

  const title = (text.split("\n")[0] ?? post).replace(/^#\s*/, "").replace(/^Prompt:\s*/i, "").trim();
  const sourceLine = field(text, "Source");
  const modelLine = field(text, "Model");
  const outputLine = field(text, "Output");
  const isVideo = /\.mp4/.test(outputLine);
  const dimMatch = outputLine.match(/(\d{3,4})x(\d{3,4})/);
  const dims = dimMatch
    ? { w: Number(dimMatch[1]), h: Number(dimMatch[2]) }
    : isVideo
      ? dimsFromInfo(path.join(root, post))
      : null;
  const { id: model, note } = modelFor(modelLine, isVideo);
  const handle = sourceLine.match(/@[A-Za-z0-9_]+/)?.[0];
  const mismatch = /does NOT match|⚠️ Mismatch/i.test(text);

  const settings = isVideo
    ? {
        aspectRatio: aspectFrom(prompt, dims, SEEDANCE_ASPECTS) ?? "16:9",
        duration: durationFrom(prompt, outputLine),
        resolution: "720p",
        generateAudio: true,
      }
    : { aspectRatio: aspectFrom(prompt, dims, IMAGE_ASPECTS) ?? "1:1", resolution: "1K", numImages: 1 };

  let thumb;
  const still = ["contact.jpg", "photo1.jpg"].map((name) => path.join(root, post, name)).find(existsSync);
  if (still) {
    const target = path.join(thumbDir, `${post}.jpg`);
    try {
      execFileSync("sips", ["-Z", "720", still, "--out", target], { stdio: "ignore" });
    } catch {
      copyFileSync(still, target);
    }
    thumb = `/presets-local/${post}.jpg`;
  }

  presets.push({
    id: `local-${post}`,
    title,
    blurb: [handle, modelLine.split(/[(·]/)[0].trim()].filter(Boolean).join(" · ") || undefined,
    model,
    prompt,
    settings,
    tags: [post, isVideo ? "video" : "image", note, mismatch ? "untested" : undefined].filter(Boolean),
    thumb,
    source: handle ? { label: handle, url: firstUrl(sourceLine) } : undefined,
    origin: "local",
  });
}

writeFileSync(path.join(publicDir, "presets.local.json"), JSON.stringify(presets, null, 2));
console.log(`imported ${presets.length} presets from ${root}`);
for (const preset of presets) {
  console.log(`  ${preset.tags[0].padEnd(7)} ${preset.model.padEnd(14)} ${JSON.stringify(preset.settings)}  ${preset.title.slice(0, 60)}`);
}
