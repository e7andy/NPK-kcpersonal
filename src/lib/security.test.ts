import { beforeEach, describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";
import { consume, resetRateLimits } from "./rate-limit";
import { safeReturnPath } from "./redirect";

describe("rate limit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to max attempts per window", () => {
    const now = 1_000_000;
    expect(consume("a", 3, 60_000, now)).toBe(true);
    expect(consume("a", 3, 60_000, now + 1)).toBe(true);
    expect(consume("a", 3, 60_000, now + 2)).toBe(true);
    expect(consume("a", 3, 60_000, now + 3)).toBe(false);
  });

  it("keeps keys separate", () => {
    const now = 1_000_000;
    expect(consume("a", 1, 60_000, now)).toBe(true);
    expect(consume("b", 1, 60_000, now)).toBe(true);
    expect(consume("a", 1, 60_000, now)).toBe(false);
  });

  it("resets after the window", () => {
    const now = 1_000_000;
    expect(consume("a", 1, 60_000, now)).toBe(true);
    expect(consume("a", 1, 60_000, now + 59_999)).toBe(false);
    expect(consume("a", 1, 60_000, now + 60_000)).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the rightmost X-Forwarded-For entry added by Apache", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))).toBe("203.0.113.7");
  });
  it("falls back when the header is missing", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("safeReturnPath", () => {
  const fallback = "/planning";
  it("keeps local paths", () => {
    expect(safeReturnPath("/planning?week=2027-07-05", fallback)).toBe("/planning?week=2027-07-05");
  });
  it("rejects anything that could leave the site", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "/\t/evil.example",
      "planning",
      "",
    ]) {
      expect(safeReturnPath(bad, fallback)).toBe(fallback);
    }
  });
});
