import { describe, expect, it } from "vitest";
import { remainingSeconds } from "./timing";

describe("server-deadline countdown", () => {
  it("uses the server clock offset and rounds up remaining seconds", () => {
    expect(
      remainingSeconds(
        "2026-01-01T00:01:00.000Z",
        Date.parse("2026-01-01T00:00:10.250Z"),
        250,
      ),
    ).toBe(50);
  });
  it("never returns a negative duration", () => {
    expect(
      remainingSeconds(
        "2026-01-01T00:00:00.000Z",
        Date.parse("2026-01-01T00:00:01.000Z"),
        0,
      ),
    ).toBe(0);
  });
});
