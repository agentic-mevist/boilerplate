import * as THREE from "three";
import { rootDomain } from "../../shared/domain";
import { faviconUrl } from "../api";

/**
 * One texture holding every favicon (16×16 cells of 64px), so all key-caps
 * render in a single draw call. Icons stream in as they load; unknown sites
 * get a colored monogram.
 */
const CELL = 64;
const GRID = 16;
const SIZE = CELL * GRID;

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
  slots = new Map<string, number>();
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
    if (slot == null) {
      slot = this.slots.size % (GRID * GRID);
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
    roundRect(ctx, x + 6, y + 6, CELL - 12, CELL - 12, 12);
    ctx.fillStyle = PALETTE[h]!;
    ctx.fill();
    ctx.fillStyle = INK[h]!;
    ctx.font = `600 ${CELL * 0.44}px Geist, Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((key[0] ?? "?").toUpperCase(), x + CELL / 2, y + CELL / 2 + 2);
    this.dirty = true;
  }

  private pump() {
    while (this.inflight < 8 && this.queue.length) {
      const key = this.queue.shift()!;
      this.inflight++;
      this.load(key).finally(() => {
        this.inflight--;
        this.pump();
      });
    }
  }

  private async load(key: string) {
    try {
      const res = await fetch(faviconUrl(key));
      if (!res.ok || res.headers.get("x-favicon-default") === "1") return;
      const bmp = await createImageBitmap(await res.blob());
      const slot = this.slots.get(key)!;
      const [x, y] = this.cellXY(slot);
      const ctx = this.ctx;
      ctx.clearRect(x, y, CELL, CELL);
      ctx.save();
      roundRect(ctx, x + 6, y + 6, CELL - 12, CELL - 12, 10);
      ctx.clip();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, x + 6, y + 6, CELL - 12, CELL - 12);
      ctx.restore();
      this.dirty = true;
    } catch {
      /* keep the monogram */
    }
  }
}

let atlas: FaviconAtlas | null = null;
export const getAtlas = () => (atlas ??= new FaviconAtlas());

/** A standalone square texture for one domain (used by the hub). */
export function singleIcon(domain: string, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  const key = rootDomain(domain);
  const h = hash(key) % PALETTE.length;
  const drawMono = () => {
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
  };
  drawMono();
  fetch(faviconUrl(key))
    .then(async (res) => {
      if (!res.ok || res.headers.get("x-favicon-default") === "1") return;
      const bmp = await createImageBitmap(await res.blob());
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      roundRect(ctx, 0, 0, size, size, size * 0.2);
      ctx.clip();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, size, size);
      ctx.restore();
      tex.needsUpdate = true;
    })
    .catch(() => {});
  return tex;
}
