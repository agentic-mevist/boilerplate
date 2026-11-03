/**
 * GLSL for the juice. Rivers, spring pools and the lake are crisp stylized
 * water: a deeper center, lighter shallows, ripples that flow downstream (fast
 * in big rivers, slow in tiny springs), a darker outline and a wet-sand bank.
 * Dotted guide lines (nofollow, lost, output) follow paths stored in one float
 * texture (uPaths: SAMPLES × paths) plus a per-path info texture (uInfo).
 *
 * Colors are raw sRGB (no color-space conversion) so they match the CSS.
 */

const PATH_LIB = /* glsl */ `
uniform sampler2D uPaths;
uniform sampler2D uInfo;
uniform float uSamples;
uniform float uTime;
uniform float uStart;
uniform float uFocus;

vec2 pathAt(int row, float t) {
  float f = clamp(t, 0.0, 1.0) * (uSamples - 1.0);
  int i0 = int(floor(f));
  int i1 = min(i0 + 1, int(uSamples) - 1);
  vec2 a = texelFetch(uPaths, ivec2(i0, row), 0).xy;
  vec2 b = texelFetch(uPaths, ivec2(i1, row), 0).xy;
  return mix(a, b, f - float(i0));
}

vec2 tangentAt(int row, float t) {
  vec2 a = pathAt(row, max(t - 0.012, 0.0));
  vec2 b = pathAt(row, min(t + 0.012, 1.0));
  vec2 d = b - a;
  float l = length(d);
  return l > 1e-5 ? d / l : vec2(1.0, 0.0);
}

// The stream starts narrow at the spring, swells, and narrows again into the hub's inlet.
float widthProfile(float t) {
  return smoothstep(0.0, 0.12, t) * (1.0 - 0.5 * smoothstep(0.78, 1.0, t));
}

// Fraction of the path the juice has reached since the reveal started.
float revealFront(float L, float delay, float speed) {
  return (uTime - uStart - delay) * speed / L;
}

float focusDim(float row, float dimTo) {
  if (uFocus < 0.0) return 1.0;
  return abs(uFocus - row) > 0.5 ? dimTo : 1.6; // the focused stream glows a little brighter
}
`;

export const dashVertex = /* glsl */ `
${PATH_LIB}
uniform vec3 uDash;
uniform vec3 uLost;
uniform vec3 uOutput;
attribute float aPath;
attribute float aPhase;
attribute float aSpeed;
attribute float aLen;
attribute float aThick;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;

void main() {
  int row = int(aPath + 0.5);
  vec4 i0 = texelFetch(uInfo, ivec2(0, row), 0);
  vec4 i1 = texelFetch(uInfo, ivec2(1, row), 0);
  float L = i0.x;
  float delay = i0.z;
  float health = i0.w;
  float fade = i1.x;

  float t = fract(aPhase + uTime * aSpeed / L);
  float front = revealFront(L, delay * 0.4, 22.0);
  float alpha = 1.0 - smoothstep(front - 0.02, front, t);
  vec3 col = uDash;
  if (health > 4.5 && health < 5.5) {
    col = uLost;
    alpha *= 1.0 - smoothstep(0.6, 1.0, t); // a dry bed that fades out before reaching you
  } else if (health > 5.5) {
    col = uOutput;
  }
  alpha *= (1.0 - smoothstep(0.97, 1.0, t)) * min(focusDim(aPath, 0.35), 1.0) * (1.0 - fade * 0.85);
  vColor = col;
  vAlpha = alpha;
  vUv = vec2(position.x, position.y + 0.5);

  vec2 p = pathAt(row, t);
  vec2 tg = tangentAt(row, t);
  vec2 nr = vec2(-tg.y, tg.x);
  vec2 w = p + tg * (position.x - 0.5) * aLen + nr * position.y * aThick;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(w.x, 0.02, w.y, 1.0);
}
`;

export const dashFragment = /* glsl */ `
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
void main() {
  // capsule
  vec2 q = vec2((vUv.x - 0.5) * 2.0, (vUv.y - 0.5) * 2.0);
  float d = length(vec2(max(abs(q.x) - 0.45, 0.0) / 0.55, q.y));
  float a = 1.0 - smoothstep(0.7, 1.0, d);
  float alpha = a * vAlpha;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(vColor, alpha);
}
`;

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

/** Shared water palette lookup: 0 clean, 1 suspicious, 2 toxic, 4 leak. */
const WATER_LIB = /* glsl */ `
uniform vec3 uDeep[6];
uniform vec3 uShallow[6];
uniform vec3 uFoam;
uniform vec3 uFoamMurky;
uniform vec3 uBank;
uniform vec3 uBg;
uniform vec3 uLeak;
uniform float uTime;
uniform float uStart;
uniform float uFocus;
${NOISE}
`;

export const waterVertex = /* glsl */ `
attribute float aS;
attribute float aV;
attribute float aLen;
attribute float aW;
attribute float aSpeed;
attribute float aHealth;
attribute float aIdx;
attribute float aFade;
attribute float aDelay;
attribute float aBankV;
varying float vS;
varying float vV;
varying float vLen;
varying float vW;
varying float vSpeed;
varying float vHealth;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vBankV;
varying vec2 vXZ;
void main() {
  vS = aS; vV = aV; vLen = aLen; vW = aW; vSpeed = aSpeed; vHealth = aHealth;
  vIdx = aIdx; vFade = aFade; vDelay = aDelay; vBankV = aBankV;
  vXZ = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const waterFragment = /* glsl */ `
${WATER_LIB}
varying float vS;
varying float vV;
varying float vLen;
varying float vW;
varying float vSpeed;
varying float vHealth;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vBankV;
varying vec2 vXZ;
uniform float uInner;
uniform float uOuter;
uniform float uFill;

void main() {
  // Rivers stop at the lake shore; the lake carries on from there.
  if (length(vXZ) < uInner + (uOuter - uInner) * uFill - 0.02) discard;
  float along = vS * vLen;
  float av = abs(vV);
  float aa = max(fwidth(vV), 1e-4);

  // The water pours out of the spring and runs toward the lake.
  float front = (uTime - uStart - vDelay) * 8.0;
  float revealed = 1.0 - smoothstep(front - 0.5, front, along);
  if (revealed <= 0.001) discard;

  int h = int(vHealth + 0.5);
  float ends = 1.0;
  if (h == 2) {
    // murky water gets filtered out before it reaches you
    ends = 1.0 - smoothstep(0.42, 0.68, vS + (noise(vec2(along * 2.2, vV * 2.0)) - 0.5) * 0.14);
  } else if (h == 4) {
    // a leak: the river spills away just before the lake
    ends = 1.0 - smoothstep(0.8, 0.94, vS + (noise(vec2(along * 3.0, vV * 3.0)) - 0.5) * 0.12);
  }

  float water = (1.0 - smoothstep(1.0 - aa, 1.0 + aa, av)) * step(0.001, ends);
  float waterEnd = smoothstep(0.0, 0.08, ends);
  water *= waterEnd;
  float bankOuter = 1.0 + vBankV;
  float bank = (1.0 - smoothstep(bankOuter - vBankV * 0.55, bankOuter, av)) * smoothstep(0.0, 0.25, ends + 0.05);

  vec3 deep = uDeep[h];
  vec3 shallow = uShallow[h];
  if (h == 4) {
    float k = smoothstep(0.55, 0.85, vS);
    deep = mix(deep, uLeak, k);
    shallow = mix(shallow, uLeak * 1.15, k);
  }
  vec3 col = mix(deep, shallow, smoothstep(0.1, 0.95, av));

  // Ripples: long thin streaks drifting downstream, thresholded for crisp edges.
  // Narrow springs stay simple; wide rivers get more texture (and move faster).
  float detail = smoothstep(0.12, 0.6, vW);
  float t = uTime * vSpeed;
  float across = vV * max(vW, 0.22);
  vec2 q = vec2(along * 0.5 - t * 0.5, across * 5.2);
  float n = noise(q) * 0.6 + noise(q * vec2(1.9, 1.4) + vec2(13.1, 7.7)) * 0.4;
  float wn = max(fwidth(n), 1e-4);
  float rip = smoothstep(0.665 - wn, 0.665 + wn, n) * (1.0 - smoothstep(0.7, 0.95, av));
  vec3 foam = h == 2 ? uFoamMurky : uFoam;
  col = mix(col, foam, rip * mix(0.35, 0.85, detail));
  // a thin bright line of foam just inside each bank (wide rivers only)
  float lip = smoothstep(0.74, 0.86, av) * (1.0 - smoothstep(0.86, 0.96, av));
  col = mix(col, foam, lip * detail * (0.35 + 0.35 * noise(vec2(along * 2.0 - t, sign(vV) * 3.0))));
  // crisp darker outline
  float outline = smoothstep(1.0 - aa * 2.6, 1.0 - aa * 0.7, av);
  col = mix(col, deep * 0.8, outline);

  vec3 outCol = mix(uBank, col, water);
  float alpha = max(water, bank * 0.6);
  if (uFocus >= 0.0 && abs(uFocus - vIdx) > 0.5) {
    outCol = mix(outCol, uBg, 0.72);
    alpha *= 0.6;
  }
  alpha *= revealed * (1.0 - vFade);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(outCol, alpha);
}
`;

/** A little spring pool under each key: concentric ripples spreading outward. */
export const poolVertex = /* glsl */ `
attribute float aHealth;
attribute float aIdx;
attribute float aFade;
attribute float aDelay;
attribute float aSpeed;
varying vec2 vP;
varying float vHealth;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vSpeed;
void main() {
  vP = position.xy * 2.0; // -1..1 across the disc
  vHealth = aHealth; vIdx = aIdx; vFade = aFade; vDelay = aDelay; vSpeed = aSpeed;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

export const poolFragment = /* glsl */ `
${WATER_LIB}
varying vec2 vP;
varying float vHealth;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vSpeed;
void main() {
  float r = length(vP);
  float aa = max(fwidth(r), 1e-4);
  float appear = smoothstep(0.0, 0.35, uTime - uStart - vDelay);
  if (appear <= 0.001) discard;
  int h = int(vHealth + 0.5);
  float edge = 0.8;
  float water = 1.0 - smoothstep(edge - aa, edge + aa, r);
  float bank = 1.0 - smoothstep(0.86, 1.0, r);
  vec3 deep = uDeep[h], shallow = uShallow[h];
  vec3 col = mix(deep, shallow, smoothstep(0.35, 0.8, r));
  // rings welling up from the spring
  float ring = fract(r * 2.6 - uTime * (0.35 + vSpeed * 0.18));
  float rw = max(fwidth(r * 2.6), 1e-4);
  float rings = smoothstep(0.5 - rw, 0.5 + rw, ring) * (1.0 - smoothstep(0.5 + 0.12, 0.62 + rw, ring));
  col = mix(col, h == 2 ? uFoamMurky : uFoam, rings * 0.55 * smoothstep(0.25, 0.5, r));
  float outline = smoothstep(edge - aa * 2.6, edge - aa * 0.7, r) * water;
  col = mix(col, deep * 0.8, outline);
  vec3 outCol = mix(uBank, col, water);
  float alpha = max(water, bank * 0.6) * appear;
  if (uFocus >= 0.0 && abs(uFocus - vIdx) > 0.5) {
    outCol = mix(outCol, uBg, 0.72);
    alpha *= 0.6;
  }
  alpha *= 1.0 - vFade;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(outCol, alpha);
}
`;

/** The lake around your site: the water slowly circles the hub. */
export const lakeVertex = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const lakeFragment = /* glsl */ `
${WATER_LIB}
uniform float uInner;
uniform float uOuter;
uniform float uFill;
varying vec2 vP;
void main() {
  float r = length(vP);
  float aa = max(fwidth(r), 1e-4);
  float outer = uInner + (uOuter - uInner) * uFill;
  if (uFill <= 0.001) discard;
  float water = 1.0 - smoothstep(outer - aa, outer + aa, r);
  float bank = 1.0 - smoothstep(outer + 0.05, outer + 0.32, r);
  float ang = atan(vP.y, vP.x);
  vec3 deep = uDeep[0], shallow = uShallow[0];
  vec3 col = mix(deep, shallow, smoothstep(uInner + 0.2, outer, r) * 0.7);
  // swirl: ripples drift around the hub
  vec2 q = vec2(ang * 5.0 - uTime * 0.45, r * 7.5 - uTime * 0.2);
  float n = noise(q) * 0.6 + noise(q * vec2(1.7, 1.9) + 5.3) * 0.4;
  float wn = max(fwidth(n), 1e-4);
  float rip = smoothstep(0.67 - wn, 0.67 + wn, n);
  col = mix(col, uFoam, rip * 0.8);
  float outline = smoothstep(outer - aa * 2.6, outer - aa * 0.7, r) * water;
  col = mix(col, deep * 0.8, outline);
  vec3 outCol = mix(uBank, col, water);
  float alpha = max(water, bank * 0.6);
  if (uFocus >= 0.0) { outCol = mix(outCol, uBg, 0.35); }
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(outCol, alpha);
}
`;

export const gridVertex = /* glsl */ `
varying vec2 vXZ;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vXZ = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const gridFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uSpacing;
uniform float uRadius;
uniform float uFadeR;
varying vec2 vXZ;
void main() {
  vec2 g = fract(vXZ / uSpacing) - 0.5;
  float d = length(g) * uSpacing;
  float px = fwidth(vXZ.x) * 0.9;
  float dotA = 1.0 - smoothstep(uRadius - px, uRadius + px, d);
  float r = length(vXZ);
  float fade = 1.0 - smoothstep(uFadeR * 0.35, uFadeR, r);
  float a = dotA * fade * 0.9;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

export const iconVertex = /* glsl */ `
attribute vec4 aRect;
attribute float aAlpha;
varying vec2 vUv;
varying float vA;
void main() {
  vUv = aRect.xy + uv * aRect.zw;
  vA = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

export const iconFragment = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying float vA;
void main() {
  vec4 c = texture2D(uAtlas, vUv);
  float a = c.a * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(c.rgb, a);
}
`;

export const shadowVertex = /* glsl */ `
attribute float aAlpha;
varying vec2 vUv;
varying float vA;
void main() {
  vUv = uv;
  vA = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

export const shadowFragment = /* glsl */ `
varying vec2 vUv;
varying float vA;
void main() {
  // soft rounded-square shadow
  vec2 q = abs(vUv - 0.5) * 2.0;
  float d = length(max(q - 0.38, 0.0)) / 0.62;
  float a = (1.0 - smoothstep(0.0, 1.0, d));
  a = a * a * vA;
  if (a < 0.003) discard;
  gl_FragColor = vec4(0.30, 0.26, 0.20, a);
}
`;

export const ringVertex = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringFragment = /* glsl */ `
uniform float uTime;
uniform float uScore;   // 0..1, animated
uniform vec3 uColor;
uniform vec3 uTrack;
uniform float uInner;
uniform float uOuter;
varying vec2 vP;
void main() {
  float r = length(vP);
  float ang = atan(vP.y, vP.x);              // -pi..pi
  float a01 = fract((ang / 6.28318530718) + 0.25); // 0 at top, clockwise-ish
  float mid = (uInner + uOuter) * 0.5;
  float halfW = (uOuter - uInner) * 0.5;
  float band = 1.0 - smoothstep(halfW - 0.015, halfW + 0.015, abs(r - mid));
  // Score arc (solid) + rotating dashes on the remainder (like a loading ring).
  float onArc = step(a01, uScore);
  float dashes = step(0.5, fract(a01 * 18.0 - uTime * 0.15));
  vec3 col = mix(uTrack, uColor, onArc);
  float alpha = band * mix(0.9 * dashes * 0.8, 1.0, onArc);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;
