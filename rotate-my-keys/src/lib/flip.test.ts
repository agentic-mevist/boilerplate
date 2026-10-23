import { describe, expect, it } from "vitest"

import { flipLines, flipText } from "@/lib/flip"

describe("flipText", () => {
  it("rotates text by 180°", () => {
    expect(flipText("hello")).toBe("ollǝɥ")
    expect(flipText("maximum")).toBe("ɯnɯᴉxɐɯ")
    expect(flipText("sk-123")).toBe("ƐᄅƖ-ʞs")
  })

  it("is its own inverse", () => {
    const text = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJLMNOPQRSTUVWXYZ 0123456789 .,!?()[]{}<>_&;'\""
    expect(flipText(flipText(text))).toBe(text)
  })

  it("leaves unknown characters alone", () => {
    expect(flipText("🔑-=")).toBe("=-🔑")
  })
})

describe("flipLines", () => {
  it("puts the last line on top", () => {
    expect(flipLines(["ab", "cd"])).toBe("pɔ\nqɐ")
  })
})
