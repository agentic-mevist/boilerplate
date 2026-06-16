/* Метафорические Еноты — стол ассоциативных карт */

const CARDS = [
  "crossroads", "reflection", "ascent", "shelter", "letting-go",
  "mask", "lantern", "key", "bridge", "garden",
  "thread", "campfire", "teatime", "boat", "shadow",
  "doors", "window-rain", "kite", "sprout", "burden",
  "memories", "cocoon", "tug-of-war", "embrace", "apart",
  "well", "treasure", "kintsugi", "umbrella", "sunrise",
  "starfield", "maze", "anchor", "floating", "stone-door",
  "compass", "clock", "spilled", "swing", "seasons",
  "fishing", "free-bird", "cliff-edge", "lighthouse", "roots",
  "offering", "map", "balance-stones", "tightrope", "balloon-ride",
];
const DECK_TOTAL = 50; // заявленный размер колоды; остальные карты появятся позже
const STORAGE_KEY = "metaphoric-raccoons-v2";
const TG_GREETING = "Здравствуйте, Дарья! Хочу обсудить с вами свой расклад метафорических карт:";

const table = document.getElementById("table");
const deckEl = document.getElementById("deck");
const deckLabel = document.getElementById("deck-label");
const intentionInput = document.getElementById("intention-input");
const discussBtn = document.getElementById("discuss-btn");
const sharedBanner = document.getElementById("shared-banner");
const howDialog = document.getElementById("how-dialog");
const shareDialog = document.getElementById("share-dialog");
const shareMessage = document.getElementById("share-message");
const shareTg = document.getElementById("share-tg");
const zoom = document.getElementById("zoom");
const zoomImg = document.getElementById("zoom-img");
const toastEl = document.getElementById("toast");

let state = { drawn: [], intention: "", seenIntro: false };
let zTop = 10;
let sharedView = false;

/* ---------- persistence ---------- */

function save() {
  if (sharedView) return; // не затираем собственный расклад, пока смотрим чужой
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.drawn)) state = { ...state, ...parsed };
  } catch (_) {}
}

/* ---------- helpers ---------- */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function tableRect() { return table.getBoundingClientRect(); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function cardEl(id) { return table.querySelector(`.card[data-id="${id}"]`); }

function onTableIds() { return state.drawn.map((d) => d.id); }
function availableToDraw() { return CARDS.filter((id) => !onTableIds().includes(id)); }

function toast(text) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toastEl.hidden = true; }, 2600);
}

/* ---------- share spread <-> compact payload ---------- */

function payloadOf(drawn) {
  return drawn.map((d) => [
    CARDS.indexOf(d.id),
    +Number(d.x).toFixed(3),
    +Number(d.y).toFixed(3),
    +Number(d.tilt).toFixed(1),
  ]);
}

function spreadFrom(arr) {
  if (!Array.isArray(arr)) return null;
  return arr.filter((r) => CARDS[r[0]]).map((r) => ({ id: CARDS[r[0]], x: r[1], y: r[2], tilt: r[3] }));
}

// fallback if the API is unreachable: encode the whole spread inline (longer URL)
function encodeInline(drawn) {
  return btoa(JSON.stringify(payloadOf(drawn))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeInline(token) {
  try {
    return spreadFrom(JSON.parse(atob(token.replace(/-/g, "+").replace(/_/g, "/"))));
  } catch (_) { return null; }
}

/* ---------- rendering ---------- */

function renderCard(entry, { dealing = false } = {}) {
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.id = entry.id;
  el.style.setProperty("--tilt", entry.tilt + "deg");
  el.style.zIndex = ++zTop;
  el.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-front">
        <img src="cards/${entry.id}.webp" alt="Метафорическая карта" draggable="false" />
      </div>
      <div class="card-face card-back"></div>
    </div>`;
  positionCard(el, entry);
  table.appendChild(el);

  if (dealing) {
    const r = tableRect();
    const deckR = deckEl.getBoundingClientRect();
    el.style.setProperty("--deal-dx", deckR.left - (r.left + entry.x * r.width) + "px");
    el.style.setProperty("--deal-dy", deckR.top - (r.top + entry.y * r.height) + "px");
    el.classList.add("dealing", "face-down");
    el.addEventListener("animationend", () => {
      el.classList.remove("dealing");
      setTimeout(() => el.classList.remove("face-down"), 120);
    }, { once: true });
  }
  makeInteractive(el, entry);
  return el;
}

function positionCard(el, entry) {
  const r = tableRect();
  el.style.left = entry.x * r.width + "px";
  el.style.top = entry.y * r.height + "px";
}

function renderAll() {
  table.querySelectorAll(".card").forEach((el) => el.remove());
  state.drawn.forEach((entry) => renderCard(entry));
  intentionInput.value = state.intention || "";
  updateDeck();
}

function updateDeck() {
  const empty = availableToDraw().length === 0;
  deckEl.classList.toggle("empty", empty);
  deckEl.setAttribute("aria-disabled", String(empty));
  deckLabel.textContent = empty ? "карты разложены" : "вытянуть карту";
  discussBtn.hidden = state.drawn.length === 0;
}

/* ---------- drawing ---------- */

function drawCard() {
  const pool = availableToDraw();
  if (pool.length === 0) return;
  const id = pool[Math.floor(Math.random() * pool.length)];

  const r = tableRect();
  const deckR = deckEl.getBoundingClientRect();
  const cardW = deckR.width;
  const cardH = deckR.height;
  // cards must land to the right of the deck column, never on top of it
  const maxX = Math.max(0.4, 1 - (cardW + 18) / r.width);
  const minX = Math.min(maxX - 0.02, (deckR.right - r.left + 22) / r.width);
  const maxY = Math.max(0.1, 1 - (cardH + 18) / r.height);
  const entry = {
    id,
    x: clamp(minX + Math.random() * Math.max(0.02, maxX - minX), minX, maxX),
    y: clamp(0.06 + Math.random() * 0.4, 0.04, Math.min(0.5, maxY)),
    tilt: +(Math.random() * 8 - 4).toFixed(1),
  };
  state.drawn.push(entry);
  renderCard(entry, { dealing: true });
  updateDeck();
  save();
}

deckEl.addEventListener("click", drawCard);
deckEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drawCard(); }
});

/* ---------- shuffle ---------- */

document.getElementById("shuffle-btn").addEventListener("click", () => {
  deckEl.animate(
    [
      { transform: "rotate(0deg)" },
      { transform: "rotate(-4deg) translateX(-4px)" },
      { transform: "rotate(4deg) translateX(4px)" },
      { transform: "rotate(0deg)" },
    ],
    { duration: 380, easing: "ease-in-out" }
  );
  toast("Колода перемешана");
});

/* ---------- drag + zoom ---------- */

function makeInteractive(el, entry) {
  let startX, startY, origLeft, origTop, moved;

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    el.setPointerCapture(e.pointerId);
    el.style.zIndex = ++zTop;
    startX = e.clientX; startY = e.clientY;
    origLeft = el.offsetLeft; origTop = el.offsetTop;
    moved = false;

    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 6) { moved = true; el.classList.add("dragging"); }
      if (!moved) return;
      const r = tableRect();
      el.style.left = clamp(origLeft + dx, -el.offsetWidth * 0.3, r.width - el.offsetWidth * 0.7) + "px";
      el.style.top = clamp(origTop + dy, 0, r.height - el.offsetHeight * 0.5) + "px";
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.classList.remove("dragging");
      if (moved) {
        const r = tableRect();
        entry.x = el.offsetLeft / r.width;
        entry.y = el.offsetTop / r.height;
        save();
      } else {
        openZoom(entry.id);
      }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  });
}

function openZoom(id) {
  zoomImg.src = `cards/${id}.webp`;
  zoom.hidden = false;
}
function closeZoom() { zoom.hidden = true; zoomImg.removeAttribute("src"); }
document.getElementById("zoom-close").addEventListener("click", closeZoom);
zoom.addEventListener("click", (e) => { if (e.target === zoom) closeZoom(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !zoom.hidden) closeZoom(); });

/* ---------- discuss / share ---------- */

discussBtn.addEventListener("click", openShare);

async function openShare() {
  shareDialog.showModal();
  shareMessage.value = "Готовлю ссылку…";
  shareMessage.style.height = "auto";
  shareTg.classList.add("is-disabled");

  let url;
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadOf(state.drawn)),
    });
    if (!res.ok) throw new Error("api");
    const data = await res.json();
    url = location.origin + location.pathname + "?s=" + data.id;
  } catch (_) {
    url = location.origin + location.pathname + "?s=" + encodeInline(state.drawn);
  }
  fillShare(url);
}

function fillShare(url) {
  const full = TG_GREETING + " " + url;
  shareMessage.value = full;
  // открыть личный чат с Дарьей и подставить текст сообщения
  shareTg.href = "https://t.me/dariametelskaya?text=" + encodeURIComponent(full);
  shareTg.classList.remove("is-disabled");
  shareMessage.style.height = "auto";
  shareMessage.style.height = shareMessage.scrollHeight + 2 + "px";
}

// на части клиентов текст из ссылки не подставляется — кладём его и в буфер обмена
shareTg.addEventListener("click", () => {
  copyText(shareMessage.value).then((ok) => {
    if (ok) toast("Сообщение скопировано — если оно не подставится, вставьте его в чат");
  });
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    shareMessage.select();
    try { return document.execCommand("copy"); } catch (_) { return false; }
  }
}

document.getElementById("share-copy").addEventListener("click", async () => {
  const ok = await copyText(shareMessage.value);
  toast(ok ? "Сообщение скопировано" : "Скопируйте текст вручную");
});


/* ---------- intention, reset, intro ---------- */

intentionInput.addEventListener("input", () => { state.intention = intentionInput.value; save(); });

function startOver() {
  closeZoom();
  if (sharedView) {
    sharedView = false;
    sharedBanner.hidden = true;
    history.replaceState(null, "", location.pathname);
  }
  state = { drawn: [], intention: "", seenIntro: true };
  renderAll();
  save();
}

document.getElementById("reset-btn").addEventListener("click", () => {
  if (state.drawn.length && !confirm("Очистить стол и собрать колоду заново?")) return;
  startOver();
});
document.getElementById("own-spread-btn").addEventListener("click", startOver);
document.getElementById("how-btn").addEventListener("click", () => howDialog.showModal());

window.addEventListener("resize", () => {
  state.drawn.forEach((entry) => { const el = cardEl(entry.id); if (el) positionCard(el, entry); });
});

/* ---------- init ---------- */

async function loadShared(token) {
  if (/^[a-z2-9]{6,16}$/.test(token)) {
    try {
      const res = await fetch("/api/s/" + token);
      if (res.ok) return spreadFrom(await res.json());
    } catch (_) {}
  }
  return decodeInline(token); // inline-encoded fallback link
}

async function init() {
  const token = new URLSearchParams(location.search).get("s");

  if (token) {
    const shared = await loadShared(token);
    if (shared && shared.length) {
      sharedView = true;
      state = { drawn: shared, intention: "", seenIntro: true };
      renderAll();
      sharedBanner.hidden = false;
      return;
    }
    toast("Расклад по ссылке не найден");
  }

  load();
  renderAll();
  if (!state.seenIntro) {
    howDialog.showModal();
    state.seenIntro = true;
    save();
  }
}

init();
