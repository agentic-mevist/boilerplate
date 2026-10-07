# Motion Design Style Bible: Blueprint Tech Explainer (9:16)

---

## 1. Overall Concept & Format
- **Format:** 9:16 Vertical Video (1080×1920), dynamic tech explainer reel.
- **Duration & Structure:** ~2:36 runtime split into 9 distinct chapters plus hook and outro.
- **Narrative Arc:** Hook $\to$ Core technical myth-busting $\to$ Physical mechanics $\to$ Mathematical requirement $\to$ Relativistic correction $\to$ Digital signal extraction $\to$ Real-world network assistance $\to$ Urban multipath challenges $\to$ Spoofing vulnerability $\to$ Historical context $\to$ Call to Action.
- **Pacing:** Fast-paced, high information density. Visual transitions occur every 1.5–2.5 seconds.

---

## 2. Canvas & Background
- **Base Gradient:** Deep navy/space radial vignette; center `#0F1A34`, edges `#060A14`.
- **Grid Layer:** Blueprint grid, 80px cell pitch, stroke `#1E2D4A` (1px, 25% opacity).
- **HUD Elements:** Faint concentric range rings and dashed orbital tracks centered on the screen.
- **Grain/Texture:** 3% procedural monochromatic digital grain to eliminate color banding.

---

## 3. Persistent UI Chrome
- **Header Placement:** 5% from top margin, left- and right-aligned.
- **Author Identity (Top-Left):** Circular avatar (80px), bold username `@aldoniq` (`#FFFFFF`, 28px Sans-Serif), subtitle topic indicator (`#6F85A5`, 20px).
- **Chapter Indicator (Top-Right):** Label `/ этап` (`#6F85A5`, 20px) stacked above current stage title in bold amber (`#FFB800`, 24px).
- **Segmented Progress Bar:** 9 equal segments spanning 90% frame width at 9% height; inactive `#1A2844`, completed `#FFB800`.

---

## 4. Typography

```
PRIMARY CAPTIONS:      Druk Wide / Montserrat Black (All Caps, 64–78px, #FFFFFF)
ACCENT CAPTIONS:       Same face inside Amber Pill (#FFB800 background, #080E1A text)
MONOSPACE METRICS:     JetBrains Mono / Roboto Mono (32–42px, #FFFFFF / #FFB800)
ANNOTATIONS:           Caveat / Casual Script (Handwritten style, 36px, #FFE600 / #8BE9FD)
SECONDARY LABELS:      Inter Medium (All Caps, 20–24px, #6F85A5)
```

- **Subtitle Behavior:** Kinetic chunks (1–3 words). Subtle 1.05x scale pop on word entry. Positioned at 82% frame height.

---

## 5. Colour Palette & Semantics

| Token | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| **Dark Void** | `#060A14` | Edge vignette, terminal surfaces |
| **Blueprint Blue**| `#1E2D4A` | Grid lines, orbital paths, diagram guides |
| **UI Slate** | `#6F85A5` | Secondary metadata, inactive states |
| **Signal White** | `#FFFFFF` | Primary text, core wireframes |
| **Alert / Metric**| `#FFB800` | Primary highlights, distances, active stages |
| **Target Green** | `#B8E924` | User point ("ты"), receiver target |
| **Error / Shift** | `#FF4D4D` | False positions, drift, clock errors |

---

## 6. Diagram & Illustration Language
- **Earth Globe:** Vector line-art circle (`#FFFFFF`, 2px stroke); simplified landmasses filled with dark slate (`#18233C`) and outlined in `#4A6088`.
- **Satellites:** Minimalist flat vector icons: central white cube with blue solar panel fins (`#6F85A5`).
- **Beams & Ranges:** Dashed lines (`stroke-dasharray: 6 6`) animating via dash-offset. Trilateration spheres represented by thin expanding rings (`#FFB800`, 2px) with translucent amber fills (10% opacity).
- **Terminal Cards:** Dark slate containers (`#0D1629`, 85% opacity, 12px border radius) with 1px border (`#1E2D4A`).
- **Historical Insets:** Black-and-white archival portraits framed in rounded rects with blueprint dimension callouts.

---

## 7. Motion Language
- **Camera:** Dynamic 2D zooms and reframings to center on active sub-elements (e.g., zooming from planetary view to city block).
- **Strokes:** Trim path vector reveals (300–500ms, `cubic-bezier(0.16, 1, 0.3, 1)`).
- **Data Animation:** Numerical counters rolling up rapidly from 0 with fixed decimal padding.
- **Rhythm:** Visual state shifts occur synchronously with audio downbeats and vocal punchlines.

---

## 8. Audio Design
- **Voiceover:** Russian male voice, articulate, authoritative yet casual, ~160 WPM.
- **BGM:** Low-volume minimal synth-pulse beat (-18dB) with tech clicks and sidechain ducking.
- **SFX:** Digital interface clicks, soft sub-drops on zoom-ins, high-pitch radar chirps, typewriter ticks on data readouts.

---

## 9. Scene-by-Scene Timeline

| Timecode | Chapter | Visual Setup | Animation & Graphic FX | Subtitle Keyword Highlight |
| :--- | :--- | :--- | :--- | :--- |
| **0:00–0:02** | *Intro* | Earth surrounded by 32 satellite orbits. | Title card pop; 3 satellites fire yellow beams to user dot. | **GPS** (Amber Pill) |
| **0:02–0:09** | `приём` | Earth with European cities highlighted. | Phone data transfer reads `0 байт` up; airplane flies across. | **СЛУШАЕТ** (`#FFFFFF`) |
| **0:10–0:23** | `спутники` | Global view; 20,200 km altitude ruler. | Counter counts to 32 satellites; active beams isolate to 12. | **32** (Amber Large) |
| **0:23–0:42** | `расстояние` | Zoom to single satellite emitting radio waves. | Distance calculated ($t \times c$); 3 successive spherical rings expand and overlap at user pin. | **РАДИУСА** (`#FFFFFF`) |
| **0:42–0:57** | `часы` | Split waveform: atomic vs quartz clock. | Waveforms drift out of phase; 1 µs offset shows 300m location error grid. | **АТОМНЫЕ** (Amber Pill) |
| **0:57–1:18** | `эйнштейн` | Archival photo of Einstein; Earth gravity well. | Clocks gain +45.8 µs (gravity) and lose -7.2 µs (speed), net +38 µs/day display. | **ЭЙНШТЕЙНА** (`#FFFFFF`) |
| **1:18–1:32** | `сигнал` | Waveform buried in noise floor; PRN code array. | Correlation slider shifts signal horizontally until peak value matches. | **ТИШЕ** (Amber Text) |
| **1:32–1:45** | `интернет` | 50 bit/s radio telemetry vs dial-up speed bar. | Timer counts 30s delay without internet vs instantaneous fix with A-GPS. | **ИНТЕРНЕТОМ** (`#FFFFFF`) |
| **1:45–2:00** | `город` | Urban street canyon between two high-rises. | Ray reflects off building facade; red false target pin appears; 3D models correct it. | **ОТРАЖАЕТСЯ** (`#FFFFFF`) |
| **2:00–2:20** | `подмена` | Mediterranean map route from Monaco to Rhodes. | Yacht path diverts sideways while onboard navigation screen falsely shows straight line. | **ПОДМЕНА** (Amber Pill) |
| **2:20–2:32** | `точность` | Grid with circular dispersal cluster; Clinton photo. | Error circle shrinks from 100m to 5m radius labeled "May 1, 2000". | **ПЯТЬ** (Amber Text) |
| **2:32–2:36** | *Outro* | Central avatar with earth background. | Avatar badge scale-pop; radial follow prompt appears. | **@ALDONIQ** (Amber Pill) |

---

## 10. Recreation Prompt
> Create a vertical 9:16 high-density technical explainer motion graphic video about the inner workings of a complex technology. Set the canvas to a dark blueprint aesthetic featuring a deep navy radial background (`#0A1124` to `#060A14`) overlaid with an engineering coordinate grid and technical HUD rings. Maintain persistent top chrome: creator profile avatar and handle on the left, an amber active-chapter label on the right, and a multi-segment progress bar spanning the top edge. All typography must combine bold geometric sans-serif for impact captions—displaying rapid 1–3 word bursts with selective amber pill highlight boxes—alongside monospace fonts for technical data metrics and yellow handwritten cursive notes for informal callouts. Use strict color semantics: pure white for main outlines and primary text, technical slate for background structures, vivid amber (`#FFB800`) for focal values and radius spheres, neon lime for target coordinates, and crimson red for errors and offsets. Employ vector line illustrations, trim-path stroke reveals, rolling data counters, and geometric trilateration diagrams. Maintain brisk visual pacing with dynamic push-zooms and data-card overlays timed tightly to an articulate, rapid voiceover accompanied by subtle interface sound effects.