/**
 * GLSL for the board: the dot grid, favicons, soft key shadows and the score
 * ring. The juice itself lives in liquid/shaders.ts.
 *
 * Colors are raw sRGB (no color-space conversion) so they match the CSS.
 */

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
