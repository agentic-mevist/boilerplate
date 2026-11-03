/**
 * GLSL for the juice. It is drawn in two passes, like screen-space fluid
 * rendering:
 *
 * 1. Field pass (off screen, additive, two render targets). Every river, spring
 *    pool and the lake is a shape with a signed distance d to its shore
 *    (negative inside). Each writes w = exp(−d/K) and its height, flow, focus,
 *    size and shadow weighted by w:
 *      A = (Σw, Σw·(h/HMAX)⁴, Σw·(flow·k + ½))
 *      B = (Σw·presence, shadow, Σw·froth, Σw·size/2)
 *    −K·ln(Σw) is a smooth minimum of all the distances: one liquid body whose
 *    streams meet in smooth necks (about K wide), while streams further apart
 *    stay apart. Deep inside a body w is large, so where a thin stream joins a
 *    river the river's height and current win and no groove is left behind.
 * 2. Surface pass (on screen). Inside the shore there is juice: flat on top,
 *    curving down in a narrow meniscus at the edge. The shader adds ripples
 *    carried along by the current (a two-phase flow map), refracts the board
 *    seen through the shallows, lights the bed with caustics, and reflects a
 *    soft studio light with Fresnel, plus sun sparkles and a little froth.
 *
 * Colors are raw sRGB (no color-space conversion) so they match the CSS.
 */

/** Flow velocity is stored as flow·FLOW_K + ½ so it stays in range for 8-bit targets. */
export const FLOW_K = 0.12;
/** Heights are stored relative to this (world units). */
export const HMAX = 0.12;
/** Width of the curved band at the shore (world units). */
export const MENISCUS = 0.075;
/** Distances below −DEEP count as fully inside (keeps Σw in half-float range). */
export const DEEP = 0.3;
/** Rivers run on this far past the end of their path, into the lake (world units). Matches Liquid.tsx. */
export const RUN_ON = 0.8;

const f = (x: number) => x.toFixed(4);

const FIELD_LIB = /* glsl */ `
layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;
uniform float uTime;
uniform float uStart;
uniform float uFocus;
uniform float uK;
uniform float uWS;
const float FLOW_K = ${f(FLOW_K)};
const float HMAX = ${f(HMAX)};
const float DEEP = ${f(DEEP)};
const float RUN_ON = ${f(RUN_ON)};
float presence(float idx) { return uFocus < 0.0 ? 1.0 : (abs(uFocus - idx) < 0.5 ? 1.0 : 0.0); }
// A soft shadow from the shadow shape's signed distance.
float shadowOf(float ds) { return 1.0 - smoothstep(-0.06, 0.08, ds); }
// Distance to a capsule running along a path from s0 to s1 (world units), with radius r.
float capsule(float along, float lateral, float s0, float s1, float r) {
  float c0 = s0 + r, c1 = max(c0, s1 - r);
  return length(vec2(along - clamp(along, c0, c1), lateral)) - r;
}
void writeField(float d, float h, vec2 flow, float pres, float shadow, float froth, float size) {
  float w = exp(-max(d, -DEEP) / uK) * uWS;
  float t = h / HMAX;
  t *= t;
  outA = vec4(w, w * t * t, w * (flow * FLOW_K + 0.5));
  outB = vec4(w * pres, shadow, w * froth, w * size * 0.5);
}
`;

export const riverFieldVertex = /* glsl */ `
attribute vec2 aC;
attribute vec2 aN;
attribute vec2 aT;
attribute float aSide;
attribute float aAlong;
attribute float aLen;
attribute float aHalf;
attribute float aH;
attribute float aSpeed;
attribute float aIdx;
attribute float aFade;
attribute float aDelay;
attribute float aFroth;
uniform float uPx;
uniform float uK;
uniform vec2 uShadowDir;
uniform float uShadowLen;
const float RUN_ON = ${f(RUN_ON)};
varying float vLat;
varying float vShift;
varying float vAlong;
varying float vThin;
varying float vSpread;
varying float vH;
varying vec2 vFlow;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vFroth;
varying float vND;
varying float vLen;
void main() {
  // Springs thinner than a texel are drawn one texel wide (and a little fainter).
  float spread = max(aHalf, uPx * 0.85);
  float shift = dot(uShadowDir, aN) * aH * uShadowLen;
  // reach far enough past the shore for the smooth union and the soft shadow
  float ext = spread + max(uK * 4.0, abs(shift) + 0.12) + uPx * 2.0;
  vec2 p = aC + aN * (aSide * ext);
  vLat = aSide * ext;
  vShift = shift;
  vAlong = aAlong;
  vThin = aHalf / spread;
  vSpread = spread;
  vH = aH;
  // the current slows as the river spreads into the lake
  vFlow = aT * aSpeed * mix(1.0, 0.3, smoothstep(aLen - 1.2, aLen + RUN_ON, aAlong));
  vIdx = aIdx;
  vFade = aFade;
  vDelay = aDelay;
  vFroth = aFroth;
  vND = dot(aN, uShadowDir);
  vLen = aLen;
  gl_Position = projectionMatrix * viewMatrix * vec4(p.x, 0.0, p.y, 1.0);
}
`;

export const riverFieldFragment = /* glsl */ `
${FIELD_LIB}
varying float vLat;
varying float vShift;
varying float vAlong;
varying float vThin;
varying float vSpread;
varying float vH;
varying vec2 vFlow;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vFroth;
varying float vND;
varying float vLen;
void main() {
  // The juice pours out of the spring and runs toward the lake; its front is rounded.
  float front = (uTime - uStart - vDelay) * 8.0;
  if (front <= 0.0) discard;
  // Starts under the key (behind its pool). While pouring, the front is a rounded cap; once
  // it arrives, the stream runs on at full width into the lake and fades out under your site.
  float end = vLen + RUN_ON;
  float s0 = -vSpread, s1 = front < end ? front : end + vSpread;
  float fadeOut = -uK * log(max(1.0 - smoothstep(vLen - 0.3, end, vAlong), 1e-4));
  float d = capsule(vAlong, vLat, s0, s1, vSpread) + fadeOut;
  // the shadow only shows on the side away from the light
  float ds = capsule(vAlong, vLat - vShift, s0, s1, vSpread) + fadeOut;
  float shadow = shadowOf(ds) * smoothstep(-0.05, 0.3, sign(vLat) * vND);
  float pres = presence(vIdx) * (1.0 - vFade) * mix(0.45, 1.0, vThin);
  float froth = vFroth + 0.9 * smoothstep(front - 1.6, front - 0.15, vAlong);
  writeField(d, vH, vFlow, pres, shadow * pres, froth, vSpread);
}
`;

export const poolFieldVertex = /* glsl */ `
attribute vec2 aCenter;
attribute float aR;
attribute float aH;
attribute float aIdx;
attribute float aFade;
attribute float aDelay;
attribute float aSpeed;
uniform float uPx;
uniform float uK;
uniform vec2 uShadowDir;
uniform float uShadowLen;
varying vec2 vLocal;
varying vec2 vShadowC;
varying float vR;
varying float vH;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vSpeed;
void main() {
  float R = max(aR, uPx * 1.2);
  vec2 sh = uShadowDir * aH * uShadowLen;
  float ext = 1.0 + (max(uK * 4.0, length(sh) + 0.12) + uPx * 2.0) / R;
  vLocal = position.xy * ext;
  vShadowC = sh / R;
  vR = R;
  vH = aH;
  vIdx = aIdx;
  vFade = aFade;
  vDelay = aDelay;
  vSpeed = aSpeed;
  vec2 p = aCenter + vLocal * R;
  gl_Position = projectionMatrix * viewMatrix * vec4(p.x, 0.0, p.y, 1.0);
}
`;

export const poolFieldFragment = /* glsl */ `
${FIELD_LIB}
varying vec2 vLocal;
varying vec2 vShadowC;
varying float vR;
varying float vH;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vSpeed;
void main() {
  float since = uTime - uStart - vDelay;
  float appear = smoothstep(0.0, 0.45, since);
  if (appear <= 0.0) discard;
  float r = length(vLocal);
  float d = (r - appear) * vR;
  float ds = (length(vLocal - vShadowC) - appear) * vR;
  float shadow = shadowOf(ds) * smoothstep(-0.05, 0.3, dot(r > 1e-3 ? vLocal / r : vec2(0.0), normalize(vShadowC + 1e-5)));
  // A spring wells up: faint rings travel outward from under the key.
  float ring = sin(r * 15.0 - since * (2.4 + vSpeed)) * smoothstep(0.3, 0.65, r) * (1.0 - smoothstep(0.8, 0.95, r));
  vec2 dir = r > 1e-3 ? vLocal / r : vec2(0.0);
  float pres = presence(vIdx) * (1.0 - vFade);
  writeField(d, vH * (1.0 + 0.06 * ring), dir * (0.18 + 0.12 * vSpeed), pres, shadow * pres, 0.08 * smoothstep(0.35, 0.7, r), vR);
}
`;

export const lakeFieldVertex = /* glsl */ `
varying vec2 vXZ;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vXZ = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const lakeFieldFragment = /* glsl */ `
${FIELD_LIB}
uniform float uInner;
uniform float uOuter;
uniform float uFill;
uniform float uLakeH;
varying vec2 vXZ;
void main() {
  if (uFill <= 0.001) discard;
  float r = length(vXZ);
  float outer = uInner + (uOuter - uInner) * uFill;
  float mid = (uInner + outer) * 0.5;
  float halfW = max((outer - uInner) * 0.5, 0.02);
  float d = abs(r - mid) - halfW;
  vec2 radial = vXZ / max(r, 1e-3);
  // The lake slowly circles your site while the rivers pour in.
  vec2 flow = -radial * 0.5 + vec2(-radial.y, radial.x) * 0.42;
  writeField(d, uLakeH, flow, uFocus < 0.0 ? 1.0 : 0.62, 0.0, 0.03, halfW);
}
`;

export const surfaceVertex = /* glsl */ `
varying vec2 vXZ;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vXZ = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const surfaceFragment = /* glsl */ `
uniform sampler2D uFieldA;
uniform sampler2D uFieldB;
uniform sampler2D uRipple;
uniform sampler2D uDetail;
uniform vec2 uBuffer;
uniform vec2 uTexel;
uniform vec2 uWorldTexel;
uniform float uTime;
uniform float uK;
uniform float uWS;
uniform vec3 uSun;
uniform vec3 uView;
uniform vec3 uBox;
uniform vec3 uBg;
uniform vec3 uGrid;
uniform float uSpacing;
uniform float uDotR;
uniform float uFadeR;
uniform vec3 uThin;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uRim;
uniform vec3 uFoam;
uniform vec3 uGlow;
uniform vec3 uShade;
varying vec2 vXZ;
const float FLOW_K = ${f(FLOW_K)};
const float HMAX = ${f(HMAX)};
const float MENISCUS = ${f(MENISCUS)};

// Signed distance to the shore of the whole liquid body (negative inside).
float shoreOf(float sw) { return sw > 1e-20 ? -uK * log(sw / uWS) : 1e3; }
// Liquid surface height: flat on top, curving down to the shore.
float surfaceOf(vec4 a, vec4 b) {
  float sw = max(a.r, 1e-20);
  float h = HMAX * sqrt(sqrt(a.g / sw));
  float size = 2.0 * b.a / sw;
  return h * smoothstep(0.0, min(MENISCUS, size * 0.8), -shoreOf(a.r));
}
float surfaceAt(vec2 uv) { return surfaceOf(texture2D(uFieldA, uv), texture2D(uFieldB, uv)); }
// The board under the juice: same dot grid as the ground.
vec3 board(vec2 p, float px) {
  vec2 g = fract(p / uSpacing) - 0.5;
  float d = length(g) * uSpacing;
  float dotA = 1.0 - smoothstep(uDotR - px, uDotR + px, d);
  float fade = 1.0 - smoothstep(uFadeR * 0.35, uFadeR, length(p));
  return mix(uBg, uGrid, dotA * fade * 0.9);
}
vec2 hash22(float n) { return fract(sin(vec2(n * 12.9898 + 1.3, n * 78.233 + 7.1)) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / uBuffer;
  vec4 A = texture2D(uFieldA, uv);
  vec4 B = texture2D(uFieldB, uv);
  float D = shoreOf(A.r);
  float shadow = min(B.g, 1.0);
  float px = fwidth(vXZ.x) * 0.9;
  if (D > 3.0 * px && shadow < 0.02) discard;
  vec3 ground = board(vXZ, px);

  // Light passing through the juice throws a soft, tinted shadow on the far side.
  float sk = smoothstep(0.03, 0.9, shadow);
  vec3 shaded = ground * mix(vec3(1.0), uShade, sk * 0.5);
  float gA = clamp(sk * 3.0, 0.0, 1.0);

  float aa = max(min(fwidth(D), 4.0 * px) * 0.75, 1e-5);
  float inside = 1.0 - smoothstep(-aa, aa, D);
  if (inside <= 0.0) {
    if (gA <= 0.004) discard;
    gl_FragColor = vec4(shaded, gA);
    return;
  }

  float sw = max(A.r, 1e-20);
  float pres = clamp(B.r / sw, 0.0, 1.0);
  vec2 flow = (A.ba / sw - 0.5) / FLOW_K;
  float speed = length(flow);
  float H = HMAX * sqrt(sqrt(A.g / sw));
  float size = 2.0 * B.a / sw;
  // 0 at the shore, 1 where the surface has flattened out
  float top = smoothstep(0.0, min(MENISCUS, size * 0.8), -D);
  float T = H * top;

  // Meniscus: the slope of the liquid surface, rebuilt from the field (screen up = world -z).
  float hx1 = surfaceAt(uv + vec2(uTexel.x, 0.0)), hx0 = surfaceAt(uv - vec2(uTexel.x, 0.0));
  float hy1 = surfaceAt(uv + vec2(0.0, uTexel.y)), hy0 = surfaceAt(uv - vec2(0.0, uTexel.y));
  vec2 slope = vec2((hx1 - hx0) / (2.0 * uWorldTexel.x), -(hy1 - hy0) / (2.0 * uWorldTexel.y));

  // Ripples carried by the current: two copies of the surface drift with the flow
  // and cross-fade, so the pattern never stretches (a two-phase flow map).
  const float P = 1.5;
  float tp = uTime / P;
  float ph0 = fract(tp), ph1 = fract(tp + 0.5);
  float w0 = 1.0 - abs(1.0 - 2.0 * ph0), w1 = 1.0 - w0;
  float norm = inversesqrt(w0 * w0 + w1 * w1);
  vec2 j0 = hash22(floor(tp)), j1 = hash22(floor(tp + 0.5) + 31.0);
  vec2 o0 = flow * (ph0 * P), o1 = flow * (ph1 * P);
  vec4 rA = texture2D(uRipple, (vXZ - o0) * 0.34 + j0) * w0 + texture2D(uRipple, (vXZ - o1) * 0.34 + j1) * w1;
  vec4 rB = texture2D(uRipple, (vXZ - o0 * 1.1) * 1.1 + j0.yx * 3.0) * w0 + texture2D(uRipple, (vXZ - o1 * 1.1) * 1.1 + j1.yx * 3.0) * w1;
  vec2 sA = (rA.rg * 2.0 - 1.0) * norm, sB = (rB.rg * 2.0 - 1.0) * norm;
  float rough = mix(0.4, 1.0, smoothstep(0.3, 2.6, speed));
  float calm = smoothstep(0.15, 0.8, top);
  vec2 rip = (sA * 0.12 + sB * 0.025) * rough * calm;
  vec3 Nm = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 N = normalize(vec3(-(slope.x + rip.x), 1.0, -(slope.y + rip.y)));

  // Body: the same juice everywhere, a touch lighter in the thinnest springs, with the
  // board showing through only right at the shore.
  float thick = smoothstep(0.0, 0.05, H);
  vec3 juice = mix(uShallow, uDeep, mix(0.55, 1.0, thick) * smoothstep(0.0, 0.7, top));
  vec2 refr = vXZ - N.xz * T * 1.4;
  vec3 bed = board(refr, px) * mix(vec3(1.0), uShade, sk * 0.42);
  float caus = clamp((rA.a * 0.7 + rB.a * 0.3 - 0.25) * norm + 0.25, 0.0, 1.0);
  bed += uGlow * caus * 0.35;
  float trans = 0.2 * (1.0 - smoothstep(0.0, 0.3, top));
  vec3 body = mix(juice, bed * uThin, trans);
  body *= 1.0 + (caus - 0.3) * 0.07 * calm * rough;
  body *= 0.9 + 0.13 * clamp(dot(N, uSun), 0.0, 1.0);
  float crest = smoothstep(0.58, 0.92, rA.b * 0.6 + rB.b * 0.4) * calm;
  body += uGlow * crest * 0.05 * rough;
  // the curved shore reads as a slightly deeper line, never a bright one
  float shore = smoothstep(0.25, 1.0, length(slope)) * (1.0 - top * 0.6);
  body = mix(body, uRim, shore * 0.38);

  // Reflections: a soft studio sky and a softbox, weighted by Fresnel, plus sun sparkles.
  // The shore is kept out of the strongest grazing reflections so the edges don't glow.
  float NdV = clamp(dot(normalize(vec3(N.x, N.y + 1.2 * (1.0 - calm), N.z)), uView), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-uView, N);
  // highlights live on the open water, not on the curved shore
  float open = calm * calm * (1.0 - smoothstep(0.08, 0.3, length(slope)));
  float box = pow(clamp(dot(R, uBox), 0.0, 1.0), 14.0);
  vec3 env = mix(vec3(0.72, 0.7, 0.68), vec3(1.0, 0.99, 0.97), clamp(R.y, 0.0, 1.0)) + vec3(1.0, 0.97, 0.93) * box * 2.6 * open;
  float spec = pow(clamp(dot(N, normalize(uSun + uView)), 0.0, 1.0), 900.0) * 1.0 * open;
  vec3 col = body * (1.0 - F) + env * F + spec;

  // Froth: a few patches drifting on fast water, and foam where the juice first pours in.
  vec4 fd = texture2D(uDetail, (vXZ - o0 * 0.85) * 0.5 + j0 * 2.0) * w0 + texture2D(uDetail, (vXZ - o1 * 0.85) * 0.5 + j1 * 2.0) * w1;
  float cells = fd.a * 0.8 + fd.g * 0.2;
  float frothAmt = B.b / sw;
  float drift = smoothstep(0.78, 0.94, fd.b) * smoothstep(1.4, 3.0, speed) * 0.35;
  float pourFoam = smoothstep(0.35, 0.9, frothAmt) * 0.9;
  float froth = clamp((drift + pourFoam) * cells, 0.0, 1.0) * calm;
  col = mix(col, uFoam, froth * 0.7);

  // Focus: every other stream steps back.
  float dim = 1.0 - pres;
  col = mix(col, uBg, dim * 0.72);
  float lA = inside * mix(1.0, 0.62, dim);
  float outA = lA + gA * (1.0 - lA);
  gl_FragColor = vec4((col * lA + shaded * gA * (1.0 - lA)) / max(outA, 1e-4), outA);
}
`;

// ---- One-time texture generators (rendered into 256² tiles) ----

export const genVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const rippleGenFragment = /* glsl */ `
uniform vec4 uWaves[RIPPLE_WAVES];
uniform float uHMin;
uniform float uHMax;
uniform float uGMax;
uniform float uDepth;
uniform float uCLo;
uniform float uCHi;
uniform vec2 uTexel;
varying vec2 vUv;
const float TAU = 6.28318530718;
void field(vec2 p, out float h, out vec2 g, out vec3 H) {
  h = 0.0;
  g = vec2(0.0);
  H = vec3(0.0);
  for (int i = 0; i < RIPPLE_WAVES; i++) {
    vec4 w = uWaves[i];
    vec2 k = TAU * w.xy;
    float th = dot(k, p) + w.w;
    float s = sin(th), c = cos(th);
    float e = w.z * exp(s - 1.0);
    float d2 = e * (c * c - s);
    h += e;
    g += e * c * k;
    H += d2 * vec3(k.x * k.x, k.x * k.y, k.y * k.y);
  }
}
float caustic(vec3 H) {
  float det = (1.0 + uDepth * H.x) * (1.0 + uDepth * H.z) - uDepth * uDepth * H.y * H.y;
  return 1.0 / max(abs(det), 0.08);
}
void main() {
  float h; vec2 g; vec3 H;
  field(vUv, h, g, H);
  // caustics are supersampled 2×2 so the bright lines stay smooth
  float cs = 0.0;
  for (int j = 0; j < 4; j++) {
    vec2 o = (vec2(float(j - (j / 2) * 2), float(j / 2)) - 0.5) * 0.5 * uTexel;
    float h2; vec2 g2; vec3 H2;
    field(vUv + o, h2, g2, H2);
    cs += caustic(H2);
  }
  cs *= 0.25;
  gl_FragColor = vec4(clamp(0.5 + 0.5 * g / uGMax, 0.0, 1.0), clamp((h - uHMin) / (uHMax - uHMin), 0.0, 1.0), pow(smoothstep(uCLo, uCHi, cs), 0.85));
}
`;

export const detailGenFragment = /* glsl */ `
uniform vec4 uPatch[PATCH_WAVES];
varying vec2 vUv;
const float TAU = 6.28318530718;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// bright thin walls between tileable Voronoi cells: bubbles
float walls(vec2 uv, float cells) {
  vec2 u = uv * cells;
  vec2 c = floor(u);
  float f1 = 9.0, f2 = 9.0;
  for (int oy = -1; oy <= 1; oy++)
    for (int ox = -1; ox <= 1; ox++) {
      vec2 g = c + vec2(float(ox), float(oy));
      vec2 gw = mod(g, cells);
      vec2 pt = g + 0.12 + 0.76 * vec2(hash(gw), hash(gw + 17.3));
      float d = length(pt - u);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
    }
  return 1.0 - smoothstep(0.02, 0.16, f2 - f1);
}
void main() {
  float s = 0.0, amp = 0.0;
  for (int i = 0; i < PATCH_WAVES; i++) {
    vec4 w = uPatch[i];
    s += w.z * sin(TAU * dot(w.xy, vUv) + w.w);
    amp += w.z;
  }
  gl_FragColor = vec4(0.0, walls(vUv, 9.0), clamp(0.5 + 0.5 * s / (amp * 0.55), 0.0, 1.0), walls(vUv, 21.0));
}
`;
