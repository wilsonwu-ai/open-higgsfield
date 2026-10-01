import { create } from "zustand";

/* What the server said about the platform answering: read once per mount by
   the studio, read anywhere a control needs it (the model picker's tags). Not
   persisted — the server is the truth and is asked again on every load. */

type StudioState = {
  providerLabel: string | null;
  serverKey: boolean;
  /** Catalog ids verified on the active provider; null = all of them. */
  readyModels: ReadonlySet<string> | null;
  setInfo: (info: { providerLabel: string; serverKey: boolean; readyModels: string[] | null }) => void;
};

export const useStudio = create<StudioState>()((set) => ({
  providerLabel: null,
  serverKey: false,
  readyModels: null,
  setInfo: (info) =>
    set({
      providerLabel: info.providerLabel,
      serverKey: info.serverKey,
      readyModels: info.readyModels ? new Set(info.readyModels) : null,
    }),
}));
