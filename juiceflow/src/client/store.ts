import { create } from "zustand";
import { DEFAULT_PARAMS, runModel, type JuiceResult, type ModelParams } from "../shared/model";
import type { AnalyzeResponse } from "../shared/types";
import { DEFAULT_JUICE, loadJuice, saveJuice, type JuiceId } from "./juices";
import type { LayoutMode } from "./scene/layout";

export type Status = "idle" | "loading" | "ready" | "error";

/** Camera commands from the HUD (zoom buttons, fit, focus on a source). */
export interface ViewCmd {
  kind: "fit" | "zoom" | "focus";
  factor?: number;
  id?: string;
  n: number;
}

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
  /** Which juice flows: colors the liquid, the cards and the accents. */
  juice: JuiceId;
  /** Bumped on every new result so the scene can replay its entrance animation. */
  revealKey: number;
  view: ViewCmd;
  /** Current zoom relative to "fit to screen", in percent. */
  zoomPct: number;
  zoomBy: (factor: number) => void;
  fitView: () => void;
  focusOn: (id: string) => void;
  setZoomPct: (p: number) => void;
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
  setJuice: (j: JuiceId) => void;
}

export const useStore = create<State>((set, get) => ({
  status: "idle",
  domain: null,
  payload: null,
  result: null,
  error: null,
  params: DEFAULT_PARAMS,
  mode: typeof window !== "undefined" && window.innerWidth < 760 ? "vortex" : "funnel",
  showLost: false,
  hovered: null,
  selected: null,
  panel: null,
  howOpen: false,
  juice: typeof window !== "undefined" ? loadJuice() : DEFAULT_JUICE,
  revealKey: 0,
  view: { kind: "fit", n: 0 },
  zoomPct: 100,
  zoomBy: (factor) => set((s) => ({ view: { kind: "zoom", factor, n: s.view.n + 1 } })),
  fitView: () => set((s) => ({ view: { kind: "fit", n: s.view.n + 1 } })),
  focusOn: (id) => set((s) => ({ view: { kind: "focus", id, n: s.view.n + 1 } })),
  setZoomPct: (zoomPct) => (Math.abs(get().zoomPct - zoomPct) >= 1 ? set({ zoomPct }) : undefined),
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
  // Selecting a source opens its details and pans the board so it stays in view.
  select: (selected) =>
    set((s) => ({
      selected,
      panel: selected ? "sources" : s.panel,
      view: selected ? { kind: "focus", id: selected, n: s.view.n + 1 } : s.view,
    })),
  setPanel: (panel) => set({ panel, hovered: null }),
  setHowOpen: (howOpen) => set({ howOpen, hovered: null }),
  setJuice: (juice) => {
    saveJuice(juice);
    set({ juice });
  },
}));
