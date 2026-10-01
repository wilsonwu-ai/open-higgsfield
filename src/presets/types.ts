/* A preset is a whole plane minus media: the model, its dials and the words.
   Applying one is the same act as Reuse on a finished run — it loads the
   composer and leaves pressing Generate to the visitor. */

export type Preset = {
  id: string;
  title: string;
  /** One line under the title: what the template is for. */
  blurb?: string;
  model: string;
  prompt: string;
  settings?: Record<string, unknown>;
  tags?: string[];
  /** Public path or URL of a preview image. */
  thumb?: string;
  /** Where a preset came from, shown as a link on its card. */
  source?: { label: string; url?: string };
  origin: "builtin" | "local";
};
