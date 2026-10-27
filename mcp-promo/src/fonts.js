// Font registry shared by every scene. The host (Node renderer or browser)
// loads the JSON outline data and calls initFonts() once before rendering.
import { VarFont } from "./engine/font.js";

export const fonts = {};
export function initFonts(map) {
  for (const [k, data] of Object.entries(map)) fonts[k] = new VarFont(data);
  return fonts;
}
export const FONT_FILES = { display: "anybody", serif: "serif", mono: "mono" };
