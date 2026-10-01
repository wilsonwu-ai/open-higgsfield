import type { Preset } from "./types";

/* Original templates, one per prompt shape that held up best in a 24-post
   survey of shared AI image/video prompts (Sep 2026). Square-bracketed words
   are slots to replace. Each encodes the lesson that made its shape work:
   name the camera instead of the mood, lock the details models drift on, keep
   crowds uniform, give text its own close-up, and end on a button. */

export const BUILTIN_PRESETS: readonly Preset[] = [
  {
    id: "builtin-street-walk",
    title: "Street-style hero walk",
    blurb: "Sectioned fashion spec — camera, place, pose, outfit, styling.",
    model: "seedance-2.5",
    settings: { aspectRatio: "9:16", duration: 10, resolution: "720p", generateAudio: true },
    tags: ["fashion", "sectioned spec"],
    origin: "builtin",
    prompt: `CAMERA AND LOOK
Ultra-realistic full-body street-style footage, eye level, 50mm lens, moderate depth of field. Low late-afternoon sun from behind and to one side gives a warm rim on the hair and long shadows on the pavement. Subtle film grain, warm natural grade, real skin texture. No plastic skin, beauty filter or CGI polish.

PLACE
[A lived-in city block — name the architecture, the trees and the season]. A few pedestrians far down the sidewalk. It should feel ordinary and unstaged.

POSE AND ACTION
She walks toward the camera at an easy pace, mid-stride, one hand in a pocket, the other holding [an everyday prop]. Relaxed shoulders, calm direct glance at the lens, no exaggerated smile. Hair moves a little in the breeze.

OUTFIT
[Garment by garment: fabric, finish, fit and colour — outer layer, top, bottom, socks, shoes, bag, one small piece of jewellery].

STYLING
[One sentence that anchors the vibe, e.g. "effortless downtown autumn, warm browns and lived-in leather"].

Keep the same face, hair and outfit in every frame. No text or logos.`,
  },
  {
    id: "builtin-ugc-review",
    title: "UGC product review",
    blurb: "One benefit per location, one voice line per benefit, product inserts between.",
    model: "seedance-2.5",
    settings: { aspectRatio: "9:16", duration: 15, resolution: "720p", generateAudio: true },
    tags: ["ad", "ugc", "voiceover"],
    origin: "builtin",
    prompt: `Ultra-realistic UGC-style review of [PRODUCT], filmed like a creator testing it for real: handheld phone footage, natural light, honest framing. The product matches the attached reference exactly — shape, colour and the wordmark "[BRAND]" spelled correctly in every close-up. No other brand logos anywhere.

0–3s: Close-up selfie. She holds [PRODUCT] up to the lens and says: "I've been testing [PRODUCT] for a week — here's the honest version."
3–6s: Macro insert of [the product's hero detail], slow hand-held move. She says: "[Benefit one, in her own words]."
6–9s: [Location two] — she uses it in motion. She says: "[Benefit two]."
9–12s: [Location three, a harder test — rain, rush, mess]. She says: "[Benefit three, proven by what we see]."
12–15s: Walk-to-camera wide in [final location]. She smiles and says: "[Short verdict line]."

Natural ambient sound under her voice. No music, subtitles, captions or watermark.`,
  },
  {
    id: "builtin-persona-vlog",
    title: "Persona vlog with on-screen name",
    blurb: "Timed beats, word-for-word lines, one readable sign in its own close-up.",
    model: "seedance-2.5",
    settings: { aspectRatio: "16:9", duration: 15, resolution: "720p", generateAudio: true },
    tags: ["persona", "dialogue", "timecoded"],
    origin: "builtin",
    prompt: `A [describe the persona: age range, hair, signature look] filming a handheld selfie vlog [where — e.g. backstage, a market, an airport gate]. Energetic, laughing, talking to camera. Same face, hair and outfit throughout.

0–3s: Tight selfie close-up. She says: "[Opening line]." The camera drifts to reveal [the setting].
3–5s: Close-up of a brushed-steel plaque engraved "[NAME]" — one short word, filling the frame. Her finger points at it. She says: "[Line about the name]."
5–8s: Full-body shot of her walking toward the camera, [outfit detail] moving with each step.
8–11s: [Second setting, brightly lit]. She does [a small action] and says: "[Line]."
11–15s: She glances off-camera, eyes widen, and says: "[Exit line]." She turns and runs off, hair swinging.

Bright, even, slightly handheld vlog look. Natural ambient sound. No extra text, subtitles or watermark.`,
  },
  {
    id: "builtin-dv-home-video",
    title: "DV home video, story paragraph",
    blurb: "Plain story beats plus one continuity line — holds a dozen scenes.",
    model: "seedance-2.5",
    settings: { aspectRatio: "16:9", duration: 15, resolution: "720p", generateAudio: true },
    tags: ["ugc", "story", "dv"],
    origin: "builtin",
    prompt: `An early-2000s DV camcorder home video of [two people — who they are to each other] spending [an ordinary afternoon somewhere specific].

[Beat one, one sentence.] [Beat two, one sentence.] [A small surprise one of them arranges for the other.] [A playful competitive moment.] [A quiet ending moment, and what breaks it.]

[Person A's outfit and hair.] [Person B's outfit and hair.] Keep the same faces, outfits and hairstyles throughout.

Raw handheld DV footage: imperfect framing, autofocus hunting, slight shake, faded summer colour, soft digital detail, natural motion blur. Natural ambient sound, laughter and conversation. No music, subtitles, commercial look, CGI or slow motion.`,
  },
  {
    id: "builtin-comedy-gag",
    title: "Timecoded comedy gag",
    blurb: "Setup, escalation, twist, button — each beat its own window.",
    model: "seedance-2.5",
    settings: { aspectRatio: "16:9", duration: 15, resolution: "720p", generateAudio: true },
    tags: ["comedy", "timecoded"],
    origin: "builtin",
    prompt: `15-second comedic scene, single location: [where]. Character: [who, what they wear]. Realistic physics and timing, natural lighting.

0–3s SETUP: [The normal situation, and the one thing about it that is off].
3–7s ESCALATION: [The situation pushes back — twice, each bigger than the last].
7–11s TWIST: [The character answers in the least expected way, deadpan].
11–15s BUTTON: [A final small reaction that lands the joke — a look to camera, a shrug, an object settling].

Each action happens exactly once. No cuts, slow motion, subtitles or music — only natural sound.`,
  },
  {
    id: "builtin-still-hero-crowd",
    title: "Still hero, moving crowd",
    blurb: "One motionless figure inside a crowd moving in waves. Uniform crowds hold best.",
    model: "seedance-2.5",
    settings: { aspectRatio: "16:9", duration: 12, resolution: "720p", generateAudio: true },
    tags: ["music video", "crowd"],
    origin: "builtin",
    prompt: `Live-action, overcast daylight, cool desaturated grade, 35mm grain. Location: [a wide stone staircase / a gym / a school hall].

The crowd: hundreds of people in IDENTICAL [uniform — e.g. grey workwear, navy blazers], packed shoulder to shoulder in rows, no gaps, no aisle.
The hero: [one person, distinct outfit], standing dead centre, facing camera.

0–4s: Close-up of the hero, calm, then the camera pulls back to reveal the crowd frozen still around them.
4–12s: The crowd moves in waves — heads thrown back to the sky, then folding forward at the hips, then snapping upright — different blocks out of phase so the motion ripples. The hero never moves.

The crowd never parts or leaves space around the hero. No slow motion, cuts, text or watermark.`,
  },
  {
    id: "builtin-glance-back",
    title: "The glance back",
    blurb: "Everyone faces one way; near the end the subject meets the lens. Built for rewatches.",
    model: "seedance-2.5",
    settings: { aspectRatio: "9:16", duration: 15, resolution: "720p", generateAudio: true },
    tags: ["persona", "loop", "subtle"],
    origin: "builtin",
    prompt: `Realistic handheld phone footage from a few rows back in [a place where everyone looks the same way — stadium seats, a café window bar, a train carriage]. Natural light, real crowd, ordinary and unstaged.

The subject: [an adult persona — hair, outfit, one signature detail], seated among the crowd, framed from the shoulders up, slightly off-centre.

0–10s: She watches [what everyone is watching] exactly like the people around her — small natural reactions, never looking at the camera.
10–13s: Without any big movement she turns her head and looks straight into the lens.
13–15s: The faintest smile — only the corner of her mouth lifts, then holds. She turns back to [the action].

One glance only. No dancing, waving, winking or exaggerated reactions. Same face and outfit throughout. Ambient crowd sound, no music, no text or watermark.`,
  },
  {
    id: "builtin-character-sheet",
    title: "Character reference sheet",
    blurb: "Front, back and close-up of one person — the identity asset later runs take as a reference.",
    model: "nano-banana-2",
    settings: { aspectRatio: "16:9", resolution: "2K", numImages: 1 },
    tags: ["consistency", "reference", "character"],
    origin: "builtin",
    prompt: `Attach one clear photo of the person as a reference. Using it, make a photorealistic character reference sheet: one horizontal image split into three equal vertical panels on a plain light-grey studio backdrop with soft contact shadows.

Left: the same person from the front, full body head to toe, standing straight, arms relaxed.
Centre: the same person from directly behind, full body, showing the back of the outfit and hair.
Right: a three-quarter close-up of the face and shoulders, neutral expression, sharp facial detail.

Keep the face, hair, body proportions and every garment and accessory exactly as in the reference — same colours, prints, fabric and fit — in all three panels. Soft even fashion lighting, natural skin texture, no beautifying. No text, labels, extra people, props or watermark. Feet fully in frame in both full-body panels.`,
  },
  {
    id: "builtin-contact-sheet",
    title: "Contact sheet of near-misses",
    blurb: "Nine tiles, one named photographic mistake each — consistency for free.",
    model: "nano-banana-2",
    settings: { aspectRatio: "3:4", resolution: "2K", numImages: 1 },
    tags: ["lookbook", "grid"],
    origin: "builtin",
    prompt: `A 3×3 grid of nine candid compact-camera snapshots on a dark contact sheet, thin black dividers. The same [subject — a person or a product] in the same [place] in every tile, shot by a friend with direct on-camera flash: grainy, honest, slightly imperfect.

Each tile is almost a great photo, ruined by one specific mistake:
1. motion blur mid-turn · 2. blown out by the flash · 3. blink at the decisive moment
4. focus on the background, subject soft · 5. camera tilted 20° · 6. a thumb over one corner
7. flash didn't fire, dark and noisy · 8. aimed too low, top of the head cropped · 9. a lampshade behind the head reading as a hat

Same outfit, same lighting setup and same room in all nine. No text, timestamps or watermark.`,
  },
  {
    id: "builtin-json-product",
    title: "Structured product still (JSON)",
    blurb: "Every slot filled, must-keeps repeated at the end — the highest-adherence shape.",
    model: "nano-banana-2",
    settings: { aspectRatio: "3:4", resolution: "2K", numImages: 1 },
    tags: ["product", "json"],
    origin: "builtin",
    prompt: `{
  "subject": {
    "product": "[PRODUCT — exact name, colour, material]",
    "placement": "[on what surface, at what angle]",
    "state": "[new, in use, partly unboxed]"
  },
  "photography": {
    "camera": "[lens and height, e.g. 85mm, slightly above eye level]",
    "lighting": "[one key source, its direction and quality]",
    "depth_of_field": "[what is sharp, what falls off]",
    "texture": "subtle grain, true-to-life material detail, no over-sharpening"
  },
  "background": {
    "setting": "[the room or surface]",
    "elements": ["[prop one]", "[prop two]"],
    "palette": "[two or three colours]"
  },
  "constraints": {
    "must_keep": ["exact product shape and colour", "the wordmark spelled \\"[BRAND]\\"", "[any detail that must not change]"],
    "avoid": ["other brand logos", "invented text", "plastic CGI look"]
  }
}`,
  },
];
