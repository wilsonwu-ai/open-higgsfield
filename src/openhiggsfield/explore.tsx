"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MODELS } from "@/generation/catalog";
import { useStudio } from "@/generation/stores/studio";
import { loadPresets } from "@/presets/load";
import type { Preset } from "@/presets/types";

import { swatchFor } from "./artwork";
import { CloseIcon, SearchIcon } from "./icons";

type Filter = "all" | "video" | "image" | "local";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  video: "Video",
  image: "Image",
  local: "Imported",
};

/* Explore is a shelf of whole planes. A card loads the composer — model,
   dials, words — and closes; Generate stays the visitor's press, so browsing
   never spends anything. */
export function Explore({ onApply, onClose }: { onApply: (preset: Preset) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const readyModels = useStudio((state) => state.readyModels);
  const providerLabel = useStudio((state) => state.providerLabel);

  useEffect(() => {
    ref.current?.showModal();
    searchRef.current?.focus();
    let live = true;
    void loadPresets().then((list) => {
      if (live) setPresets(list);
    });
    return () => {
      live = false;
    };
  }, []);

  const hasLocal = presets?.some((preset) => preset.origin === "local") ?? false;
  const filters: Filter[] = hasLocal ? ["all", "video", "image", "local"] : ["all", "video", "image"];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (presets ?? []).filter((preset) => {
      const entry = MODELS.find((model) => model.id === preset.model);
      if (filter === "local" && preset.origin !== "local") return false;
      if ((filter === "video" || filter === "image") && entry?.surface !== filter) return false;
      if (!q) return true;
      return `${preset.title} ${preset.blurb ?? ""} ${preset.tags?.join(" ") ?? ""} ${entry?.label ?? ""} ${preset.prompt}`
        .toLowerCase()
        .includes(q);
    });
  }, [presets, query, filter]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="ohf-explore-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="ohf-dialog-panel ohf-explore-panel">
        <div className="ohf-keys-head">
          <div>
            <div id="ohf-explore-title" className="ohf-keys-title">
              Explore
            </div>
            <p className="ohf-keys-copy">
              A preset loads its model, settings and prompt into the composer. Nothing runs until you press
              Generate.
            </p>
          </div>
          <button type="button" className="ohf-icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={13} />
          </button>
        </div>

        <div className="ohf-explore-tools">
          <label className="ohf-explore-search">
            <SearchIcon size={14} />
            <input
              ref={searchRef}
              className="ohf-explore-input"
              value={query}
              placeholder="Search presets, tags, models"
              aria-label="Search presets"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="ohf-explore-filters" role="group" aria-label="Filter presets">
            {filters.map((id) => (
              <button
                key={id}
                type="button"
                className="ohf-chip"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {FILTER_LABELS[id]}
              </button>
            ))}
          </div>
        </div>

        <div className="ohf-explore-grid ohf-scroll">
          {presets === null && <div className="ohf-explore-empty">Loading presets…</div>}
          {presets !== null && shown.length === 0 && (
            <div className="ohf-explore-empty">No preset matches “{query.trim()}”.</div>
          )}
          {shown.map((preset) => {
            const entry = MODELS.find((model) => model.id === preset.model);
            const ready = !readyModels || readyModels.has(preset.model);
            return (
              <article key={preset.id} className="ohf-explore-card">
                <button
                  type="button"
                  className="ohf-explore-thumb"
                  style={preset.thumb ? undefined : { background: swatchFor(entry?.surface ?? "video", preset.id) }}
                  onClick={() => onApply(preset)}
                  aria-label={`Use preset: ${preset.title}`}
                >
                  {preset.thumb && <img src={preset.thumb} alt="" loading="lazy" />}
                  <span className="ohf-explore-model">{entry?.label ?? preset.model}</span>
                  {!ready && (
                    <span className="ohf-explore-warn" title={`${entry?.label ?? preset.model} is not verified on ${providerLabel}`}>
                      Higgsfield key
                    </span>
                  )}
                </button>
                <div className="ohf-explore-body">
                  <div className="ohf-explore-title">{preset.title}</div>
                  {preset.blurb && <p className="ohf-explore-blurb">{preset.blurb}</p>}
                  {preset.tags && preset.tags.length > 0 && (
                    <div className="ohf-explore-tags">
                      {preset.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="ohf-explore-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="ohf-explore-foot">
                    {preset.source ? (
                      preset.source.url ? (
                        <a className="ohf-explore-source" href={preset.source.url} target="_blank" rel="noreferrer">
                          {preset.source.label}
                        </a>
                      ) : (
                        <span className="ohf-explore-source">{preset.source.label}</span>
                      )
                    ) : (
                      <span className="ohf-explore-source">{preset.origin === "builtin" ? "Template" : "Imported"}</span>
                    )}
                    <button type="button" className="ohf-keys-save ohf-explore-use" onClick={() => onApply(preset)}>
                      Use
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
