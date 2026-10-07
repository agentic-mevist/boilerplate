# STYLE BIBLE: GPS Explainer Reel

## 1. Concept & Format
*   **Genre:** Animated technical explainer / infographic reel.
*   **Format:** Vertical (9:16), 1080x1920px.
*   **Pacing:** Fast, data-driven, continuous flow.
*   **Tone:** Educational, objective, engaging.
*   **Structure:** Hook -> 10 sequential chapters -> CTA.
*   **Total Length:** 02:37.

## 2. Canvas & Background
*   **Background Color:** Dark Navy (`#0A1128`).
*   **Grid Pattern:** Blueprint style. 1px solid lines, color `#1A2442`. Spacing: ~10% of frame width (108px).
*   **Concentric Rings:** Faint radar-like circles centered on the focal point. 1px stroke, `#FFFFFF` at 5-10% opacity.
*   **Vignette:** Subtle radial gradient darkening towards edges (`#000000` at 30% opacity).
*   **Noise:** Faint film grain overlay (~5% opacity).

## 3. Persistent UI Chrome
*   **Top-Left Profile (x: 5%, y: 4%):**
    *   Avatar: Circular, 8% frame width.
    *   Handle: `@aldoniq`, White, Bold, 3% frame width.
    *   Subtitle: `gps • как он тебя находит`, Grey (`#8892B0`), Regular, 2% frame width.
*   **Top-Right Chapter Info (x: 95%, y: 4%, right-aligned):**
    *   Small label: `/этап`, Grey (`#8892B0`), 1.5% frame width.
    *   Chapter Title: e.g., `приём`, Yellow (`#FFD700`), Bold, 2.5% frame width.
*   **Progress Bar (y: 8%, x: 5% to 95%):**
    *   10 segments separated by 2px gaps.
    *   Empty: `#1A2442`. Filled: `#FFD700`. Fills sequentially per chapter.

## 4. Typography
*   **Main Captions:** Sans-serif (e.g., Montserrat/Proxima Nova), Black/Heavy weight, All-caps.
    *   Size: 6-8% frame width.
    *   Color: White (`#FFFFFF`).
    *   Position: Bottom 20% of screen (y: 80%).
    *   Display: 1-3 words at a time.
    *   Highlighting: Active word turns Yellow (`#FFD700`) OR gets a Yellow background box with Navy text.
*   **Data/Terminal Text:** Monospace (e.g., Roboto Mono), Regular. Left-aligned, 2-3% frame width.
*   **Annotations:** Script/Handwritten font. Lowercase, slight rotation (-5 to 5 deg). Color: Yellow or Red.
*   **Big Numbers:** Sans-serif, Bold, Yellow (`#FFD700`), up to 15% frame width.

## 5. Color Palette
*   **Background:** `#0A1128` (Dark Navy)
*   **Grid/UI Inactive:** `#1A2442` (Muted Blue)
*   **Primary Text/Lines:** `#FFFFFF` (White)
*   **Highlight/Data/Accent:** `#FFD700` (Yellow/Amber)
*   **Error/Spoofing/Inaccuracy:** `#FF4C4C` (Red)
*   **Success/Accuracy:** `#4CAF50` (Green)
*   **Terminal Box BG:** `#000000` at 50% opacity.

## 6. Diagram & Illustration Language
*   **Style:** Minimalist line art, blueprint aesthetic.
*   **Stroke Widths:** 2px for primary objects (globe, buildings), 1px for secondary (orbits, connections).
*   **Globe:** White 2px outline, dark fill, 1px white continent outlines.
*   **Satellites:** Simple geometric icons (rectangle body, two solar panels).
*   **Lines:** Orbits are 1px solid or dashed. Signal paths are straight colored lines (Yellow for active, Red for error).
*   **Terminal Boxes:** Dark semi-transparent rectangles with 8px rounded corners, 1px border.
*   **Photos:** Black and white, framed in simple rectangles, slightly faded.

## 7. Motion Language
*   **Transitions:** Continuous camera pans and zooms. No hard cuts. The canvas feels like one infinite blueprint.
*   **Easing:** `cubic-bezier(0.25, 1, 0.5, 1)` (smooth ease-out) for camera moves.
*   **Element Entry:** Scale pop (0% to 100% with slight overshoot) over 300ms, or fade-in.
*   **Line Drawing:** SVG `stroke-dashoffset` animation to simulate drawing paths.
*   **Data Animation:** Numbers tick up rapidly. Terminal text types out character-by-character.
*   **Pacing:** Visual changes occur every 1-2 seconds.

## 8. Audio
*   **Voice-over:** Male, energetic, authoritative, fast pace (~150 wpm).
*   **BGM:** Minimal, pulsing electronic/synth track. Low volume (-20dB relative to VO).
*   **SFX:**
    *   UI Clicks/Beeps: On data box appearance.
    *   Typing: During terminal text generation.
    *   Whooshes: On fast camera pans/zooms.
    *   Digital ticks: During number counting.

## 9. Scene-by-Scene Timeline
*   **0:00-0:09 | Hook & Ch 1 (Reception):** VO: "How GPS finds you. Phone only listens..." Visual: Globe, satellites appear. Terminal box shows 0 bytes sent, 66 bits received. Airplane icon appears.
*   **0:10-0:23 | Ch 2 (Satellites):** VO: "32 satellites, 20k km high. Need 4 minimum." Visual: Camera zooms out. 32 satellites orbit. 4 lines connect to user. Terminal box shows satellite broadcast msg.
*   **0:24-0:42 | Ch 3 (Distance):** VO: "Signal travels at light speed. Time x speed = distance. Intersecting spheres." Visual: Ticking timer. Line draws from sat to earth. Expanding circles (spheres) from 3 sats intersect at one point.
*   **0:43-0:57 | Ch 4 (Clocks):** VO: "Atomic vs quartz clocks. 1 microsec error = 300m off. 4th sat fixes clock error." Visual: Sine waves comparing clocks. Grid shows 300m offset. 4th intersecting circle appears.
*   **0:58-1:18 | Ch 5 (Einstein):** VO: "Relativity. Less gravity = faster time. High speed = slower time. Net 38 microsec/day." Visual: B&W photo of Einstein. Math equations. Satellite orbiting. Red error line grows to 11km.
*   1:19-1:32 | Ch 6 (Signal): VO: "Signal 100x weaker than noise. 1023 pulse pattern." Visual: Audio waveform. Yellow binary/pulse blocks. Slider aligns pattern to find signal.
*   **1:33-1:45 | Ch 7 (Internet):** VO: "50 bps speed. Slow. Internet helps." Visual: Binary code typing. Progress bar comparing 90s modem to GPS. Timer compares cold start vs A-GPS (0:01s).
*   **1:46-2:00 | Ch 8 (City):** VO: "City reflections. Multipath error. 3D models fix it." Visual: 2D buildings. Yellow line bounces off building (red X). Phone uses 3D map to correct.
*   **2:01-2:20 | Ch 9 (Spoofing):** VO: "Spoofing. 2013 yacht experiment." Visual: Map of Mediterranean. Yacht icon. Fake satellite box overrides real signal. Yacht path deviates on map.
*   **2:21-2:32 | Ch 10 (Accuracy):** VO: "Pre-2000 civilian GPS degraded to 100m. Clinton disabled it. Now 5m accuracy." Visual: Grid with red dots (100m scatter). Photo of Clinton. Dots converge to tight green cluster (5m).
*   **2:33-2:37 | CTA:** VO: "Subscribe." Visual: Avatar scales up. Social handle displayed.

## 10. Recreation Prompt
Create a vertical 9:16 animated explainer using HTML/Canvas/SVG. Use a blueprint aesthetic: `#0A1128` background, `#1A2442` 1px grid (10% spacing), subtle vignette. Top UI: Avatar/handle left, segmented yellow progress bar center, chapter title right. Bottom UI: 1-3 word all-caps captions (Montserrat, bold, white), active word highlighted with `#FFD700` background box. Visuals must use minimalist 2px white line-art for primary objects, 1px for connections. Use `#FFD700` for active data/lines, `#FF4C4C` for errors. Animate via continuous smooth camera pans/zooms (`cubic-bezier(0.25,1,0.5,1)`), avoiding hard cuts. Elements enter via 300ms scale-pops. Include monospace terminal boxes (`#000000` 50% opacity bg) with typing effects for data. Sync rapid visual changes (draw-on paths, ticking numbers) to a fast-paced VO. Add UI clicks, typing SFX, and whooshes on camera moves.