import { describe, expect, it } from "vitest";
import { normalizeDecimal } from "./route";
import { escapeCsvValue } from "../../reports/export/route";

describe("CSV helpers", () => {
  it("normalizes European and standard decimal formats", () => {
    expect(normalizeDecimal("1.234,56")).toBe("1234.56");
    expect(normalizeDecimal("1234.56")).toBe("1234.56");
    expect(normalizeDecimal("0,5")).toBe("0.5");
  });

  it("escapes CSV values with commas, quotes, or newlines", () => {
    expect(escapeCsvValue("BTC")).toBe("BTC");
    expect(escapeCsvValue("A,B")).toBe("\"A,B\"");
    expect(escapeCsvValue("A\"B")).toBe("\"A\"\"B\"");
  });
});
