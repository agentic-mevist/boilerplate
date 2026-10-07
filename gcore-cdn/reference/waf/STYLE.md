# Gcore WAF page — extracted design system

Source: https://gcore.com/security/waf, captured 2026-10-07 in headless Chromium 1194, at 1440×900 (dpr 1 and 2) and 390×844 (dpr 2, mobile UA).
Compared against https://gcore.com/cdn and https://gcore.com/.
All values below are computed styles, CSS tokens or asset contents observed on the live page. Anything marked *suggestion* is not from the site.

---

## 1. Summary

- **Light theme.** The default `data-theme="light"`. A moon button toggles dark mode, which is opt-in (see §8).
- **Background:** one warm off-white "light-leak" image fixed to the viewport (`body { background: url(Gcore_Background…png) fixed / cover }`). Sections are transparent, so they **do not alternate**. Dark aubergine colour appears only inside contained cards: the stats band, the image panels of the enterprise cards, the featured pricing card and the bottom CTA. The footer is solid white.
- **One typeface:** Montserrat (variable 100–900). Headlines are 700, display numbers are 800–900, body text is 400–500. Fira Code is declared in the CSS but not used on this page.
- **Brand accent:** orange `#FF4C00` and a 4-stop "brand gradient" `linear-gradient(196deg, #FF9A70 .96%, #FF4C00 30.02%, #FF4C00 64.37%, #FFBC9F 92.1%)`. The gradient fills CTA buttons, badges, tags and big numbers, and is clipped to text for accent headline words.
- **Illustrations:** flat tech line art with thin (~1 px) near-black outlines, white fills, solid orange focal shapes and peach tints, plus hard offset "extrusion" shadows. The two big ones (hero and diagram) are animated Keyshape SVGs on a 4 s loop. Icons are line icons with round caps, either brand-gradient strokes (88 px) or ink strokes (48 px set).

---

## 2. Palette

### Core (light theme as rendered)

| Token / role | Hex / value | Where used |
|---|---|---|
| Brand orange (`--gc-color-gcore-orange`, `action-brand`) | `#FF4C00` | Accent headline words, eyebrows, stat suffixes, step arrows, bullets, pill-tag text and border, logo, illustration focal fills (also `#FE4C00` in SVGs) |
| Brand gradient (`--gc-gradient-brand`) | `196deg: #FF9A70 0.96% → #FF4C00 30.02% → #FF4C00 64.37% → #FFBC9F 92.1%` | Primary buttons, card corner badges, step tags, pricing "START" pill, enterprise banner, FAQ toggles, gradient text (hero "Stop threats", 01/02/03, 25€, industry labels), steps connector line |
| Gradient hover / active | middle stops `#FF6C2E` / `#FF783A` | Button hover / active |
| Brand gradient (badge variant) | `196deg: #FF9A70 23.4%, #FF4C00 50%, #E84803 73.4%, #FFBC9F 117.1%` | Token `--gc-gradient-brand-badge` |
| Vertical brand gradient | `180deg: #FF9A70, #FF4C00 31.881%, #FF4C00 69.573%, #FFBC9F` | 1×20 px dividers in the hero trust row. The same stops are used in the icon-stroke gradients. |
| Orange pressed (`brand-selected` light) | `#D64000` (active `#AD3400`) | Menu icon hover / active |
| Orange border (`action-brand-border`) | `#FF9A70` | Outline-button border, border of the open FAQ item |
| Orange tint bg (`badge-bg-orange`) | `rgba(255,76,0,.10)` | Hero pill-tag background |
| Peach tints | `#FEC0A5`, `#FFCDB7`, `#FFE3D0`, `#FFF3EB` | Illustration secondary fills / pulse-dot ring / brand-minor bg |
| **Ink / text primary** (`--gc-color-gcore-dark`) | `#150C18` | Headlines, nav, primary text, dark buttons, 48 px UI icon strokes |
| Illustration outline | `#221F20` / `#231F20` (hero: `#150C18`) | Line-art strokes |
| Text secondary / supporting | `#5B545F` | Paragraphs, card descriptions, chip text, trust row |
| Text tertiary | `#9A939F` | Footer headings |
| Text action-tertiary | `#403842` | Top bar and footer links |
| Text on dark: label | `#E7E4E0` | Stat labels, CTA subtitle, enterprise banner description |
| Text on dark: supporting | `#F4F3F2` | "/mo", CTA note |
| White | `#FFFFFF` | Cards, header, image panels, text on dark |
| **Dark surface** (`--gc-gradient-dark` base) | `#1E1224` | Stats band, enterprise-card image panels, pricing START card, bottom CTA card (dark-mode page bg) |
| Lavender glow on dark | `rgba(168,130,255,.18)` → 0 | `radial-gradient(49.73% 49.73% at 50% 100%, …)` on every dark surface. The rendered peak at bottom centre measures about `#332346`–`#37264B`. |
| Dark tokens | `#150C18` (bg-primary dark), `#08060B` (page dark), `#2A1F2E`, `#38313A`, `#211A23` | Dark theme, theme-toggle button `#150C18` |
| Chip bg / border | `#F4F3F2` / `#E7E4E0` (`--gc-color-border-gray`) | Feature-card chips. `#E7E4E0` also draws the use-case grid lines. |
| Neutral borders | `#DEDEDE` (header border, top-bar dividers), `#EDEDED` (footer divider) | |
| Neutral fills | `#F5F5F5` ("Contact us" pill), `#E8E3DF` (bg-secondary token; diagram connector curves) | |
| Diagram dot texture | `#D8D8E3` | 2400 tiny rounded dots on the PoP-stack plates |
| Page background image (4 colours) | `#FBF9F8` (core), `#F9F4F0`, `#F8EFE9`, `#F9EBE3` (peach) | Fixed body bg, see §5 |

### Shadows and glows (all observed)

| Name | Value | Used on |
|---|---|---|
| brand-glow-lg | `0 15px 55px 0 rgba(255,76,0,.15)` | Feature cards (4) |
| brand-glow | `0 10px 45px 0 rgba(255,76,0,.10)` | Enterprise-card bodies, pricing cards, enterprise banner, CTA card, callout pill |
| workflow pill | `0 10px 35px 0 rgba(255,76,0,.15)` | Check-list pill under the diagram |
| FAQ item (open) | `0 12px 24px -12px rgba(255,76,0,.15)` | The expanded FAQ card only. Closed cards have no shadow |
| btn-gradient | `0 2px 0 rgba(255,76,0,.15), 0 8px 10px rgba(255,76,0,.25)` | Gradient buttons |
| step arrow | `0 4.571px 11.429px -2.286px rgba(255,76,0,.35)` | 32 px orange arrow circles |
| header | `0 12px 22px -16px rgba(21,12,24,.16), 0 2px 12px -6px rgba(21,12,24,.16)` | Floating nav bar |
| pulse dot | ring `0 0 0 3px #FFE3D0` plus animated `0 0 0 0→8px rgba(255,76,0,.55→0)` | Callout dot |

Shadows are **orange-tinted**, never grey, except on the header.

### Semantic tokens (defined, rarely visible)
positive `#439A54` (dark theme `#80F195`), warning `#C5B444` / `#8A7D26`, negative `#B3261E` (dark theme `#FF7C74`). The full token dump is in `data/css_design_tokens_light_dark.txt`.

---

## 3. Typography

**Family:** `Montserrat` (variable woff2 with a `wght` axis of 100–900; name table: "Copyright 2011 The Montserrat Project Authors", designer Julieta Ulanovsky, Version 8.000, **SIL Open Font License 1.1**). The site uses these weights: 400, 450, 500, 550, 600, 650, 700, 800, 900.
Mono: `Fira Code` (variable 300–700, OFL 1.1, v5.002) is declared with `@font-face` and preloaded, but **no element on the WAF page uses it**.
Award widgets embedded in the page fall back to `-apple-system`. This is third-party content.

Letter-spacing values are computed px. The em values in brackets are derived (px ÷ font size).

| Role | Weight | Desktop 1440: size / line-height | Mobile 390 | Tracking | Case | Colour |
|---|---|---|---|---|---|---|
| Hero H1 | 700 | 52 / 62.4 (1.2) | 52 / 57.2 | normal | Sentence | `#150C18`. The accent words ("Stop threats") use **brand-gradient text** |
| Section H2 (`gc-text-h2`) | 700 | 46 / 55.2 (1.2) | 38 / 41.8 | normal | Sentence | `#150C18`. Accent phrase in **solid `#FF4C00`**, or brand gradient inside dark cards. Often two lines: statement plus orange payoff |
| Section title lg (stats band, awards) | 700 | 48 / 52.8–56 | 30 / 33–38 | **−2px** (−0.042em); mobile −1px | Sentence | White on dark / ink. Accent in `#FF4C00` |
| Card title H3 | 700 | 22 / 26.4 | 18 / 21.6 | normal | Sentence | `#150C18` |
| Step title | 700 | 18 / 22.5 | 18 / 22.5 | normal | Sentence | `#150C18`, centred |
| Banner title | 700 | 26 / 40.3 | 20 / 31 | −0.2px | Sentence | White |
| Hero lead | 400 | 18 / 28.8 (1.6) | 16 / 25.6 | normal | | `#5B545F` |
| Section subtitle | 400 | 16 / 25.6 (1.6) | 14 / 21.7 | −0.32px (−0.02em) | | `#5B545F`, centred |
| Body / card description | 400 | 14 / 21.7 (1.55) | 14 / 21.7 | −0.28px (−0.02em) | | `#5B545F`. Inline **bold 700** for keywords |
| Step description | 500 | 13.5 / 20.25 | 13.5 / 20.25 | normal | | `#5B545F`, centred |
| Display number (01 02 03) | **900** | **150 / 165** | 75 / 93.75 (wt 800) | −2px | | **Brand-gradient text** |
| Price | 800 | 88 / 105.6 | 55 | −0.1px | | Gradient text (featured) or ink. "FREE" uses 900 72 px UPPERCASE |
| Stat number | 800 | 46 / 50.6 | 32 / 35.2 | −0.92px (−0.02em) | | White. Suffix (+ % Tbps ms) is 800 24 px `#FF4C00`, baseline-aligned |
| Stat label | 400 | 16 / 25.6 | 10 / 16 | −0.32px | | `#E7E4E0` |
| Primary button (hero) | 700 | 14 / 19.6 | 14 | normal | Sentence | White on gradient |
| CTA button XL | 700 | 16 / 25.6 | 12 | −0.32px | | White |
| Nav link | 500 | 14 / 19.6 | — | −0.25px | | `#150C18` |
| Nav buttons | 550 | 14 / 24 | — | −0.25px | | |
| Inverted button (on orange) | 650 | 18 / 22.5 | 14 | normal | | `#FF4C00` on white |
| Chip / tag | 700 | 12 / 18.6 | 10 / 15.5 | −0.24px | Title Case | `#5B545F` |
| Card corner badge | 700 | 12 / 16.8 | 12 | normal | **UPPERCASE** | White on gradient |
| Eyebrow (enterprise cards) | 700 | 12 / 13.8 | 12 | **+0.24px** (+0.02em) | **UPPERCASE**, prefixed with "— " | `#FF4C00` |
| Industry label | 700 | 12 / 19.2 | 12 | normal | **UPPERCASE** | Brand-gradient text |
| Step tag (CONNECT / PROTECT / SCALE) | **800** | **10.5 / 10.5** | 10.5 | **+1.2px** (+0.114em) | **UPPERCASE** | White on gradient |
| Hero pill tag | 400 | 12 / 14.4 | 12 | normal | Title Case | `#FF4C00` |
| Logo-row eyebrow ("PROTECTING TEAMS AT") | 700 | 12 / 19.2 | 12 | normal | Upper (in source text) | `#5B545F` |
| Trust row item | 600 | 13 / 15.6 | 13 | normal | | `#5B545F` |
| Check-list item | 600 | 14 / 19.6 | — | −0.24px | | `#000000` |
| FAQ question | 700 | 16 / 25.6 | 16 | −0.32px | | `#150C18` |
| Footer heading / link | 450 / 550 | 12 / 22, 12 / 20 | | | | `#9A939F` / `#403842` |

Heading scale ratios at desktop, relative to 16 px body text: display 9.4×, H1 3.25×, H2 2.9×, card title 1.375×, body 0.875×, labels 0.75×, step tag 0.66×.
Rule of thumb: headlines are bold with tight-normal tracking; small uppercase labels are heavy (700–800) with positive tracking; big numbers are 800–900 with negative tracking.

**Comparison:** /cdn and the homepage also use only Montserrat, but with lighter, tighter headlines (/cdn H1 550 72/80 −3px; home H1 600 72/75.6 −1px). The WAF page uses the newer, heavier style (700, normal tracking).

---

## 4. Icons and illustrations

### 4a. Spot illustrations (feature cards, hero, diagrams), the dominant visual language
- **Style:** flat vector "tech line art" with a 2.5D feel. It is not glossy and not skeuomorphic. Wide banner compositions run about 2.5–3:1, with one focal object in the centre (usually a **shield**) and satellite UI windows, badges and servers to the left and right, linked by connector lines.
- **Outline:** a single uniform **hairline of about 0.75–1.25 CSS px at display size**. In the SVGs, the light card art uses stroke 0.82–0.98 on viewBoxes 466–552 wide, the hero uses 1.5 on a 660-wide viewBox, and the dark cards use the default 1. That is about **0.15–0.23 % of the illustration width** (≈1/450–1/670). Caps and joins are **round**. Strokes never carry gradients, except the comet streaks in the animated diagram.
  - On light surfaces the outline is near-black `#221F20` / `#231F20` (hero `#150C18`).
  - On dark surfaces (enterprise cards on `#1E1224`) the same drawings are **white outlines** (`#FFFFFF`) with orange accents.
- **Fills:** a limited flat palette:
  - White `#FFFFFF` for windows and panels.
  - Solid brand orange `#FF4C00` / `#FE4C00` for focal shapes: shields, skull badges, alert dots, "API" text, progress-bar fills, gears, clouds, folders.
  - Peach `#FEC0A5` / `#FFCDB7` for secondary shapes: warning triangles, half of a shield, highlight bars.
  - Grey `#D9D9D9` only for the hero's floor ellipse shadow. Lavender-greys `#D8D8E3`, `#A0A0B8`, `#8F86A5` for tiny details.
  - No gradients inside shapes, except the animated hero (white shine band, orange fade gradients) and the diagram (radial orange glow, comet strokes).
- **Depth:** a **hard, offset, solid near-black "extrusion"** sits behind windows and shields (thick black bar on the bottom or bottom-right edge, 3.94-unit stroke on the WAF card). Shields are split two-tone (orange/peach quarters, or a light/dark diagonal half). The hero shield is a chunky 3D-extruded badge with an orange rim and dark side. The "Block threats" diagram is **isometric**: a PoP block of stacked plates, each with an orange label tab rotated to the iso angle, and an isometric origin server with an orange wireframe globe. There are no soft drop shadows inside illustrations.
- **Recurring motifs:**
  - browser windows with a 3-dot title bar (first dot filled orange);
  - `</>` code tags;
  - shields bearing a glyph (spy hat and glasses, check mark);
  - circular skull "attack" badges;
  - warning triangles;
  - server racks with LED dots and orange bars;
  - gears, clouds, bot heads with a visor, padlocks, a fingerprint, a magnifier with an eye;
  - `*****` password fields, map pins;
  - wireframe globes (meridians);
  - progress bars as an orange fill inside a white pill;
  - "API" folder tabs.
- **Connector lines:** thin (same hairline weight) orthogonal paths with small rounded elbows. On cards they are orange `#FF4C00` (or black) and end in **small filled orange dots** (about 4–5 units in diameter); there are no arrowheads. In the big diagram, connectors are **thick soft beige S-curves** (`#E8E3DF`, 10 units in the 1440-wide viewBox, about 6 px at 902 px display width) that flow from source tiles into the PoP stack.
- **Corner radius** on windows and panels: rx about 3–7 units, roughly 3–6 % of the shape's width.
- **Labels inside illustrations:** small rounded rectangles with a 1 px dark outline holding Montserrat text ("Nearest Gcore PoP" with the Gcore mark, "Origin"), and orange-outlined pills with an orange check-shield ("Multiple Security Layers", "Clean Traffic Only").

### 4b. Animation of the illustrations (Keyshape CSS keyframes inside the SVG)
- **Hero** (`hero_shield-browser-code_ANIMATED…svg`): a **4 s infinite loop**, with keyframes eased `cubic-bezier(.42,0,.58,1)`.
  - At about 1.2–1.8 s an attack hits the shield: orange zig-zag lightning shards and dark triangular debris burst against it, a wobble keyframe (rotate +5° then −1°) fires at 30–45 % of the loop, and small shapes scale from 0 to 1 and back.
  - At about 2.5 s a white diagonal **shine band** (white 0→1→0 opacity gradient) sweeps across the shield.
  - Throughout the loop, the `</>` glyph morphs, a progress bar fills orange, and dots blink (opacity 0↔1 in 12.5 % steps).
  - Frames: `icons/illustrations_rendered/hero_shield-browser-code_frame_t*.png` and the contact sheet next to them.
- **Diagram** (`diagram_block-threats…ANIMATED…svg`): a **4 s loop**.
  - **Comet streaks** (a linear gradient from transparent through `#FF4C00` to transparent along a stroke) travel along the beige connector curves from the User, Bots, APIs and Attacks tiles into the stack.
  - The layer label tabs ("CDN / Delivery", "WAAP", "Bot Management", "API Security", "L7 DDoS Protection", "FastEdge Logic") **light up one after another, top to bottom**, from a pale lavender to solid orange `#FF4C00` with white text.
  - Orange tick rails appear on the stack sides, a soft radial orange glow fills the stack interior, and the origin globe rotates.
- **Other motion on the page:**
  - The pulse dot uses `gc-pb-callout-pulse` (1.8 s ease-in-out infinite, ring expanding 0→8 px, `rgba(255,76,0,.55)`→0).
  - Card hover uses `transition: transform/box-shadow .5s cubic-bezier(.22,1,.36,1)`.
  - Use-case icons scale to 1.08 on hover over .3 s.
  - The stats-band globe is a 15 s webm: a dark sphere with a lavender dot-matrix landmass and tiny orange PoP dots, slowly rotating.

### 4c. Use-case "vertical" icons (88×88), the clearest example of the icon rule
- **Pure line icons, no fill, no container.** Each is placed loose in the top-right corner of its grid cell.
- **Stroke width 4.4 on 88 px (5.0 % of the icon size)**, `stroke-linecap: round`, `stroke-linejoin: round`.
- **The stroke is the brand gradient** `#FF9A70 → #FF4C00 (31.9 %) → #FF4C00 (69.6 %) → #FFBC9F`, set in userSpaceOnUse coordinates with a large offset. The result is a diagonal sweep with a lighter peach at the edges and solid orange in the middle. Small dot terminals are filled with the same gradient.
- Geometry: simple outlines (basket, bank columns, gamepad, video player, cloud with circuit legs, satellite dish) with slightly rounded corners on rectangles. There are no inner details beyond 1–3 strokes.
- Files: `icons/vertical-icons_88px_gradient-line/*.svg`, renders in `icons/illustrations_rendered/vertical-icon_*_4x.png`, comparison sheet in `icon-style_contact-sheet_…png`.

### 4d. UI icon set (48×48 grid; nav menu, top bar, footer)
- Line icons, **stroke 2.25 on 48 (4.7 %)**, round caps and joins, single colour `#150C18`. In menus the CSS recolours them to `#FF4C00` (hover `#D64000`). They are drawn at 20–24 px, so the stroke renders at about 1 px. There is no container, except the menu rail, which uses small glass rounded squares.
- Files: `icons/ui-icons_48px_line/*.svg` (49 icons from `assets.gcore.pro/assets/icons/collection/`) and `icons/inline/*.svg` (53 inline SVGs serialized from the DOM).

### 4e. Small filled glyphs
- Hero trust row: 24 px **solid orange `#FF4C00` "bold" glyphs** (lightning, stopwatch, card), with no stroke (`icons/data-uri/hero_trust-icon-*.svg`).
- Check items: 24 px filled circle with a knocked-out check, filled with the brand gradient (`steps_workflow-check-circle.svg`).
- Pricing bullets: solid right-pointing triangle 18×21 (`#FF4C00` on light, `#FFFFFF` on the dark card).
- Step arrows: a 32 px `#FF4C00` circle holding a 13 px white stroke arrow (stroke 1.31, round cap).
- FAQ toggle: a 26 px circle with an 800-weight "+". Closed: `#F4F3F2` fill with `#5B545F` glyph. Open: brand-gradient fill with a white glyph, rotated 45° to read as "×".

---

## 5. Background treatment

- **Page background:** `body { background-image: url(Gcore_Background_efc2352a8c.png); background-attachment: fixed; background-size: cover; }` (file: `icons/backgrounds/page-bg_warm-light-leak_body-fixed-cover_1423x869.png`).
  - It is a soft blurred "light leak" quantised to 4 colours with dither grain.
  - A white core `#FBF9F8` sits slightly left of centre (about 45 % x, 55–65 % y).
  - A neutral warm ring `#F9F4F0` surrounds it.
  - The left edge and corners are `#F8EFE9`.
  - Large peach blobs `#F9EBE3` sit at the top-right and bottom-right.
  - The contrast is very low (all colours have L* above 95).
  - Because it is fixed, **every viewport shows the same composition**, and content scrolls over it.
- There are **no grid lines, dot grids, noise overlays or decorative blobs** on the WAF page itself. Texture appears only inside illustrations (diagram dot plates, globe dot matrix).
- **Dark islands:**
  - Fill: `#1E1224` plus `radial-gradient(49.73% 49.73% at 50% 100%, rgba(168,130,255,.18), transparent)`. This is a lavender glow rising from the bottom centre.
  - Radius 20–25 px.
  - The stats band adds the globe video on its right half (about 490×495, `object-fit: cover`).
- **Glass cards over the warm background:** the fill is `linear-gradient(180deg, #FFF 15%, rgba(255,255,255,.25) 100%)` with a `2px solid #FFF` border. The card is opaque white at the top and fades to 25 % at the bottom, so the peach shows through near the bottom edge. An orange glow shadow sits underneath.
- Token `--gc-gradient-light` is defined but **not observed applied on this page**: `radial-gradient(60% 60% at 12% -10%, rgba(255,154,112,.35), transparent 70%), radial-gradient(55% 60% at 100% 0%, rgba(255,130,162,.22), transparent 70%), radial-gradient(65% 70% at 50% 115%, rgba(255,154,112,.3), transparent 70%), #fff`.
- **Comparison:** /cdn uses an older template with solid section alternation (white `#FFFFFF` / dark `#150C18`) and grey sketch-style illustrations with orange accents. The homepage mixes white, `#F6F6F6` grey and `#251B29` dark bands, dot-grid decorations and point-cloud imagery. The warm fixed background with glass cards appears only in the new page-builder template, which the WAF page uses.

---

## 6. Layout and components

**Grid:**
- Content width 1128 px (152 px margins at a 1432 px viewport).
- Section padding 96 px top and bottom (`gc-pt-section_lg` = 6rem). The CSS defines a smaller set for small breakpoints (lg = 4.5rem).
- Centred section heads: H2 with a 12 px gap to the subtitle, then about 45–65 px (measured) to the content.
- Card gaps: 16 px (feature grid), 24 px (enterprise cards).

**Header:**
- A top bar of 39 px with 12 px labels.
- Below it, a **floating white nav bar**: 1200×70, radius 14, `1px #DEDEDE` border, header shadow, padding 12×24.
- Logo: orange `#FF4C00` Gcore mark plus wordmark, 128×32.
- "Contact us" is a `#F5F5F5` pill. "Sign up for free" is a gradient pill, 44 px high.

**Buttons** (all pills, `border-radius: 9999px`):
- **Primary:** brand-gradient fill, white 700 text, height 44, padding 11×20, btn-gradient shadow. The XL variant (in the dark CTA) is 16 px text with 16×40 padding.
- **Secondary (gradient-outline):** transparent fill, `1px #FF9A70` border, label filled with **gradient text**.
- **Outline on dark:** `2px solid #FFF`, white text.
- **Inverted (on the orange banner):** white fill, `#FF4C00` text 650/18, padding 18×24, trailing orange arrow icon.

**Tags and pills:**
- Hero pill tag: `rgba(255,76,0,.1)` fill, `1px #FF4C00` border, radius 999, padding 6×14, 12 px orange text.
- **Card corner badge:** a tab attached to the top edge 24 px from the right corner. Gradient fill, radius `0 0 10 10`, height 40, padding 0×16, text 700 12 px UPPERCASE white.
- **Step tag:** gradient fill, `1px #FF4C00` border, radius 6, height 27, padding 0×11, text 800 10.5 px +1.2px UPPERCASE.
- **Chips:** radius 6, padding 6×12, `#F4F3F2` fill, `1px #E7E4E0` border, text 700 12 px `#5B545F`. Use-case chips use the glass gradient fill instead.
- **Pricing pill:** height 36, padding 0×20, radius 999, `1px #150C18` border, 700 13 px. The featured variant uses a gradient fill with no border.

**Cards:**
- **Feature card:** glass gradient fill, `2px #FFF` border, **radius 20**, padding 32, gap 24, brand-glow-lg shadow. Inside, the image panel is white, radius 12, 185 px high, with the illustration centred. Below it: title 22/700, description 14/400, a chip row, and the corner badge.
- **Enterprise ("pain") card:** a 360 px column.
  - Top: a dark image panel (`#1E1224` plus lavender glow, radius `20 20 0 0`, 185 px high) holding the white-line illustration.
  - Bottom: a glass body (radius `0 0 20 20`, padding 32, `2px #FFF` border, brand-glow) with the "— EYEBROW" line, title and description.
- **Stats band:**
  - Dark island 1128×495, radius 25.
  - Left column: two-line title (orange line plus white line, 48/700, −2px), description 16/500 white, then a 2×2 stat grid. Each stat has a **3px `#FF4C00` left border** with 16 px padding.
  - Right half: the globe video.
- **Use-case grid:** a 2×3 grid of **unboxed cells** separated by `1px #E7E4E0` hairlines (right and bottom borders). Each cell has padding about 48×52, a gradient-text industry label, title 22/700, description, a chip row, and the 88 px gradient-line icon at the top right.
- **Pricing:** three cards.
  - Basic and Pro: glass fill, radius 20.
  - **Start:** featured and taller (628 vs 444 px). Dark `#1E1224` plus glow, radius 24, white text, gradient price.
  - Under the cards, a full-width **orange gradient banner** (radius 20, padding 40) with an inverted button.
- **Bottom CTA:** a dark island 1128×486, radius 20, padding 96×32, centred. Title 46/700 white with a gradient accent, then subtitle `#E7E4E0`, the button pair, and a note `#F4F3F2`.
- **Check-list pill:** radius 999, glass fill, `2px #FFF` border, shadow `0 10 35 rgba(255,76,0,.15)`, 4 items with gradient check icons, gap 24.
- **Callout pill:** `rgba(255,255,255,.15)` fill, `2px #FFF` border, radius 999, padding 18×26. A pulsing 10 px orange dot leads a bold 16 px sentence.
- **Steps row:**
  - A **2px brand-gradient line** connects three tags. Between them sit 32 px orange arrow circles.
  - Below each tag: a gradient number at 150 px, a centred title and a description.
- **FAQ:** two columns.
  - Each column has an orange uppercase eyebrow with a leading short orange dash.
  - Items: white fill, radius 14, question padding 18×22. Closed: `1px #E7E4E0` border, no shadow. Open: `1px #FF9A70` border plus the FAQ shadow, with the question at 16/700 (closed questions also render 16/700 at desktop).
- **Dividers:** hairlines in `#E7E4E0` or `#EDEDED`. The vertical dividers in the trust row are 1×20 px with the vertical brand gradient.
- **Radii scale (tokens):** input 10, sm 12, md 16, lg 20, xl 24, pill 999. Observed: header 14, FAQ 14, stats band 25, chips and step tags 6, corner badge bottom 10.

---

## 7. How to reproduce in canvas (@napi-rs/canvas 1.0.x)

```js
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
const FD = 'reference/waf/fonts';
for (const w of [400,500,600,700,800,900]) GlobalFonts.registerFromPath(`${FD}/Montserrat-${w}.ttf`, 'Montserrat');
// ctx.font only accepts weights in multiples of 100 (verified: "450 16px Montserrat" breaks the font).
// For 450/550/650, register the separate families and use weight 400:
for (const w of [450,550,650]) GlobalFonts.registerFromPath(`${FD}/intermediate/Montserrat-W${w}.ttf`, `Montserrat W${w}`);
// ctx.font = '400 14px "Montserrat W550"'
// ctx.letterSpacing = '-2px' works (verified).

const ORANGE = '#FF4C00', INK = '#150C18', TEXT2 = '#5B545F', DARK = '#1E1224';
const BRAND_STOPS = [[0.0096,'#FF9A70'],[0.3002,'#FF4C00'],[0.6437,'#FF4C00'],[0.921,'#FFBC9F']];

// CSS linear-gradient(<deg>) mapped onto a box (x,y,w,h)
function cssLinear(ctx, deg, x, y, w, h, stops = BRAND_STOPS) {
  const a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const L = Math.abs(w * dx) + Math.abs(h * dy), cx = x + w / 2, cy = y + h / 2;
  const g = ctx.createLinearGradient(cx - dx * L / 2, cy - dy * L / 2, cx + dx * L / 2, cy + dy * L / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;               // brand = cssLinear(ctx, 196, ...)  (light peach top-right → orange → peach bottom-left)
}
// Gradient text: measure the text, build cssLinear(196) over the text bbox, set fillStyle, then fillText.
// Dark island: fill DARK, then a radial gradient centred at (x+w/2, y+h) with radius ≈ 0.4973*max(w,h)
//   (approximation of the CSS ellipse), stops rgba(168,130,255,.18) → rgba(168,130,255,0), clipped to the rounded rect.
// Glass card: rounded rect r=20; fill linear 180deg [#FFF @0.15 → rgba(255,255,255,.25) @1];
//   stroke 2px #FFF inside; before filling, draw the shadow with ctx.shadowColor='rgba(255,76,0,.15)',
//   shadowBlur≈55, shadowOffsetY=15 (CSS blur radius ≈ canvas shadowBlur).
```

- **Background:** draw `icons/backgrounds/page-bg_warm-light-leak…png` scaled to *cover* the frame, and keep it static while content scrolls, matching the page's `background-attachment: fixed`. The procedural alternative is the three radial blobs of `--gc-gradient-light`; that is a *suggestion*, and the token is not used on this page. Optionally add 1–2 % grain to mimic the dithering.
- **Illustrations:** the SVGs can be rasterized with `loadImage()` from `@napi-rs/canvas`, or by Chromium, as `render_svgs.js` did here. The two animated SVGs rely on CSS keyframes, which a static rasterizer will not play. Use the pre-rendered frames as reference, or rebuild the motion. When redrawing by hand:
  - draw outlines at **about 1/450–1/650 of the illustration width** (≈1 px at 500 px, ≈2 px at 1000 px);
  - use round caps and joins;
  - stroke near-black `#221F20` over fills of `#FFF`, `#FF4C00` and `#FEC0A5`;
  - add a solid dark offset slab (3–4 % of object height) under windows and shields for depth;
  - use connectors of the same hairline weight, orange, ending in filled dots.
- **Icons:** stroke width = **5 % of the icon box** with a brand-gradient stroke (88 px style), or 4.7 % in ink `#150C18` (UI style). Use round caps and joins and no container.
- **Accent rule:** one orange element per headline (a solid `#FF4C00` phrase, or a brand gradient on large display text). Never use orange body text. Shadows under light cards are orange-tinted.
- **Scaling *suggestion*:** the existing engine renders 1080×1920. The 390 px mobile layout scales by about 2.77× to 1080 px wide, which gives H2 38→~105 px, card titles 18→~50 px and body 14→~39 px. The desktop ratios in §3 apply if you scale from a 1440 px canvas instead.

---

## 8. Dark mode (opt-in toggle, for reference)
Body `#1E1224` plus the lavender bottom glow. Cards become transparent with a **2px white→25 % gradient border** (CSS mask). Chips and FAQ cards use `rgba(255,255,255,.15)`. Text is white and `#F4F3F2`, the header is dark, and the footer is `#150C18`. Light illustration panels stay white. The API Security and DDoS panels switch to dark variants. Screenshots: `shots/waf_desktop_DARKMODE_*`.

---

## 9. Saved files (reference/waf/)

**shots/**: screenshots (PNG)
- Full page (stitched from viewport captures so the fixed background renders the way a user sees it):
  - `waf_desktop_fullpage_1440.png` (1440×10831)
  - `waf_mobile390_fullpage_2x.png` (780×34938)
  - `waf_desktop_DARKMODE_fullpage_1440.png`
  - `compare_cdn_desktop_fullpage_1440.png`
  - `compare_home_desktop_fullpage_1440.png`
- Desktop viewport sections, 1440×900 (fixed header and widgets hidden except in 01):
  - `waf_desktop_01_hero_header`
  - `02_features_4cards` (+`_part2`)
  - `03_diagram_block-threats`
  - `04_enterprise_dark-illustration-cards`
  - `05_steps_01-02-03`
  - `06_stats_dark-band`
  - `07_awards_badges`
  - `08_use-cases_icon-grid` (+`_part2`)
  - `09_pricing_cards` (+`_part2`)
  - `10_cta_dark-card`
  - `11_faq`
  - `12_footer`
- Desktop 2× close-ups:
  - `waf_desktop2x_hero_viewport`
  - `waf_desktop2x_closeup_*`: topbar-and-header-nav, hero_pill-headline-ctas-trust, hero_illustration, feature-card_waf, feature-card_ddos, diagram_waap-flow, workflow-checks_pill, enterprise-card_dark-illustration, callout-quote_pill, steps_tag-number-arrow, stats_band, use-case_cell-icon, pricing_start-card-dark, pricing_enterprise-orange-banner, cta_dark-card, faq_open-item, faq_closed-item
- Mobile 390 at 2× (780×1688): `waf_mobile390_01…09_*` (hero, features, diagram, enterprise cards, steps, stats, use cases, pricing, CTA; tall sections have `_part2`)
- Dark mode: `waf_desktop_DARKMODE_01…04_*`
- Comparison: `compare_cdn_desktop_0x_*`, `compare_home_desktop_0x_*`

**fonts/**
- `Montserrat-100…900.ttf`: static instances, family "Montserrat", usWeightClass set
- `intermediate/Montserrat-W450.ttf`, `-W550.ttf`, `-W650.ttf`: families "Montserrat W450/W550/W650" at weight 400
- `variable/Montserrat-Variable.ttf`, `variable/FiraCode-Variable.ttf`: direct woff2→ttf conversions
- `firacode/FiraCode-400.ttf`, `-500.ttf`: declared on the site but unused on the WAF page
- `source_woff2/`: the original files from `gcore.com/assets/fonts/`
- `specimen_napi-canvas_montserrat_weights.png`: render test in @napi-rs/canvas

**icons/**
- `illustrations/`: the 9 page illustrations as original SVGs (2 animated Keyshape, 4 light-card, 3 dark-card)
- `illustrations_rendered/`: 2× PNG renders, 8 animation frames for each animated SVG (0–3500 ms) with contact sheets, 4× renders of the vertical and UI icons, and an icon-style comparison sheet
- `vertical-icons_88px_gradient-line/`: 6 gradient-stroke line icons
- `ui-icons_48px_line/`: 49 icons from the site's collection
- `inline/`: 53 inline DOM SVGs (top bar, header, menu product icons, step arrow, footer socials, theme toggle)
- `data-uri/`: hero trust glyphs, gradient check circle, pricing triangles, banner arrow
- `logos/`: the Gcore logo (fill `#FF4C00`, as computed on the page) and 5 customer logos
- `awards/`: 6 award badge images
- `backgrounds/`: the page background PNG, the stats-band globe video (webm, 15 s) and 3 frames from it

**data/**
- `css_design_tokens_light_dark.txt`: every `--gc-*` token for the light, dark and dark-semi themes
- `computed_component_styles_light_1440.txt` / `.json`: computed styles for about 95 component selectors, including pseudo-elements, animations and keyframes
- `computed_component_styles_DARKMODE_1440.json`
- `computed_typography_roles_1440_and_390.txt`: every distinct text style with counts and samples
- `computed_colors_aggregate_1440.txt`: every computed colour, gradient, border and shadow with usage examples
