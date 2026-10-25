import { describe, expect, it } from "vitest";
import { calculateScore, evaluateMock } from "./scoring.js";
import { targets } from "./targets.js";

describe("scoring", () => {
  it("keeps target weights at 100 and clamps scores to 0-100", () => {
    for (const target of targets)
      expect(
        target.hiddenAttributes.reduce((sum, a) => sum + a.weight, 0),
      ).toBe(100);
    expect(
      evaluateMock(
        "A red bicycle leaning beside a brick wall in sunlight",
        targets[1]!.hiddenAttributes,
      ).score,
    ).toBeGreaterThan(0);
    expect(calculateScore(targets[0]!.hiddenAttributes, [])).toBe(0);
  });
  it("awards full credit for matching every attribute", () => {
    const attrs = targets[0]!.hiddenAttributes;
    expect(
      calculateScore(
        attrs,
        attrs.map((a) => ({
          attributeId: a.id,
          judgment: "matched" as const,
          reason: "",
        })),
      ),
    ).toBe(100);
  });
});
