import { describe, expect, it } from "vitest";
import { splitTermGains } from "./route";
import type { RealizedEvent } from "../../../../types";

describe("splitTermGains", () => {
  it("classifies gains by each sold lot acquisition date", () => {
    const events: RealizedEvent[] = [
      {
        id: "sell-1",
        date: "2025-01-10T00:00:00.000Z",
        asset: "BTC",
        amount: "1",
        cost_basis: "100",
        proceeds: "150",
        realized_gain_loss: "50",
        method: "fifo",
        sold_lots: [
          {
            lot_id: "lot-old",
            amount_sold: "0.5",
            cost_basis_used: "40",
            proceeds: "75",
            realized_gain_loss: "35",
            date_acquired: "2023-12-01T00:00:00.000Z",
          },
          {
            lot_id: "lot-new",
            amount_sold: "0.5",
            cost_basis_used: "60",
            proceeds: "75",
            realized_gain_loss: "15",
            date_acquired: "2024-10-01T00:00:00.000Z",
          },
        ],
      },
    ];

    const result = splitTermGains(events);
    expect(result.longTerm).toBe("35");
    expect(result.shortTerm).toBe("15");
  });
});
