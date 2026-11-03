/**
 * GLSL for the juice. It is drawn in two passes, like screen-space fluid
 * rendering:
 *
 * 1. Field pass (off screen, additive, two render targets). Every river, spring
 *    pool and the lake writes a smooth "coverage" bump plus its height, flow
 *    velocity, focus and shadow, weighted by that coverage. Where bumps overlap
 *    they add up, so streams merge into one liquid body instead of stacking.
 *      A = (coverage, coverage·height, coverage·(flow·k + ½))
 *      B = (coverage·presence, shadow, coverage·froth, 0)
 * 2. Surface pass (on screen). Wherever the coverage crosses ½ there is juice.
 *    The shader rebuilds the surface from the field (a rounded meniscus at the
 *    edges), adds ripples carried along by the current (a two-phase flow map),
 *    refracts the board seen through the shallows, lights the bed with caustics,
 *    and reflects a soft studio light with Fresnel, plus sun sparkles and froth.
 *
 * Colors are raw sRGB (no color-space conversion) so they match the CSS.
 */

/** Flow velocity is stored as flow·FLOW_K + ½ so it survives an 8-bit render target. */
export const FLOW_K = 0.12;

const FIELD_LIB = /* glsl */ `
layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;
uniform float uTime;
uniform float uStart;
uniform float uFocus;
const float FLOW_K = ${FLOW_K.toFixed(3)};
// Flat-topped bump: ½ at the nominal edge (v = ±1), ~0 by 1.5.
float superG(float v) { float v2 = v * v; return exp(-0.693147 * v2 * v2); }
float softG(float v) { return exp(-0.693147 * v * v); }
float presence(float idx) { return uFocus < 0.0 ? 1.0 : (abs(uFocus - idx) < 0.5 ? 1.0 : 0.0); }
void writeField(float c, float h, vec2 flow, float pres, float shadow, float froth) {
  outA = vec4(c, c * h, c * (flow * FLOW_K + 0.5));
  outB = vec4(c * pres, shadow, c * froth, 0.0);
}
`;

export const riverFieldVertex = /* glsl */ `
attribute vec2 aC;
attribute vec2 aN;
attribute vec2 aT;
attribute float aSide;
attribute float aS;
attribute float aLen;
attribute float aHalf;
attribute float aH;
attribute float aSpeed;
attribute float aIdx;
attribute float aFade;
attribute float aDelay;
attribute float aFroth;
uniform float uPx;
uniform vec2 uShadowDir;
uniform float uShadowLen;
varying float vV;
varying float vShadowV;
varying float vAlong;
varying float vThin;
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
  float ext = spread * 2.2 + abs(shift) + uPx * 2.0;
  vec2 p = aC + aN * (aSide * ext);
  vV = aSide * ext / spread;
  vShadowV = shift / spread;
  vAlong = aS * aLen;
  vThin = aHalf / spread;
  vH = aH;
  vFlow = aT * aSpeed;
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
varying float vV;
varying float vShadowV;
varying float vAlong;
varying float vThin;
varying float vH;
varying vec2 vFlow;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vFroth;
varying float vND;
varying float vLen;
void main() {
  // The juice pours out of the spring and runs toward the lake.
  float front = (uTime - uStart - vDelay) * 8.0;
  float pour = 1.0 - smoothstep(front - 0.45, front + 0.05, vAlong);
  if (pour <= 0.0) discard;
  // fade in under the key and out inside the lake, so the ends never show
  float ends = smoothstep(0.0, 0.7, vAlong) * (1.0 - smoothstep(vLen - 0.6, vLen, vAlong)) * pour;
  float c = superG(vV) * ends;
  // the shadow only shows on the side away from the light
  float shadow = superG(vV - vShadowV) * ends * smoothstep(-0.05, 0.3, sign(vV) * vND);
  float pres = presence(vIdx) * (1.0 - vFade) * mix(0.45, 1.0, vThin);
  float froth = vFroth + 0.9 * smoothstep(front - 1.6, front - 0.15, vAlong);
  writeField(c, vH, vFlow, pres, shadow * pres, froth);
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
uniform vec2 uShadowDir;
uniform float uShadowLen;
varying vec2 vLocal;
varying vec2 vShadowC;
varying float vH;
varying float vIdx;
varying float vFade;
varying float vDelay;
varying float vSpeed;
void main() {
  float R = max(aR, uPx * 1.2);
  vec2 sh = uShadowDir * aH * uShadowLen;
  float ext = 2.0 + (length(sh) + uPx * 2.0) / R;
  vLocal = position.xy * ext;
  vShadowC = sh / R;
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
  float c = superG(r) * appear;
  float shadow = superG(length(vLocal - vShadowC)) * appear * smoothstep(-0.05, 0.3, dot(r > 1e-3 ? vLocal / r : vec2(0.0), normalize(vShadowC + 1e-5)));
  // A spring wells up: small rings travel outward from under the key.
  float ring = sin(r * 15.0 - since * (2.4 + vSpeed)) * smoothstep(0.3, 0.65, r) * (1.0 - smoothstep(0.85, 1.05, r));
  vec2 dir = r > 1e-3 ? vLocal / r : vec2(0.0);
  float pres = presence(vIdx) * (1.0 - vFade);
  writeField(c, vH * (1.0 + 0.1 * ring), dir * (0.18 + 0.12 * vSpeed), pres, shadow * pres, 0.25 * smoothstep(0.35, 0.7, r));
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
varying vec2 vXZ;
void main() {
  if (uFill <= 0.001) discard;
  float r = length(vXZ);
  float outer = uInner + (uOuter - uInner) * uFill;
  float mid = (uInner + outer) * 0.5;
  float halfW = max((outer - uInner) * 0.5, 0.02);
  float c = superG((r - mid) / halfW);
  vec2 radial = vXZ / max(r, 1e-3);
  // The lake slowly circles your site while the rivers pour in.
  vec2 flow = -radial * 0.5 + vec2(-radial.y, radial.x) * 0.42;
  writeField(c, 0.2, flow, uFocus < 0.0 ? 1.0 : 0.62, 0.0, 0.12);
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
const float FLOW_K = ${FLOW_K.toFixed(3)};

// Liquid height profile from coverage: 0 at the shore, rounding up to a flat top.
float shapeOf(float c) { return pow(clamp((c - 0.5) * 2.4, 0.0, 1.0), 0.6); }
float heightAt(vec2 uv) {
  vec4 a = texture2D(uFieldA, uv);
  return a.r > 0.02 ? a.g / a.r * shapeOf(a.r) : 0.0;
}
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
  float c = A.r;
  float shadow = B.g;
  if (c < 0.4 && shadow < 0.02) discard;
  float px = fwidth(vXZ.x) * 0.9;
  vec3 ground = board(vXZ, px);

  // Light passing through the juice throws a soft orange shadow with a bright caustic seam.
  float sk = smoothstep(0.03, 0.85, shadow);
  float seam = smoothstep(0.06, 0.3, shadow) * (1.0 - smoothstep(0.3, 0.72, shadow));
  vec3 shaded = ground * mix(vec3(1.0), uShade, sk * 0.6) + uGlow * seam * 0.08;
  float gA = clamp(max(sk, seam) * 3.0, 0.0, 1.0);

  float aa = max(fwidth(c) * 0.8, 1e-3);
  float inside = smoothstep(0.5 - aa, 0.5 + aa, c);
  if (inside <= 0.0) {
    if (gA <= 0.004) discard;
    gl_FragColor = vec4(shaded, gA);
    return;
  }

  float wsum = max(c, 1e-3);
  float pres = clamp(B.r / wsum, 0.0, 1.0);
  vec2 flow = (A.ba / wsum - 0.5) / FLOW_K;
  float speed = length(flow);
  float hgt = A.g / wsum;
  float T = hgt * shapeOf(c);

  // Meniscus: the slope of the liquid surface, rebuilt from the field (screen up = world -z).
  float hx1 = heightAt(uv + vec2(uTexel.x, 0.0)), hx0 = heightAt(uv - vec2(uTexel.x, 0.0));
  float hy1 = heightAt(uv + vec2(0.0, uTexel.y)), hy0 = heightAt(uv - vec2(0.0, uTexel.y));
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
  float calm = smoothstep(0.0, 0.025, T);
  vec2 rip = (sA * 0.15 + sB * 0.05) * rough * calm;
  vec3 Nm = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 N = normalize(vec3(-(slope.x + rip.x), 1.0, -(slope.y + rip.y)));

  // Body: deep orange where it's thick, lighter in the shallows, the board showing through at the edges.
  float tOpt = sqrt(clamp(T / 0.2, 0.0, 1.6));
  vec3 juice = mix(uShallow, uDeep, smoothstep(0.25, 0.95, tOpt));
  vec2 refr = vXZ - N.xz * T * 1.4;
  vec3 bed = board(refr, px) * mix(vec3(1.0), uShade, sk * 0.42);
  float caus = clamp((rA.a * 0.7 + rB.a * 0.3 - 0.25) * norm + 0.25, 0.0, 1.0);
  bed += uGlow * caus * 0.5;
  float trans = exp(-tOpt * 3.4);
  vec3 body = mix(juice, bed * uThin, trans);
  body *= 1.0 + (caus - 0.3) * 0.07 * (1.0 - trans) * rough;
  body *= 0.88 + 0.16 * clamp(dot(N, uSun), 0.0, 1.0);
  float crest = smoothstep(0.58, 0.92, rA.b * 0.6 + rB.b * 0.4) * calm;
  body += uGlow * crest * 0.06 * rough;
  float steep = smoothstep(0.08, 0.45, 1.0 - Nm.y);
  body = mix(body, uRim, steep * 0.55);

  // Reflections: a soft studio sky and a big softbox, weighted by Fresnel, plus sun sparkles.
  float NdV = clamp(dot(N, uView), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-uView, N);
  float box = pow(clamp(dot(R, uBox), 0.0, 1.0), 36.0);
  vec3 env = mix(vec3(0.72, 0.7, 0.68), vec3(1.0, 0.99, 0.97), clamp(R.y, 0.0, 1.0)) + vec3(1.0, 0.97, 0.93) * box * 7.0;
  float spec = pow(clamp(dot(N, normalize(uSun + uView)), 0.0, 1.0), 900.0) * 1.6 * calm;
  vec3 col = body * (1.0 - F) + env * F + spec;

  // Froth: tiny bubbles along the shore of big rivers, a few patches drifting on fast water,
  // and foam where the juice pours in or streams merge.
  vec4 fd = texture2D(uDetail, (vXZ - o0 * 0.85) * 0.5 + j0 * 2.0) * w0 + texture2D(uDetail, (vXZ - o1 * 0.85) * 0.5 + j1 * 2.0) * w1;
  float cells = fd.a * 0.8 + fd.g * 0.2;
  float frothAmt = B.b / wsum;
  float shore = (1.0 - smoothstep(0.52, 0.6, c)) * smoothstep(0.1, 0.18, hgt) * 0.45;
  float drift = smoothstep(0.74, 0.92, fd.b) * smoothstep(1.4, 3.0, speed) * 0.5;
  float pourFoam = smoothstep(0.35, 0.9, frothAmt) * 0.9;
  float merge = smoothstep(1.45, 1.9, c) * 0.35;
  float froth = clamp((shore + drift + pourFoam + merge) * cells, 0.0, 1.0) * calm;
  col = mix(col, uFoam, froth * 0.75);

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
