import { describe, expect, it } from "vitest";
import { nyNow } from "../src/lib/schedule";

describe("nyNow", () => {
  it("reports New York date, hour and weekday", () => {
    expect(nyNow(new Date(Date.UTC(2026, 9, 13, 3)))).toEqual({ date: "2026-10-12", hour: 23, weekday: "Mon" });
    expect(nyNow(new Date(Date.UTC(2026, 10, 10, 13)))).toEqual({ date: "2026-11-10", hour: 8, weekday: "Tue" });
  });
});
