import { create } from "zustand";
import { DEFAULT_PARAMS, runModel, type JuiceResult, type ModelParams } from "../shared/model";
import type { AnalyzeResponse } from "../shared/types";
import type { LayoutMode } from "./scene/layout";

export type Status = "idle" | "loading" | "ready" | "error";

interface State {
  status: Status;
  domain: string | null;
  payload: AnalyzeResponse | null;
  result: JuiceResult | null;
  error: string | null;
  params: ModelParams;
  mode: LayoutMode;
  showLost: boolean;
  hovered: string | null;
  selected: string | null;
  panel: "sources" | "insights" | null;
  howOpen: boolean;
  /** Bumped on every new result so the scene can replay its entrance animation. */
  revealKey: number;
  setPayload: (p: AnalyzeResponse) => void;
  setStatus: (s: Status, error?: string | null) => void;
  setDomain: (d: string | null) => void;
  setParams: (p: Partial<ModelParams>) => void;
  resetParams: () => void;
  setMode: (m: LayoutMode) => void;
  setShowLost: (v: boolean) => void;
  hover: (id: string | null) => void;
  select: (id: string | null) => void;
  setPanel: (p: State["panel"]) => void;
  setHowOpen: (v: boolean) => void;
}

export const useStore = create<State>((set, get) => ({
  status: "idle",
  domain: null,
  payload: null,
  result: null,
  error: null,
  params: DEFAULT_PARAMS,
  mode: "funnel",
  showLost: false,
  hovered: null,
  selected: null,
  panel: null,
  howOpen: false,
  revealKey: 0,
  setPayload: (payload) =>
    set((s) => ({
      payload,
      result: runModel(payload, s.params),
      status: "ready",
      error: null,
      selected: null,
      hovered: null,
      revealKey: s.revealKey + 1,
    })),
  setStatus: (status, error = null) => set({ status, error }),
  setDomain: (domain) => set({ domain }),
  setParams: (p) => {
    const params = { ...get().params, ...p };
    const payload = get().payload;
    set({ params, result: payload ? runModel(payload, params) : null });
  },
  resetParams: () => {
    const payload = get().payload;
    set({ params: DEFAULT_PARAMS, result: payload ? runModel(payload, DEFAULT_PARAMS) : null });
  },
  setMode: (mode) => set((s) => ({ mode, revealKey: s.revealKey + 1 })),
  setShowLost: (showLost) => set({ showLost }),
  hover: (hovered) => (get().hovered === hovered ? undefined : set({ hovered })),
  select: (selected) => set({ selected, panel: selected ? "sources" : get().panel }),
  setPanel: (panel) => set({ panel, hovered: null }),
  setHowOpen: (howOpen) => set({ howOpen, hovered: null }),
}));
