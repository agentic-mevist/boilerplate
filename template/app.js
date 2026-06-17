/* Deterministic reel renderer.
 *
 * The renderer (Playwright) injects `window.__REEL__` with the timeline, then
 * repeatedly calls `window.seek(tMs)`. seek() is a PURE function of time: given
 * the same t it always produces the same pixels. That is what makes frame
 * capture frame-perfect and reproducible.
 *
 * Timeline shape:
 * {
 *   peer: { name },
 *   durationMs, fps,
 *   messages: [{ side:"in"|"out", text, appearAt, typingFrom? }]
 * }
 */

const ENTER_MS = 420;        // entrance animation length
const GAP = 26;              // must match CSS gap-ish spacing between rows
const TYPING_MIN = 700;      // minimum typing-indicator visibility (ms)

const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

let ITEMS = [];              // built render items (typing + message), with measured heights
let innerEl, nameEl;

function buildItems(reel) {
  innerEl.innerHTML = "";
  const items = [];

  for (const m of reel.messages) {
    // Incoming messages get a typing indicator that occupies the slot first.
    if (m.side === "in") {
      const typingFrom = m.typingFrom != null
        ? m.typingFrom
        : Math.max(0, m.appearAt - 1100);
      if (m.appearAt - typingFrom >= TYPING_MIN) {
        items.push({
          kind: "typing",
          side: "in",
          start: typingFrom,
          end: m.appearAt,          // replaced by the real bubble at appearAt
        });
      }
    }
    items.push({
      kind: "msg",
      side: m.side,
      text: m.text,
      start: m.appearAt,
      end: Infinity,
    });
  }

  // Materialize DOM for each item, measure natural height, keep element.
  for (const it of items) {
    const row = document.createElement("div");
    row.className = `row ${it.side}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (it.kind === "typing") {
      bubble.classList.add("typing");
      bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    } else {
      bubble.textContent = it.text;
    }
    row.appendChild(bubble);
    innerEl.appendChild(row);
    it.el = row;
  }

  // Measure once (layout is deterministic for the fixed 1080px viewport).
  for (const it of items) {
    it.height = it.el.getBoundingClientRect().height;
    it.el.style.position = "absolute";
    it.el.style.left = "0";
    it.el.style.right = "0";
    it.el.style.bottom = "0";
    it.el.style.opacity = "0";
    it.el.style.willChange = "transform, opacity";
  }
  return items;
}

function seek(tMs) {
  // Determine which items are live at time t, in chronological order.
  const live = [];
  for (const it of ITEMS) {
    if (tMs >= it.start && tMs < it.end) live.push(it);
  }

  // Hide everything first.
  for (const it of ITEMS) {
    if (!live.includes(it)) it.el.style.opacity = "0";
  }

  // Newest live item is the one with the greatest start (bottom of stack).
  live.sort((a, b) => a.start - b.start);

  // Stack from the bottom. The newest (last) item has the largest start and
  // sits at offset 0; its entrance grows its "effective height", easing the
  // older items upward for a smooth auto-scroll feel.
  let offset = 0;
  for (let i = live.length - 1; i >= 0; i--) {
    const it = live[i];
    const p = easeOut(clamp01((tMs - it.start) / ENTER_MS));
    const effHeight = it.height * (i === live.length - 1 ? p : 1);

    const slide = (1 - p) * 26;     // small upward pop
    const scale = 0.965 + 0.035 * p;
    it.el.style.opacity = String(p);
    it.el.style.transformOrigin = it.side === "out" ? "right bottom" : "left bottom";
    it.el.style.transform =
      `translateY(${offset}px) translateY(${slide}px) scale(${scale})`;

    offset -= (effHeight + GAP);
  }

  // animate the typing dots (still deterministic: based on t)
  const phase = (tMs / 1000) % 1;
  document.querySelectorAll(".typing").forEach((tp) => {
    const dots = tp.querySelectorAll(".dot");
    dots.forEach((d, idx) => {
      const local = (phase + idx * 0.18) % 1;
      const up = Math.sin(local * Math.PI);
      d.style.transform = `translateY(${-12 * up}px)`;
      d.style.opacity = String(0.45 + 0.55 * up);
    });
  });
}

function init() {
  const reel = window.__REEL__;
  innerEl = document.getElementById("thread-inner");
  nameEl = document.getElementById("peer-name");
  if (reel.peer && reel.peer.name) nameEl.textContent = reel.peer.name;
  ITEMS = buildItems(reel);
  seek(0);
  window.__READY__ = true;
}

window.seek = seek;
window.addEventListener("DOMContentLoaded", init);
