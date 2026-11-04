import * as THREE from "three";
import { rootDomain } from "../../shared/domain";
import { faviconUrl, hdFaviconUrl } from "../api";

/**
 * One texture holding every key-cap favicon (12×12 cells of 128px), so all key-caps render in a
 * single draw call. Icons stream in as they load; unknown sites get a colored monogram. When the
 * cells run out, the icon used least recently gives up its cell.
 */
const CELL = 128;
const GRID = 12;
const SIZE = CELL * GRID;
const PAD = CELL * 0.094;

const PALETTE = ["#ffd9c7", "#d9e8ff", "#dff3e4", "#f3e1fb", "#fff0bf", "#d7f2f3", "#fde0e7", "#e6e3ff"];
const INK = ["#c2410c", "#1d4ed8", "#15803d", "#7e22ce", "#a16207", "#0e7490", "#be185d", "#4338ca"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Turns a favicon response into something drawable. SVGs are rasterized at `size` (vector-sharp);
 * the returned `done` frees what the image needed once it has been drawn.
 */
async function decodeIcon(res: Response, size: number): Promise<{ img: CanvasImageSource; done: () => void } | null> {
  if (!(res.headers.get("content-type") ?? "").includes("svg")) {
    const bmp = await createImageBitmap(await res.blob());
    return { img: bmp, done: () => bmp.close() };
  }
  const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) return null;
  // give it a viewBox (so it scales) and our size (so it's drawn sharp, not stretched from a small bitmap)
  if (!svg.getAttribute("viewBox")) {
    const w = svg.getAttribute("width") ?? "", h = svg.getAttribute("height") ?? "";
    if (!w.includes("%") && !h.includes("%") && parseFloat(w) > 0 && parseFloat(h) > 0) svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
  }
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
  const img = new Image(size, size);
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
  return { img, done: () => URL.revokeObjectURL(url) };
}

export interface AtlasRect {
  u: number;
  v: number;
  du: number;
  dv: number;
}

class FaviconAtlas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  /** Domain → cell, least recently used first. */
  private slots = new Map<string, number>();
  private free: number[] = Array.from({ length: GRID * GRID }, (_, i) => i);
  private dirty = false;
  private queue: string[] = [];
  private inflight = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.anisotropy = 8;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    const tick = () => {
      if (this.dirty) {
        this.texture.needsUpdate = true;
        this.dirty = false;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  rect(domain: string): AtlasRect {
    const key = rootDomain(domain);
    let slot = this.slots.get(key);
    if (slot != null) {
      // mark as recently used
      this.slots.delete(key);
      this.slots.set(key, slot);
    } else {
      slot = this.free.pop();
      if (slot == null) {
        const [oldest, s] = this.slots.entries().next().value!;
        this.slots.delete(oldest);
        slot = s;
      }
      this.slots.set(key, slot);
      this.drawMonogram(slot, key);
      this.queue.push(key);
      this.pump();
    }
    const cx = slot % GRID, cy = Math.floor(slot / GRID);
    const pad = 1 / SIZE;
    // Canvas y grows downward; texture v grows upward (flipY).
    return { u: (cx * CELL) / SIZE + pad, v: 1 - ((cy + 1) * CELL) / SIZE + pad, du: CELL / SIZE - 2 * pad, dv: CELL / SIZE - 2 * pad };
  }

  private cellXY(slot: number) {
    return [(slot % GRID) * CELL, Math.floor(slot / GRID) * CELL] as const;
  }

  private drawMonogram(slot: number, key: string) {
    const [x, y] = this.cellXY(slot);
    const ctx = this.ctx;
    const h = hash(key) % PALETTE.length;
    ctx.clearRect(x, y, CELL, CELL);
    roundRect(ctx, x + PAD, y + PAD, CELL - 2 * PAD, CELL - 2 * PAD, CELL * 0.19);
    ctx.fillStyle = PALETTE[h]!;
    ctx.fill();
    ctx.fillStyle = INK[h]!;
    ctx.font = `600 ${CELL * 0.44}px Geist, Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((key[0] ?? "?").toUpperCase(), x + CELL / 2, y + CELL / 2 + CELL * 0.03);
    this.dirty = true;
  }

  private pump() {
    while (this.inflight < 8 && this.queue.length) {
      const key = this.queue.shift()!;
      if (!this.slots.has(key)) continue; // gave up its cell before it loaded
      this.inflight++;
      this.load(key).finally(() => {
        this.inflight--;
        this.pump();
      });
    }
  }

  private async load(key: string) {
    try {
      const res = await fetch(faviconUrl(key, CELL));
      if (!res.ok || res.headers.get("x-favicon-default") === "1") return;
      const icon = await decodeIcon(res, CELL);
      const slot = this.slots.get(key);
      if (!icon || slot == null) return;
      const [x, y] = this.cellXY(slot);
      const ctx = this.ctx;
      ctx.clearRect(x, y, CELL, CELL);
      ctx.save();
      roundRect(ctx, x + PAD, y + PAD, CELL - 2 * PAD, CELL - 2 * PAD, CELL * 0.16);
      ctx.clip();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(icon.img, x + PAD, y + PAD, CELL - 2 * PAD, CELL - 2 * PAD);
      ctx.restore();
      icon.done();
      this.dirty = true;
    } catch {
      /* keep the monogram */
    }
  }
}

let atlas: FaviconAtlas | null = null;
export const getAtlas = () => (atlas ??= new FaviconAtlas());

/** A standalone square texture for one domain (your own site, in the middle): its sharpest icon. */
export function singleIcon(domain: string, size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  // drawn by a standard material, which converts to the screen's colors: mark it sRGB (not raw) so it isn't washed out
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const key = rootDomain(domain);
  const h = hash(key) % PALETTE.length;
  ctx.clearRect(0, 0, size, size);
  roundRect(ctx, 0, 0, size, size, size * 0.22);
  ctx.fillStyle = PALETTE[h]!;
  ctx.fill();
  ctx.fillStyle = INK[h]!;
  ctx.font = `600 ${size * 0.46}px Geist, Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((key[0] ?? "?").toUpperCase(), size / 2, size / 2 + size * 0.03);
  tex.needsUpdate = true;
  fetch(hdFaviconUrl(key))
    .then(async (res) => {
      if (!res.ok || res.headers.get("x-favicon-default") === "1") return;
      const icon = await decodeIcon(res, size);
      if (!icon) return;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      roundRect(ctx, 0, 0, size, size, size * 0.2);
      ctx.clip();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(icon.img, 0, 0, size, size);
      ctx.restore();
      icon.done();
      tex.needsUpdate = true;
    })
    .catch(() => {});
  return tex;
}
