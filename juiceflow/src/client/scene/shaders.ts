/**
 * GLSL for the flowing juice. All streams live in one float texture
 * (uPaths: SAMPLES × paths, xz per texel) plus a per-path info texture
 * (uInfo: 2 × paths). Particles are instanced quads that follow their path on
 * the GPU, so thousands of Windy-style streaks cost one draw call.
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
  return (uFocus >= 0.0 && abs(uFocus - row) > 0.5) ? dimTo : 1.0;
}
`;

export const streakVertex = /* glsl */ `
${PATH_LIB}
uniform vec3 uColors[7];
uniform vec3 uLeakColor;
attribute float aPath;
attribute float aPhase;
attribute float aSpeed;
attribute float aLane;
attribute float aLen;
attribute float aThick;
attribute float aBright;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;

void main() {
  int row = int(aPath + 0.5);
  vec4 i0 = texelFetch(uInfo, ivec2(0, row), 0);
  vec4 i1 = texelFetch(uInfo, ivec2(1, row), 0);
  float L = i0.x;
  float hw = i0.y;
  float delay = i0.z;
  float health = i0.w;
  float fade = i1.x;

  float t = fract(aPhase + uTime * aSpeed / L);
  float front = revealFront(L, delay, 9.0);
  float alpha = aBright * (1.0 - smoothstep(front - 0.05, front, t));

  float lane = aLane * hw * widthProfile(t);
  vec3 col = uColors[int(health + 0.5)];

  if (health > 3.5 && health < 4.5) {
    // Leak: the stream spills sideways and soaks away before it reaches you.
    float k = smoothstep(0.62, 0.95, t);
    lane += sign(aLane + 1e-4) * k * (0.5 + hw * 1.6);
    col = mix(uColors[0], uLeakColor, smoothstep(0.5, 0.8, t));
    alpha *= 1.0 - smoothstep(0.78, 0.96, t);
  } else if (health > 1.5 && health < 2.5) {
    // Toxic: filtered out by search engines on the way in.
    alpha *= 1.0 - smoothstep(0.3, 0.7, t);
  }

  alpha *= smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.95, 1.0, t));
  alpha *= focusDim(aPath, 0.1) * (1.0 - fade);
  // Slight glow as streams converge into the hub.
  col = mix(col, uColors[0] * 1.08, 0.0);
  vColor = col;
  vAlpha = alpha;
  vUv = vec2(position.x, position.y + 0.5);

  vec2 p = pathAt(row, t);
  vec2 tg = tangentAt(row, t);
  vec2 nr = vec2(-tg.y, tg.x);
  vec2 c = p + nr * lane;
  vec2 w = c + tg * (position.x - 1.0) * aLen + nr * position.y * aThick;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(w.x, 0.035 + aBright * 0.004, w.y, 1.0);
}
`;

export const streakFragment = /* glsl */ `
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float along = vUv.x;              // 0 = tail, 1 = head
  float across = abs(vUv.y - 0.5) * 2.0;
  float a = pow(along, 1.25) * (1.0 - smoothstep(0.45, 1.0, across));
  // round, bright head
  a = max(a, smoothstep(0.92, 1.0, along) * (1.0 - smoothstep(0.2, 1.0, across)));
  float alpha = a * vAlpha;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(vColor, alpha);
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
    alpha *= 1.0 - smoothstep(0.5, 0.62, t); // dried up before reaching you
  } else if (health > 5.5) {
    col = uOutput;
  }
  alpha *= (1.0 - smoothstep(0.97, 1.0, t)) * focusDim(aPath, 0.35) * (1.0 - fade * 0.85);
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

export const ribbonVertex = /* glsl */ `
${PATH_LIB}
attribute float aPath;
attribute float aS;
attribute float aV;
varying float vS;
varying float vV;
varying float vAlpha;
varying vec3 vColor;
varying float vL;
uniform vec3 uColors[7];
uniform vec3 uLeakColor;

void main() {
  int row = int(aPath + 0.5);
  vec4 i0 = texelFetch(uInfo, ivec2(0, row), 0);
  vec4 i1 = texelFetch(uInfo, ivec2(1, row), 0);
  float L = i0.x;
  float hw = i0.y;
  float delay = i0.z;
  float health = i0.w;
  float fade = i1.x;
  float strength = i1.y;

  float front = revealFront(L, delay, 9.0);
  float alpha = (1.0 - smoothstep(front - 0.06, front, aS));
  vec3 col = uColors[int(health + 0.5)];
  float base = 0.12 + 0.36 * strength;
  if (health > 3.5 && health < 4.5) {
    col = mix(uColors[0], uLeakColor, smoothstep(0.5, 0.8, aS));
    alpha *= 1.0 - smoothstep(0.7, 0.92, aS);
  } else if (health > 1.5 && health < 2.5) {
    base *= 0.7;
    alpha *= 1.0 - smoothstep(0.3, 0.72, aS);
  } else if (health > 2.5 && health < 3.5) {
    base *= 0.0;
  }
  alpha *= base * focusDim(aPath, 0.15) * (1.0 - fade) * smoothstep(0.0, 0.06, aS) * (1.0 - smoothstep(0.96, 1.0, aS));
  vAlpha = alpha;
  vColor = col;
  vS = aS;
  vV = aV;
  vL = L;

  vec2 p = pathAt(row, aS);
  vec2 tg = tangentAt(row, aS);
  vec2 nr = vec2(-tg.y, tg.x);
  float w = hw * widthProfile(aS) * 1.15 + 0.02;
  vec2 q = p + nr * aV * w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(q.x, 0.012, q.y, 1.0);
}
`;

export const ribbonFragment = /* glsl */ `
uniform float uTime;
varying float vS;
varying float vV;
varying float vAlpha;
varying vec3 vColor;
varying float vL;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  float edge = 1.0 - pow(abs(vV), 2.4);
  float flow = noise(vec2(vS * vL * 0.9 - uTime * 2.2, vV * 2.5));
  float a = vAlpha * edge * (0.75 + 0.5 * flow);
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor, a);
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
