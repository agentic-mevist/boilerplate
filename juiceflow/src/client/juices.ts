/**
 * Juice flavors. One palette colors the liquid, the result cards and the UI
 * accents (through CSS variables), so switching juice recolors everything.
 * Colors are sRGB hex; the liquid shader takes them raw.
 */

export type JuiceId = "green" | "orange" | "beet" | "berry" | "blue";

export interface Juice {
  id: JuiceId;
  name: string;
  /** UI accent: buttons, bars, badges. */
  main: string;
  /** Lighter accent for the top of gradients. */
  main2: string;
  /** Accent for text on white (readable). */
  ink: string;
  /** Very light tint for selected chips and highlights. */
  tint: string;
  /** Light border for focused or selected things. */
  line: string;
  // the liquid
  deep: string;
  shallow: string;
  thin: string;
  rim: string;
  foam: string;
  glow: string;
  /** Tint of the shadow the juice throws on the board. */
  shade: string;
}

export const JUICES: Juice[] = [
  {
    id: "green",
    name: "Green juice",
    main: "#43a43a",
    main2: "#5cb94c",
    ink: "#2d7a24",
    tint: "#eef7ea",
    line: "#bfe1b2",
    deep: "#5fae3c",
    shallow: "#8cc65e",
    thin: "#dbeec8",
    rim: "#46902b",
    foam: "#f4faec",
    glow: "#b9df8f",
    shade: "#d3dfc4",
  },
  {
    id: "orange",
    name: "Orange juice",
    main: "#ff6a2b",
    main2: "#ff7a3d",
    ink: "#c2410c",
    tint: "#fff4ee",
    line: "#ffc4a6",
    deep: "#ff6a2b",
    shallow: "#ff9a5c",
    thin: "#ffdcc4",
    rim: "#e8521c",
    foam: "#fff4ea",
    glow: "#ffb27a",
    shade: "#e6c2a6",
  },
  {
    id: "beet",
    name: "Beet juice",
    main: "#cc2f63",
    main2: "#db4677",
    ink: "#a3184b",
    tint: "#fdeef3",
    line: "#f2bdd0",
    deep: "#c92a60",
    shallow: "#e0628c",
    thin: "#f6cfdc",
    rim: "#a8194c",
    foam: "#fff1f6",
    glow: "#f0a2bd",
    shade: "#e5c6d1",
  },
  {
    id: "berry",
    name: "Berry smoothie",
    main: "#7b4fc9",
    main2: "#8d63d6",
    ink: "#5a33a3",
    tint: "#f4effc",
    line: "#d5c5f1",
    deep: "#7a4cbf",
    shallow: "#a07ad6",
    thin: "#e4d8f4",
    rim: "#5e3399",
    foam: "#f8f3fe",
    glow: "#c8acee",
    shade: "#dad0e7",
  },
  {
    id: "blue",
    name: "Blue spirulina",
    main: "#1b98cf",
    main2: "#33a9dd",
    ink: "#0f6a96",
    tint: "#eaf6fc",
    line: "#b3dff2",
    deep: "#1f9fd4",
    shallow: "#5cc2e8",
    thin: "#d0eef9",
    rim: "#157ead",
    foam: "#effaff",
    glow: "#9ddaf3",
    shade: "#c6dce6",
  },
];

export const DEFAULT_JUICE: JuiceId = "green";

export const juiceById = (id: JuiceId): Juice => JUICES.find((j) => j.id === id) ?? JUICES[0]!;

const KEY = "juiceflow.juice";

export function loadJuice(): JuiceId {
  try {
    const v = localStorage.getItem(KEY);
    if (v && JUICES.some((j) => j.id === v)) return v as JuiceId;
  } catch {
    // storage blocked: use the default
  }
  return DEFAULT_JUICE;
}

export function saveJuice(id: JuiceId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // storage blocked: the choice lasts for this visit
  }
}

/** The juice-glass mark (logo and favicon), drawn on a 32×32 grid. */
export function glassSvg(j: Juice, size = 32): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">${glassMarkup(j)}</svg>`;
}

/** Inner markup of the mark, shared by the inline logo and the favicon. */
export function glassMarkup(j: Juice): string {
  return GLASS.replaceAll("{deep}", j.deep).replaceAll("{shallow}", j.shallow).replaceAll("{rim}", j.rim);
}

// A cartoon "bubble" glass: ribbed sides, juice up to near the rim with a lighter surface,
// two bubbles and a glass straw. Drawn on a 32×32 grid; {deep}/{shallow}/{rim} take the juice colors.
const GLASS_OUTLINE = "M7.4 9.2C5.85 9.97 5.85 12.73 7.4 13.5C5.85 14.27 5.85 17.03 7.4 17.8C5.85 18.57 5.85 21.33 7.4 22.1C5.85 22.87 5.85 25.63 7.4 26.4C7.4 28.8 9.32 29.6 11.24 29.6H18.76C20.68 29.6 22.6 28.8 22.6 26.4C24.15 25.63 24.15 22.87 22.6 22.1C24.15 21.33 24.15 18.57 22.6 17.8C24.15 17.03 24.15 14.27 22.6 13.5C24.15 12.73 24.15 9.97 22.6 9.2Z";
const GLASS = [
  `<defs><clipPath id="jf-glass"><path d="${GLASS_OUTLINE}"/></clipPath></defs>`,
  // straw, behind the glass
  `<path d="M17.2 22.5 24.6 2.8" stroke="#1d1c1a" stroke-width="4.2" stroke-linecap="round"/>`,
  `<path d="M17.2 22.5 24.6 2.8" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round"/>`,
  // the glass, then the juice inside it
  `<path d="${GLASS_OUTLINE}" fill="#ffffff"/>`,
  `<g clip-path="url(#jf-glass)">`,
  `<rect y="13.2" width="32" height="20" fill="{deep}"/>`,
  `<rect y="13.2" width="32" height="2.4" fill="{shallow}"/>`,
  `<path d="M17.7 21.2 19.6 16.1" stroke="{rim}" stroke-width="1.9" stroke-linecap="round" opacity=".55"/>`,
  `<circle cx="12.4" cy="24.2" r="1.05" fill="#ffffff" opacity=".7"/>`,
  `<circle cx="14.6" cy="20.6" r=".7" fill="#ffffff" opacity=".6"/>`,
  `</g>`,
  // outline and shine
  `<path d="${GLASS_OUTLINE}" fill="none" stroke="#1d1c1a" stroke-width="2.1" stroke-linejoin="round"/>`,
  `<path d="M10.1 16.8c-.5 1.6-.4 3.4.2 5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>`,
].join("");

/** Points the CSS accents and the browser-tab icon at a juice. */
export function applyJuice(id: JuiceId) {
  const j = juiceById(id);
  const root = document.documentElement.style;
  const vars: Record<string, string> = {
    "--juice": j.main,
    "--juice-2": j.main2,
    "--juice-ink": j.ink,
    "--juice-tint": j.tint,
    "--juice-line": j.line,
    "--juice-rim": j.rim,
    "--juice-glow": j.glow,
  };
  for (const [k, v] of Object.entries(vars)) root.setProperty(k, v);
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = `data:image/svg+xml,${encodeURIComponent(glassSvg(j))}`;
}
