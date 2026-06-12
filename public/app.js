/* Metaphoric Raccoons — associative card table */

const CARDS = ["crossroads", "reflection", "ascent", "shelter", "letting-go"];

const PROMPTS = [
  "What caught your eye first?",
  "What is the mood of this picture?",
  "Where would you be in this scene?",
  "What happened just before this moment?",
  "What does this remind you of in your own life?",
  "What would you say to the raccoon?",
  "What does the raccoon need right now — and do you?",
  "If this card had a title, what would it be?",
  "What in this picture do you want to look away from?",
  "What will happen next in this scene?",
];

const STORAGE_KEY = "metaphoric-raccoons-v1";

const table = document.getElementById("table");
const deckEl = document.getElementById("deck");
const promptBar = document.getElementById("prompt-bar");
const promptText = document.getElementById("prompt-text");
const emptyNote = document.getElementById("empty-deck-note");
const popover = document.getElementById("note-popover");
const noteInput = document.getElementById("note-input");
const intentionInput = document.getElementById("intention-input");
const howDialog = document.getElementById("how-dialog");

let state = {
  deck: shuffle([...CARDS]),
  drawn: [], // { id, x, y (fractions of table), tilt, note }
  intention: "",
  seenIntro: false,
};

let zTop = 10;
let activeCardId = null; // card whose note popover is open
let promptIdx = Math.floor(Math.random() * PROMPTS.length);

/* ---------- persistence ---------- */

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) { /* private mode etc. — just don't persist */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.deck) && Array.isArray(parsed.drawn)) {
      state = { ...state, ...parsed };
    }
  } catch (_) { /* corrupted state — start fresh */ }
}

/* ---------- helpers ---------- */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function tableRect() {
  return table.getBoundingClientRect();
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/* ---------- rendering ---------- */

function cardEl(id) {
  return table.querySelector(`.card[data-id="${id}"]`);
}

function renderCard(entry, { dealing = false } = {}) {
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.id = entry.id;
  el.style.setProperty("--tilt", entry.tilt + "deg");
  el.style.zIndex = ++zTop;

  el.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-front">
        <img src="cards/${entry.id}.webp" alt="metaphoric card" draggable="false" />
      </div>
      <div class="card-face card-back"></div>
    </div>
    <div class="card-note"></div>`;

  el.querySelector(".card-note").textContent = entry.note || "";
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
      // flip face-up shortly after landing
      setTimeout(() => el.classList.remove("face-down"), 120);
    }, { once: true });
  }

  makeDraggable(el, entry);
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
  updateDeck();
  intentionInput.value = state.intention || "";
}

function updateDeck() {
  const empty = state.deck.length === 0;
  deckEl.classList.toggle("empty", empty);
  deckEl.setAttribute("aria-disabled", String(empty));
  emptyNote.hidden = !empty;
  promptBar.hidden = state.drawn.length === 0;
}

/* ---------- drawing a card ---------- */

function drawCard() {
  if (state.deck.length === 0) return;
  const id = state.deck.shift();

  const r = tableRect();
  const cardW = table.querySelector(".deck").offsetWidth;
  // land somewhere in the middle-right area, with slight randomness
  const x = clamp(0.32 + Math.random() * 0.45, 0.05, 1 - (cardW + 20) / r.width);
  const y = clamp(0.12 + Math.random() * 0.45, 0.04, 0.6);
  const entry = {
    id,
    x,
    y,
    tilt: (Math.random() * 8 - 4).toFixed(1),
    note: "",
  };
  state.drawn.push(entry);
  renderCard(entry, { dealing: true });
  nextPrompt();
  updateDeck();
  save();
}

deckEl.addEventListener("click", drawCard);
deckEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    drawCard();
  }
});

/* ---------- dragging ---------- */

function makeDraggable(el, entry) {
  let startX, startY, origLeft, origTop, moved;

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    closePopover();
    el.setPointerCapture(e.pointerId);
    el.style.zIndex = ++zTop;
    startX = e.clientX;
    startY = e.clientY;
    origLeft = el.offsetLeft;
    origTop = el.offsetTop;
    moved = false;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 5) {
        moved = true;
        el.classList.add("dragging");
      }
      if (!moved) return;
      const r = tableRect();
      const left = clamp(origLeft + dx, -el.offsetWidth * 0.3, r.width - el.offsetWidth * 0.7);
      const top = clamp(origTop + dy, 0, r.height - el.offsetHeight * 0.5);
      el.style.left = left + "px";
      el.style.top = top + "px";
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
        openPopover(el, entry);
      }
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  });
}

/* ---------- note popover ---------- */

function openPopover(el, entry) {
  activeCardId = entry.id;
  noteInput.value = entry.note || "";
  popover.hidden = false;

  const cardR = el.getBoundingClientRect();
  const popW = popover.offsetWidth;
  const popH = popover.offsetHeight;
  let left = cardR.right + 12;
  if (left + popW > window.innerWidth - 8) left = cardR.left - popW - 12;
  if (left < 8) left = clamp(cardR.left, 8, window.innerWidth - popW - 8);
  const top = clamp(cardR.top, 8, window.innerHeight - popH - 8);
  popover.style.left = left + "px";
  popover.style.top = top + "px";
  noteInput.focus();
}

function closePopover() {
  popover.hidden = true;
  activeCardId = null;
}

function activeEntry() {
  return state.drawn.find((d) => d.id === activeCardId);
}

document.getElementById("note-save").addEventListener("click", () => {
  const entry = activeEntry();
  if (entry) {
    entry.note = noteInput.value.trim();
    cardEl(entry.id).querySelector(".card-note").textContent = entry.note;
    save();
  }
  closePopover();
});

document.getElementById("note-return").addEventListener("click", () => {
  const entry = activeEntry();
  if (entry) {
    state.drawn = state.drawn.filter((d) => d !== entry);
    state.deck.push(entry.id);
    shuffle(state.deck);
    cardEl(entry.id)?.remove();
    updateDeck();
    save();
  }
  closePopover();
});

noteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("note-save").click();
  }
  if (e.key === "Escape") closePopover();
});

document.addEventListener("pointerdown", (e) => {
  if (!popover.hidden && !popover.contains(e.target) && !e.target.closest(".card")) {
    closePopover();
  }
});

/* ---------- prompts ---------- */

function nextPrompt() {
  promptIdx = (promptIdx + 1 + Math.floor(Math.random() * (PROMPTS.length - 1))) % PROMPTS.length;
  promptText.textContent = PROMPTS[promptIdx];
}

document.getElementById("prompt-next").addEventListener("click", nextPrompt);

/* ---------- intention, reset, intro ---------- */

intentionInput.addEventListener("input", () => {
  state.intention = intentionInput.value;
  save();
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (state.drawn.length && !confirm("Clear the table and reshuffle the deck?")) return;
  closePopover();
  state.deck = shuffle([...CARDS]);
  state.drawn = [];
  state.intention = "";
  renderAll();
  save();
});

document.getElementById("how-btn").addEventListener("click", () => howDialog.showModal());

/* keep fractional positions correct on resize */
window.addEventListener("resize", () => {
  state.drawn.forEach((entry) => {
    const el = cardEl(entry.id);
    if (el) positionCard(el, entry);
  });
});

/* ---------- init ---------- */

load();
nextPrompt();
renderAll();

if (!state.seenIntro) {
  howDialog.showModal();
  state.seenIntro = true;
  save();
}
