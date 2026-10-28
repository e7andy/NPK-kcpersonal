import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatHours,
  overlaps,
  paidMinutes,
  summarizeDay,
  toMinutes,
  validateShiftTimes,
  type ShiftForCalc,
} from "./time";

const shift = (over: Partial<ShiftForCalc> = {}): ShiftForCalc => ({
  startTime: "09:00",
  endTime: "15:00",
  lunchMinutes: 30,
  type: "regular",
  status: "planned",
  ...over,
});

describe("toMinutes", () => {
  it("parses HH:MM and HH:MM:SS", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("23:59:00")).toBe(1439);
  });
  it("rejects invalid times", () => {
    expect(() => toMinutes("24:00")).toThrow();
    expect(() => toMinutes("9:00")).toThrow();
  });
});

describe("paidMinutes", () => {
  it("subtracts lunch from the shift length", () => {
    expect(paidMinutes(shift())).toBe(330);
    expect(paidMinutes(shift({ lunchMinutes: 0 }))).toBe(360);
    expect(paidMinutes(shift({ startTime: "08:15", endTime: "17:45", lunchMinutes: 45 }))).toBe(525);
  });
});

describe("validateShiftTimes", () => {
  it("accepts a normal shift", () => {
    expect(validateShiftTimes(shift())).toBeNull();
  });
  it("requires end after start", () => {
    expect(validateShiftTimes(shift({ endTime: "09:00" }))).not.toBeNull();
    expect(validateShiftTimes(shift({ endTime: "08:00" }))).not.toBeNull();
  });
  it("requires lunch shorter than the shift and not negative", () => {
    expect(validateShiftTimes(shift({ lunchMinutes: 360 }))).not.toBeNull();
    expect(validateShiftTimes(shift({ lunchMinutes: -5 }))).not.toBeNull();
    expect(validateShiftTimes(shift({ lunchMinutes: 1.5 }))).not.toBeNull();
  });
  it("rejects malformed times", () => {
    expect(validateShiftTimes(shift({ startTime: "9" }))).not.toBeNull();
  });
});

describe("overlaps", () => {
  it("detects overlap", () => {
    expect(overlaps(shift(), shift({ startTime: "14:00", endTime: "18:00" }))).toBe(true);
    expect(overlaps(shift(), shift({ startTime: "10:00", endTime: "11:00" }))).toBe(true);
  });
  it("treats touching shifts as not overlapping", () => {
    expect(overlaps(shift(), shift({ startTime: "15:00", endTime: "18:00" }))).toBe(false);
  });
});

describe("summarizeDay", () => {
  it("returns zeros for no shifts", () => {
    expect(summarizeDay([], true)).toEqual({
      normalMinutes: 0,
      weekendMinutes: 0,
      sickMinutes: 0,
      trustMinutes: 0,
    });
  });

  it("counts normal time on a weekday without weekend time", () => {
    expect(summarizeDay([shift()], false)).toEqual({
      normalMinutes: 330,
      weekendMinutes: 0,
      sickMinutes: 0,
      trustMinutes: 0,
    });
  });

  it("adds the same hours as weekend time on weekends and holidays", () => {
    const s = summarizeDay([shift()], true);
    expect(s.normalMinutes).toBe(330);
    expect(s.weekendMinutes).toBe(330);
  });

  it("keeps trust time out of normal time", () => {
    const s = summarizeDay(
      [shift(), shift({ startTime: "15:00", endTime: "16:00", lunchMinutes: 0, type: "trust" })],
      false,
    );
    expect(s.normalMinutes).toBe(330);
    expect(s.trustMinutes).toBe(60);
  });

  it("gives no weekend time for trust time", () => {
    const s = summarizeDay([shift({ type: "trust" })], true);
    expect(s).toEqual({ normalMinutes: 0, weekendMinutes: 0, sickMinutes: 0, trustMinutes: 330 });
  });

  it("gives no time for trust time marked sick", () => {
    const s = summarizeDay([shift({ type: "trust", status: "sick" })], false);
    expect(s).toEqual({ normalMinutes: 0, weekendMinutes: 0, sickMinutes: 0, trustMinutes: 0 });
  });

  it("counts sick shifts only as sick time", () => {
    const s = summarizeDay([shift({ status: "sick" })], true);
    expect(s).toEqual({ normalMinutes: 0, weekendMinutes: 0, sickMinutes: 330, trustMinutes: 0 });
  });
});

describe("formatting", () => {
  it("formats hours with a decimal comma", () => {
    expect(formatHours(330)).toBe("5,50");
    expect(formatHours(20)).toBe("0,33");
    expect(formatHours(0)).toBe("0,00");
  });
  it("formats durations", () => {
    expect(formatDuration(330)).toBe("5 h 30 min");
    expect(formatDuration(360)).toBe("6 h");
    expect(formatDuration(45)).toBe("45 min");
  });
});
