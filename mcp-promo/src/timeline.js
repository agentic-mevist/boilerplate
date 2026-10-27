// Global timing. 128 BPM; every scene is a whole number of bars (1.875 s),
// picture and sound are both cut to this grid.
export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const BPM = 128;
export const BEAT = 60 / BPM; // 0.46875 s
export const BAR = BEAT * 4; // 1.875 s
export const beat = (n) => n * BEAT;

// v1 palette (the show reel's roles); kept for the agent window and accents.
export const PAL = {
  ink: "#111318",
  ink2: "#1A1D24",
  paper: "#F2F5EF",
  orange: "#FF5D42",
  cobalt: "#2458FF",
  lime: "#20D68F",
  pink: "#775CFF",
  lilac: "#B9A6FF",
  yellow: "#FFD84A",
  teal: "#1EC8C8",
  mute: "#7B828B",
};

// The website's style guide (public/site/landing.css :root and its panels).
export const HP = {
  paper: "#f7f7f7",
  white: "#ffffff",
  ink: "#0a0a0a",
  muted: "#515151",
  soft: "#6b6b6b", // eyebrow labels
  blue: "#3478f5",
  blueDeep: "#2465d6",
  green: "#c0efad", // the highlighter behind key words
  greenDeep: "#79a663",
  line: "#e4e4e4",
  skyPanel: "#eaf0fc",
  sagePanel: "#eaf0e6",
  navy: "#021838", // the logo's ring
};

// Scene list: id, HUD label, length in bars. The router and the soundtrack
// both read this.
export const CHAPTERS = [
  { key: "hook", title: "AI SUPERPOWERS", bars: 2 },
  { key: "hub", title: "THE HUB", bars: 3 },
  { key: "chat", title: "ASK", bars: 2 },
  { key: "edit", title: "EDIT", bars: 4 },
  { key: "playbooks", title: "PLAYBOOKS", bars: 1 },
  { key: "lookup", title: "RESEARCH", bars: 1 },
  { key: "watch", title: "WATCH", bars: 2 },
  { key: "plan", title: "PLAN", bars: 1 },
  { key: "carousel", title: "MAKE", bars: 1 },
  { key: "board", title: "SHIP", bars: 1 },
  { key: "wall", title: "ALL OF IT", bars: 2 },
  { key: "connect", title: "CONNECT", bars: 2 },
  { key: "identity", title: "HANDLEPILOT", bars: 2 },
];
let acc = 0;
for (const [i, c] of CHAPTERS.entries()) {
  c.id = String(i + 1).padStart(2, "0");
  c.start = acc * BAR;
  acc += c.bars;
  c.end = acc * BAR;
}
export const TOTAL_BARS = acc;
export const DURATION = acc * BAR;
export const chapter = (key) => CHAPTERS.find((c) => c.key === key);
