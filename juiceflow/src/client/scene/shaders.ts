/**
 * GLSL for the board: the dot grid, favicons and soft key shadows. The juice
 * itself lives in liquid/shaders.ts.
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
