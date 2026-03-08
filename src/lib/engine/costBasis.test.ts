import { describe, expect, it } from "vitest";
import { runCostBasis } from "./costBasis";
import type { Transaction } from "../../types";

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? "id",
    date: partial.date ?? "2024-01-01T00:00:00.000Z",
    type: partial.type ?? "buy",
    asset: partial.asset ?? "BTC",
    amount: partial.amount ?? "1",
    price_per_unit: partial.price_per_unit ?? "100",
    total_value: partial.total_value ?? "100",
    fee: partial.fee ?? "0",
    fee_asset: partial.fee_asset ?? "CHF",
    wallet: partial.wallet ?? "",
    exchange: partial.exchange ?? "",
    notes: partial.notes ?? "",
    currency: "CHF",
  };
}

describe("runCostBasis", () => {
  it("records lot metadata and unmatched amount for oversized disposals", () => {
    const transactions: Transaction[] = [
      tx({ id: "buy-1", date: "2023-01-01T00:00:00.000Z", total_value: "100" }),
      tx({ id: "buy-2", date: "2024-01-01T00:00:00.000Z", total_value: "200" }),
      tx({
        id: "sell-1",
        date: "2025-02-01T00:00:00.000Z",
        type: "sell",
        amount: "3",
        price_per_unit: "150",
        total_value: "450",
      }),
    ];

    const result = runCostBasis(transactions, "fifo", { BTC: "150" });
    expect(result.realized_events).toHaveLength(1);
    const [event] = result.realized_events;

    expect(event.amount).toBe("2");
    expect(event.unmatched_amount).toBe("1");
    expect(event.sold_lots).toHaveLength(2);
    expect(event.sold_lots[0].date_acquired).toBe("2023-01-01T00:00:00.000Z");
    expect(event.sold_lots[1].date_acquired).toBe("2024-01-01T00:00:00.000Z");
    expect(event.sold_lots[0].source_transaction_id).toBe("buy-1");
    expect(event.sold_lots[1].source_transaction_id).toBe("buy-2");
  });
});
